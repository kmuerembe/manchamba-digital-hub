import { createOpenAI } from "@ai-sdk/openai";
import { createServerFn } from "@tanstack/react-start";
import { Output, streamText } from "ai";
import { z } from "zod";

const AnalyzeInput = z.object({
  crop: z.string().min(1),
  image: z.string().min(100), // data URL da fotografia
});

const DiagnosisSchema = z.object({
  cultura_identificada: z.string(),
  diagnostico: z.string(),
  gravidade: z.enum(["saudavel", "ligeira", "moderada", "grave"]),
  confianca: z.enum(["baixa", "media", "alta"]),
  sinais_vistos: z.string(),
  conselhos: z.array(z.string()),
});

export type CropDiagnosis = z.infer<typeof DiagnosisSchema>;

export const analyzeCropPhoto = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }): Promise<CropDiagnosis> => {
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
        "És um agrónomo experiente a apoiar pequenos agricultores em Moçambique. Analisa a fotografia da cultura indicada e responde em português simples e claro, adequado a quem tem pouca experiência tecnológica. Identifica sinais de pragas, doenças ou deficiências (ex.: lagarta do funil, míldio, falta de azoto). Sê honesto sobre a tua confiança. Dá conselhos práticos, baratos e realizáveis localmente, em frases curtas (máximo 5 conselhos).",
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

    return await result.output;
  });
