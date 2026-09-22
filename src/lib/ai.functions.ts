import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createOpenAI } from "@ai-sdk/openai";
import { createServerFn } from "@tanstack/react-start";
import { Output, streamText } from "ai";
import { z } from "zod";

const AnalyzeInput = z.object({
  crop: z.string().min(1),
  image: z.string().min(100), // data URL da fotografia
  fotoPath: z.string().nullable(),
  provincia: z.string().nullable(),
});

const DiagnosisSchema = z.object({
  cultura_identificada: z.string(),
  diagnostico: z.string(),
  gravidade: z.enum(["saudavel", "ligeira", "moderada", "grave"]),
  confianca: z.number(),
  sinais_vistos: z.string(),
  conselhos: z.array(z.string()),
});

export type CropDiagnosis = z.infer<typeof DiagnosisSchema>;

export type ProdutoSugerido = { id: string; titulo: string; preco: number; unidade: string; provincia: string | null };

export type ResultadoAnalise = {
  id: string | null;
  diagnostico: CropDiagnosis;
  estado: "concluida" | "baixa_confianca";
  sugestoes: ProdutoSugerido[];
};

export const analyzeCropPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data, context }): Promise<ResultadoAnalise> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Serviço de análise indisponível de momento.");

    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      output: Output.object({ schema: DiagnosisSchema }),
      system:
        "És um agrónomo experiente a apoiar pequenos agricultores em Moçambique. Analisa a fotografia da cultura indicada e responde em português simples e claro, adequado a quem tem pouca experiência tecnológica. Identifica sinais de pragas, doenças ou deficiências (ex.: lagarta do funil, míldio, falta de azoto). O campo confianca é um número entre 0 e 1 com a tua certeza real; sê honesto e usa valores baixos quando a fotografia não é clara. Dá conselhos práticos, baratos e realizáveis localmente, em frases curtas (máximo 5 conselhos).",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: `Cultura declarada pelo agricultor: ${data.crop}. Analisa a fotografia.` },
            { type: "image", image: data.image },
          ],
        },
      ],
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    const diagnostico = await result.output;
    const confianca = Math.min(1, Math.max(0, Number(diagnostico.confianca) || 0));
    const estado = confianca < 0.7 ? "baixa_confianca" : "concluida";

    // Sugestões: apenas produtos que existem mesmo no mercado.
    const { supabase, userId } = context;
    let sugestoes: ProdutoSugerido[] = [];
    if (diagnostico.gravidade !== "saudavel") {
      const { data: categorias } = await supabase
        .from("categorias")
        .select("id,slug")
        .in("slug", ["fertilizantes", "pesticidas"]);
      const ids = (categorias ?? []).map((linha) => linha.id);
      if (ids.length) {
        const { data: produtos } = await supabase
          .from("produtos")
          .select("id,titulo,preco,unidade,provincia")
          .eq("estado", "ativo")
          .in("categoria_id", ids)
          .limit(4);
        sugestoes = (produtos ?? []).map((linha) => ({
          id: linha.id,
          titulo: linha.titulo,
          preco: Number(linha.preco),
          unidade: linha.unidade,
          provincia: linha.provincia,
        }));
      }
    }

    const { data: guardada } = await supabase
      .from("analises_cultura")
      .insert({
        utilizador_id: userId,
        foto_url: data.fotoPath,
        cultura: data.crop,
        provincia: data.provincia,
        diagnostico: diagnostico.diagnostico,
        confianca,
        descricao: diagnostico.sinais_vistos,
        recomendacao: diagnostico.conselhos.join(" • "),
        gravidade: diagnostico.gravidade,
        produtos_sugeridos: sugestoes,
        estado,
      })
      .select("id")
      .maybeSingle();

    return { id: guardada?.id ?? null, diagnostico: { ...diagnostico, confianca }, estado, sugestoes };
  });
