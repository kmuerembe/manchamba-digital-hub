import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Leaf, Loader2, Sparkles, Upload, X } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { AppButton } from "@/components/machamba/ui";
import { analyzeCropPhoto, type ResultadoAnalise } from "@/lib/ai.functions";
import { useAuth } from "@/lib/auth";
import { enviarFoto, ficheiroDeDataUrl } from "@/lib/fotos";
import { listarAnalises } from "@/lib/machamba";

export function DiagnosisView({
  showNotice,
  pedirEntrada,
}: {
  showNotice: (mensagem: string) => void;
  pedirEntrada: () => void;
}) {
  const { user, perfil } = useAuth();
  const queryClient = useQueryClient();
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState("Milho");
  const [analyzing, setAnalyzing] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAnalise | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const historico = useQuery({
    queryKey: ["analises", user?.id],
    queryFn: () => listarAnalises(user!.id),
    enabled: Boolean(user),
  });

  const readFile = (evento: ChangeEvent<HTMLInputElement>) => {
    const ficheiro = evento.target.files?.[0];
    evento.target.value = "";
    if (!ficheiro) return;
    if (ficheiro.size > 8 * 1024 * 1024) {
      showNotice("Fotografia demasiado grande (máx. 8 MB)");
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => {
      setImage(String(leitor.result));
      setResultado(null);
      setErro(null);
      showNotice("Fotografia carregada");
    };
    leitor.onerror = () => showNotice("Não foi possível ler a fotografia");
    leitor.readAsDataURL(ficheiro);
  };

  const stopLive = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setLive(false);
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      setLive(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      }, 0);
    } catch {
      if (cameraRef.current) cameraRef.current.click();
      else showNotice("Câmara indisponível. Escolhe uma fotografia guardada.");
    }
  };

  const shoot = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setImage(canvas.toDataURL("image/jpeg", 0.85));
    setResultado(null);
    setErro(null);
    stopLive();
    showNotice("Fotografia capturada");
  };

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  const analisar = async () => {
    if (!image || analyzing) return;
    if (!user) {
      pedirEntrada();
      return;
    }
    setAnalyzing(true);
    setErro(null);
    setResultado(null);
    try {
      const ficheiro = ficheiroDeDataUrl(image);
      let caminho: string | null = null;
      try {
        caminho = await enviarFoto("diagnosticos", user.id, ficheiro);
      } catch {
        caminho = null;
      }
      const resposta = await analyzeCropPhoto({
        data: { crop, image, fotoPath: caminho, provincia: perfil?.provincia ?? null },
      });
      setResultado(resposta);
      showNotice("Análise concluída");
      void queryClient.invalidateQueries({ queryKey: ["analises", user.id] });
      void queryClient.invalidateQueries({ queryKey: ["notificacoes", user.id] });
    } catch {
      setErro("Não foi possível analisar a fotografia agora. Verifica a tua ligação e tenta de novo.");
    } finally {
      setAnalyzing(false);
    }
  };

  const limpar = () => {
    setImage(null);
    setResultado(null);
    setErro(null);
    showNotice("Fotografia removida");
  };

  return (
    <section className="mx-auto max-w-2xl animate-enter">
      <p className="text-xs font-semibold text-primary">SAÚDE DA CULTURA</p>
      <h1 className="mt-1 font-display text-3xl font-bold">Avaliar por fotografia</h1>
      <p className="mt-2 text-sm text-muted-foreground">Fotografa uma folha afetada, com boa luz e sem filtros.</p>

      {!user && (
        <div className="mt-4 rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Precisas de entrar na tua conta para guardar e ver as análises.</p>
          <AppButton className="mt-3" onClick={pedirEntrada}>
            Entrar ou criar conta
          </AppButton>
        </div>
      )}

      <div className="mt-6 rounded-lg border border-border bg-card p-4 sm:p-6">
        <label className="text-sm font-semibold" htmlFor="crop">
          Qual é a cultura?
        </label>
        <select
          id="crop"
          value={crop}
          onChange={(evento) => setCrop(evento.target.value)}
          className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
        >
          <option>Milho</option>
          <option>Tomate</option>
          <option>Mandioca</option>
          <option>Feijão</option>
          <option>Outra</option>
        </select>

        <input ref={cameraRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={readFile} />
        <input ref={galleryRef} className="sr-only" type="file" accept="image/*" onChange={readFile} />

        <button
          onClick={() => galleryRef.current?.click()}
          className="mt-4 grid min-h-52 w-full place-items-center overflow-hidden rounded-lg border-2 border-dashed border-primary/35 bg-secondary/50 text-center"
        >
          {image ? (
            <img src={image} alt="Fotografia da cultura" className="h-64 w-full object-cover" />
          ) : (
            <span>
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
                <Camera className="size-6" />
              </span>
              <strong className="mt-3 block">Escolher fotografia do telemóvel</strong>
              <small className="mt-1 block text-muted-foreground">JPG ou PNG · máximo 8 MB</small>
            </span>
          )}
        </button>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <AppButton variant="outline" onClick={() => void openCamera()}>
            <Camera className="size-4" /> Tirar fotografia
          </AppButton>
          <AppButton variant="outline" onClick={() => galleryRef.current?.click()}>
            <Upload className="size-4" /> Carregar fotografia
          </AppButton>
        </div>

        {image && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <AppButton className="w-full" onClick={() => void analisar()}>
              {analyzing ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> A analisar...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Analisar fotografia
                </>
              )}
            </AppButton>
            <AppButton variant="plain" onClick={limpar}>
              <X className="size-4" /> Remover fotografia
            </AppButton>
          </div>
        )}

        {erro && (
          <p role="alert" className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {erro}
          </p>
        )}
      </div>

      {analyzing && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <Loader2 className="size-5 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">A observar a tua fotografia. Isto pode demorar alguns segundos.</p>
        </div>
      )}

      {resultado && !analyzing && <DiagnosisResult resultado={resultado} />}

      <div className="mt-4 flex gap-3 rounded-lg border border-accent/35 bg-accent/10 p-4">
        <Sparkles className="size-5 shrink-0 text-accent" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Avaliação orientativa.</strong> O resultado não substitui um agrónomo. Casos graves ou de
          baixa confiança devem ser revistos por um técnico.
        </p>
      </div>

      {Boolean(historico.data?.length) && (
        <div className="mt-6">
          <h2 className="font-display text-lg font-semibold">Análises anteriores</h2>
          <div className="mt-3 space-y-2">
            {historico.data!.map((analise) => (
              <div key={analise.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm">{analise.diagnostico ?? "Análise"}</strong>
                  <small className="shrink-0 text-xs text-muted-foreground">
                    {new Date(analise.criado_em).toLocaleDateString("pt-PT")}
                  </small>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {analise.cultura} ·{" "}
                  {analise.confianca === null ? "sem confiança registada" : `confiança ${Math.round(analise.confianca * 100)}%`}
                  {analise.estado === "baixa_confianca" ? " · para revisão de agrónomo" : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {live && (
        <div className="fixed inset-0 z-50 flex flex-col bg-foreground/95 p-4">
          <video ref={videoRef} playsInline muted className="min-h-0 flex-1 rounded-lg object-cover" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <AppButton variant="outline" onClick={stopLive}>
              Cancelar
            </AppButton>
            <AppButton onClick={shoot}>
              <Camera className="size-4" /> Capturar
            </AppButton>
          </div>
        </div>
      )}
    </section>
  );
}

function DiagnosisResult({ resultado }: { resultado: ResultadoAnalise }) {
  const { diagnostico } = resultado;
  const severityLabel = {
    saudavel: "Cultura saudável",
    ligeira: "Problema ligeiro",
    moderada: "Problema moderado",
    grave: "Problema grave",
  }[diagnostico.gravidade];
  const severityStyle =
    diagnostico.gravidade === "saudavel"
      ? "bg-primary/10 text-primary"
      : diagnostico.gravidade === "ligeira"
        ? "bg-accent/15 text-accent"
        : "bg-destructive/10 text-destructive";

  return (
    <div className="mt-4 animate-enter rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${severityStyle}`}>{severityLabel}</span>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
          Confiança {Math.round(diagnostico.confianca * 100)}%
        </span>
      </div>
      <h2 className="mt-3 font-display text-xl font-bold">{diagnostico.diagnostico}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Cultura identificada: <strong className="text-foreground">{diagnostico.cultura_identificada}</strong>
      </p>
      <p className="mt-3 text-sm leading-relaxed">{diagnostico.sinais_vistos}</p>

      {resultado.estado === "baixa_confianca" && (
        <p className="mt-3 rounded-lg border border-accent/40 bg-accent/10 p-3 text-xs text-muted-foreground">
          A confiança é baixa. Guardámos esta análise para poder ser revista por um agrónomo antes de tomares decisões.
        </p>
      )}

      <h3 className="mt-4 flex items-center gap-2 font-display font-semibold">
        <Leaf className="size-4 text-primary" /> O que fazer
      </h3>
      <ul className="mt-2 space-y-2">
        {diagnostico.conselhos.map((conselho) => (
          <li key={conselho} className="flex gap-2 text-sm">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
            {conselho}
          </li>
        ))}
      </ul>

      {resultado.sugestoes.length > 0 && (
        <>
          <h3 className="mt-5 font-display font-semibold">Produtos disponíveis no mercado</h3>
          <ul className="mt-2 space-y-2">
            {resultado.sugestoes.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                <span className="min-w-0 truncate">
                  {item.titulo}
                  <small className="block text-xs text-muted-foreground">{item.provincia ?? "Moçambique"}</small>
                </span>
                <strong className="shrink-0 font-display">
                  {item.preco} <small className="font-sans text-[10px] text-muted-foreground">MZN/{item.unidade}</small>
                </strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
