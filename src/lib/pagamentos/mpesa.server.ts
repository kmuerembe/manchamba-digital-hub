/**
 * Cliente da API M-Pesa Moçambique (Vodacom) — https://developer.mpesa.vm.co.mz
 *
 * Fluxo C2B "single stage": o servidor pede à Vodacom que envie um USSD push ao
 * telemóvel do cliente; o cliente introduz o PIN e a resposta HTTP volta com o
 * resultado (síncrono). Quando a resposta é inconclusiva usa-se queryTransactionStatus.
 *
 * Autenticação: a API Key é cifrada (RSA PKCS#1 v1.5) com a chave pública fornecida no
 * portal e enviada em base64 no header Authorization: Bearer <token>.
 */
import { publicEncrypt, constants } from "node:crypto";

export type MpesaConfig = {
  apiKey: string;
  publicKey: string;
  serviceProviderCode: string;
  ambiente: "sandbox" | "producao";
  origin: string;
};

export type ResultadoMpesa = {
  sucesso: boolean;
  pendente: boolean;
  codigo: string;
  mensagem: string;
  transacaoId: string | null;
  conversaId: string | null;
  resposta: unknown;
};

const HOSTS = {
  sandbox: "https://api.sandbox.vm.co.mz",
  producao: "https://api.vm.co.mz",
} as const;

/** Mensagens em português para os códigos oficiais da API. */
export const CODIGOS_MPESA: Record<string, string> = {
  "INS-0": "Pagamento concluído com sucesso.",
  "INS-1": "Erro interno da M-Pesa. Tenta novamente.",
  "INS-2": "Chave de API inválida.",
  "INS-4": "Utilizador não está activo.",
  "INS-5": "Transação cancelada pelo cliente.",
  "INS-6": "A transação falhou.",
  "INS-9": "Tempo esgotado. O cliente não confirmou o PIN a tempo.",
  "INS-10": "Transação duplicada.",
  "INS-13": "Código de comerciante inválido.",
  "INS-14": "Referência inválida.",
  "INS-15": "Valor inválido.",
  "INS-16": "Serviço temporariamente sobrecarregado. Tenta novamente.",
  "INS-17": "Referência da transação com tamanho inválido.",
  "INS-19": "Referência de terceiros inválida.",
  "INS-20": "Faltam parâmetros no pedido.",
  "INS-21": "Falha na validação dos parâmetros.",
  "INS-23": "Estado desconhecido. A confirmar.",
  "INS-26": "Não autorizado.",
  "INS-995": "Perfil do cliente com problemas.",
  "INS-996": "Conta do cliente não está activa.",
  "INS-2001": "Erro de autenticação do iniciador.",
  "INS-2006": "Saldo insuficiente na conta M-Pesa.",
  "INS-2051": "Número de telemóvel inválido.",
};

export function lerConfigMpesa(): MpesaConfig | null {
  const apiKey = process.env["MPESA_API_KEY"];
  const publicKey = process.env["MPESA_PUBLIC_KEY"];
  const serviceProviderCode = process.env["MPESA_SERVICE_PROVIDER_CODE"];
  if (!apiKey || !publicKey || !serviceProviderCode) return null;
  return {
    apiKey,
    publicKey,
    serviceProviderCode,
    ambiente: process.env["MPESA_AMBIENTE"] === "producao" ? "producao" : "sandbox",
    origin: process.env["MPESA_ORIGIN"] || "developer.mpesa.vm.co.mz",
  };
}

/** Converte a chave pública (base64 puro ou PEM) em PEM e cifra a API key. */
export function gerarTokenMpesa(apiKey: string, publicKey: string): string {
  const limpa = publicKey.replace(/\\n/g, "\n").trim();
  const pem = limpa.includes("BEGIN PUBLIC KEY")
    ? limpa
    : `-----BEGIN PUBLIC KEY-----\n${limpa
        .replace(/\s+/g, "")
        .match(/.{1,64}/g)
        ?.join("\n")}\n-----END PUBLIC KEY-----`;
  const cifrado = publicEncrypt(
    { key: pem, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(apiKey, "utf8"),
  );
  return cifrado.toString("base64");
}

/** Normaliza para o formato 2588XXXXXXXX exigido pela Vodacom. */
export function normalizarMsisdnMpesa(telefone: string): string | null {
  const digitos = telefone.replace(/\D/g, "").replace(/^0+/, "");
  const nacional = digitos.startsWith("258") ? digitos.slice(3) : digitos;
  if (!/^8[45]\d{7}$/.test(nacional)) return null;
  return `258${nacional}`;
}

function cabecalhos(config: MpesaConfig): HeadersInit {
  return {
    "Content-Type": "application/json",
    Origin: config.origin,
    Authorization: `Bearer ${gerarTokenMpesa(config.apiKey, config.publicKey)}`,
  };
}

type RespostaMpesa = {
  output_ResponseCode?: string;
  output_ResponseDesc?: string;
  output_TransactionID?: string;
  output_ConversationID?: string;
  output_ThirdPartyReference?: string;
  output_ResponseTransactionStatus?: string;
};

function interpretar(json: RespostaMpesa, status: number): ResultadoMpesa {
  const codigo = json.output_ResponseCode ?? `HTTP-${status}`;
  const sucesso = codigo === "INS-0";
  const pendente = codigo === "INS-23" || codigo === "INS-9" || codigo === "INS-16";
  return {
    sucesso,
    pendente,
    codigo,
    mensagem:
      CODIGOS_MPESA[codigo] ?? json.output_ResponseDesc ?? "Resposta desconhecida da M-Pesa.",
    transacaoId: json.output_TransactionID ?? null,
    conversaId: json.output_ConversationID ?? null,
    resposta: json,
  };
}

async function lerJson(resposta: Response): Promise<RespostaMpesa> {
  const texto = await resposta.text();
  try {
    return JSON.parse(texto) as RespostaMpesa;
  } catch {
    return { output_ResponseDesc: texto.slice(0, 300) };
  }
}

/** C2B: cobra `valor` MZN ao `msisdn`. `referencia` e `terceiros` até 20 caracteres alfanuméricos. */
export async function cobrarMpesa(
  config: MpesaConfig,
  dados: { msisdn: string; valor: number; referencia: string; terceiros: string },
): Promise<ResultadoMpesa> {
  const url = `${HOSTS[config.ambiente]}:18352/ipg/v1x/c2bPayment/singleStage/`;
  const corpo = {
    input_TransactionReference: dados.referencia.slice(0, 20),
    input_CustomerMSISDN: dados.msisdn,
    input_Amount: Math.round(dados.valor).toString(),
    input_ThirdPartyReference: dados.terceiros.slice(0, 20),
    input_ServiceProviderCode: config.serviceProviderCode,
  };
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 120_000);
  try {
    const resposta = await fetch(url, {
      method: "POST",
      headers: cabecalhos(config),
      body: JSON.stringify(corpo),
      signal: controlador.signal,
    });
    return interpretar(await lerJson(resposta), resposta.status);
  } catch (erro) {
    return {
      sucesso: false,
      pendente: true,
      codigo: "REDE",
      mensagem:
        erro instanceof Error && erro.name === "AbortError"
          ? "A M-Pesa demorou demasiado a responder."
          : "Não foi possível contactar a M-Pesa.",
      transacaoId: null,
      conversaId: null,
      resposta: { erro: String(erro) },
    };
  } finally {
    clearTimeout(temporizador);
  }
}

/** Consulta o estado de uma transação pela referência de terceiros. */
export async function consultarMpesa(
  config: MpesaConfig,
  dados: { consulta: string; terceiros: string },
): Promise<ResultadoMpesa> {
  const params = new URLSearchParams({
    input_QueryReference: dados.consulta,
    input_ServiceProviderCode: config.serviceProviderCode,
    input_ThirdPartyReference: dados.terceiros.slice(0, 20),
  });
  const url = `${HOSTS[config.ambiente]}:18353/ipg/v1x/queryTransactionStatus/?${params}`;
  try {
    const resposta = await fetch(url, { method: "GET", headers: cabecalhos(config) });
    const json = await lerJson(resposta);
    const base = interpretar(json, resposta.status);
    const estado = (json.output_ResponseTransactionStatus ?? "").toLowerCase();
    if (base.codigo === "INS-0" && estado) {
      const concluida = estado === "completed";
      const falhou = ["cancelled", "failed", "expired"].includes(estado);
      return {
        ...base,
        sucesso: concluida,
        pendente: !concluida && !falhou,
        mensagem: concluida
          ? "Pagamento concluído com sucesso."
          : falhou
            ? `Transação ${estado}.`
            : "Transação ainda em processamento.",
      };
    }
    return base;
  } catch (erro) {
    return {
      sucesso: false,
      pendente: true,
      codigo: "REDE",
      mensagem: "Não foi possível consultar a M-Pesa.",
      transacaoId: null,
      conversaId: null,
      resposta: { erro: String(erro) },
    };
  }
}
