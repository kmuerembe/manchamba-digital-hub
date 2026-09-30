import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Smartphone, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AppButton } from "@/components/machamba/ui";
import { mzn } from "@/lib/formato";
import { consultarPagamento, iniciarPagamento, metodosDisponiveis } from "@/lib/loja.functions";

export type Metodo = "mpesa" | "emola";

export const METODOS: Record<
  Metodo,
  { nome: string; operadora: string; prefixos: string; cor: string; fundo: string }
> = {
  mpesa: {
    nome: "M-Pesa",
    operadora: "Vodacom",
    prefixos: "84 / 85",
    cor: "text-destructive",
    fundo: "bg-destructive",
  },
  emola: {
    nome: "e-Mola",
    operadora: "Movitel",
    prefixos: "86 / 87",
    cor: "text-accent-foreground",
    fundo: "bg-accent",
  },
};

export function detectarMetodo(telefone: string): Metodo | null {
  const digitos = telefone.replace(/\D/g, "").replace(/^258/, "").replace(/^0+/, "");
  if (/^8[45]/.test(digitos)) return "mpesa";
  if (/^8[67]/.test(digitos)) return "emola";
  return null;
}

type Estado = "inicial" | "a_enviar" | "pendente" | "pago" | "falhou";

/**
 * Formulário de pagamento móvel. Chama o servidor para disparar o USSD push
 * e vai consultando o estado até haver confirmação.
 */
export function PagamentoMovel({
  pedidoId,
  total,
  telefoneInicial = "",
  onPago,
}: {
  pedidoId: string;
  total: number;
  telefoneInicial?: string;
  onPago: () => void;
}) {
  const [metodo, setMetodo] = useState<Metodo>(detectarMetodo(telefoneInicial) ?? "mpesa");
  const [telefone, setTelefone] = useState(telefoneInicial);
  const [estado, setEstado] = useState<Estado>("inicial");
  const [mensagem, setMensagem] = useState("");
  const [pagamentoId, setPagamentoId] = useState<string | null>(null);
  const [ambiente, setAmbiente] = useState<string | null>(null);
  const tentativas = useRef(0);

  const disponiveis = useQuery({
    queryKey: ["metodos-pagamento"],
    queryFn: () => metodosDisponiveis(),
  });

  const aplicar = (resultado: {
    pagamentoId: string;
    estado: string;
    mensagem: string;
    ambiente: string;
  }) => {
    setPagamentoId(resultado.pagamentoId);
    setAmbiente(resultado.ambiente);
    setMensagem(resultado.mensagem);
    if (resultado.estado === "pago") {
      setEstado("pago");
      onPago();
    } else if (resultado.estado === "pendente") setEstado("pendente");
    else setEstado("falhou");
  };

  const iniciar = useMutation({
    mutationFn: () => iniciarPagamento({ data: { pedidoId, metodo, telefone } }),
    onMutate: () => {
      setEstado("a_enviar");
      setMensagem("A enviar pedido de pagamento para o teu telemóvel…");
      tentativas.current = 0;
    },
    onSuccess: aplicar,
    onError: (erro: Error) => {
      setEstado("falhou");
      setMensagem(erro.message || "Não foi possível iniciar o pagamento.");
    },
  });

  // Enquanto pendente, consulta o servidor a cada 4 segundos (máx. ~5 minutos).
  useEffect(() => {
    if (estado !== "pendente" || !pagamentoId) return;
    const temporizador = window.setInterval(() => {
      tentativas.current += 1;
      if (tentativas.current > 75) {
        setEstado("falhou");
        setMensagem("Sem confirmação. Podes tentar novamente.");
        return;
      }
      consultarPagamento({ data: { pagamentoId } })
        .then(aplicar)
        .catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, pagamentoId]);

  const metodoInfo = METODOS[metodo];
  const indisponivel = disponiveis.data && !disponiveis.data[metodo].disponivel;
  const ambienteAtual = ambiente ?? disponiveis.data?.[metodo].ambiente ?? null;

  if (estado === "pago") {
    return (
      <div className="rounded-xl border border-success/40 bg-success/10 p-5 text-center">
        <CheckCircle2 className="mx-auto size-12 text-primary" />
        <h3 className="mt-2 font-display text-xl font-bold">Pagamento confirmado</h3>
        <p className="mt-1 text-sm text-muted-foreground">{mensagem}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(METODOS) as Metodo[]).map((chave) => {
          const info = METODOS[chave];
          const ativo = metodo === chave;
          return (
            <button
              key={chave}
              type="button"
              disabled={estado === "a_enviar" || estado === "pendente"}
              onClick={() => setMetodo(chave)}
              className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors ${ativo ? "border-primary bg-primary/5" : "border-border bg-card"}`}
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-lg font-display text-xs font-bold text-white ${info.fundo}`}
              >
                {chave === "mpesa" ? "M" : "e"}
              </span>
              <span className="min-w-0">
                <strong className="block text-sm">{info.nome}</strong>
                <span className="text-[11px] text-muted-foreground">
                  {info.operadora} · {info.prefixos}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {indisponivel && (
        <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
          {metodoInfo.nome} ainda não está configurado nesta loja. Escolhe outro método.
        </p>
      )}
      {ambienteAtual && ambienteAtual !== "producao" && (
        <p className="rounded-lg bg-secondary p-2 text-center text-[11px] text-secondary-foreground">
          {ambienteAtual === "sandbox"
            ? "Ambiente de testes do operador (sandbox) — não há cobrança real."
            : "Modo de simulação — sem cobrança real. Configura as credenciais para ativar."}
        </p>
      )}

      <label className="block text-sm font-semibold">
        Número {metodoInfo.nome}
        <div className="mt-2 flex h-12 items-center rounded-lg border border-border bg-card px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
          <Smartphone className={`size-4 ${metodoInfo.cor}`} />
          <span className="ml-2 text-sm text-muted-foreground">+258</span>
          <input
            inputMode="numeric"
            autoComplete="tel-national"
            value={telefone}
            disabled={estado === "a_enviar" || estado === "pendente"}
            onChange={(evento) => {
              const valor = evento.target.value.replace(/[^\d\s]/g, "").slice(0, 11);
              setTelefone(valor);
              const detectado = detectarMetodo(valor);
              if (detectado) setMetodo(detectado);
            }}
            placeholder={metodo === "mpesa" ? "84 000 0000" : "86 000 0000"}
            className="ml-2 h-full flex-1 bg-transparent text-base font-semibold outline-none"
          />
        </div>
        <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
          Vais receber um pedido para introduzir o PIN {metodoInfo.nome} no telemóvel.
        </span>
      </label>

      {(estado === "a_enviar" || estado === "pendente") && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-primary" />
          <div>
            <strong className="block text-sm">
              {estado === "a_enviar" ? "A contactar a operadora…" : "Confirma no telemóvel"}
            </strong>
            <p className="text-xs text-muted-foreground">{mensagem}</p>
            {estado === "pendente" && (
              <p className="mt-1 text-xs text-muted-foreground">
                Introduz o PIN {metodoInfo.nome} quando o pedido aparecer. Esta página atualiza
                sozinha.
              </p>
            )}
          </div>
        </div>
      )}

      {estado === "falhou" && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
          <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <strong className="block text-sm">Pagamento não concluído</strong>
            <p className="text-xs text-muted-foreground">{mensagem}</p>
          </div>
        </div>
      )}

      <AppButton
        className={`w-full ${metodoInfo.fundo} ${metodo === "emola" ? "text-accent-foreground" : "text-destructive-foreground"}`}
        disabled={
          estado === "a_enviar" ||
          estado === "pendente" ||
          Boolean(indisponivel) ||
          telefone.replace(/\D/g, "").length < 9
        }
        onClick={() => iniciar.mutate()}
      >
        {estado === "falhou" ? "Tentar novamente" : `Pagar ${mzn(total)} com ${metodoInfo.nome}`}
      </AppButton>
    </div>
  );
}
