/**
 * Cliente da API e-Mola (Movitel) — gateway BCCS (SOAP), operação `pushUssdMessage`.
 *
 * A Movitel entrega, ao contratar a integração, o endereço do web service (UAT e
 * produção), `username`/`password` do gateway e o par `partnerCode`/`key`.
 * O cliente recebe um USSD push no telemóvel (86/87) e confirma com o PIN.
 *
 * Respostas: errorCode "0" = pago; "22" = a processar (o resultado chega depois no
 * callback JSON `/api/pagamentos/emola-callback`); "11" = tempo esgotado; outros = falha.
 */

export type EmolaConfig = {
  url: string;
  username: string;
  password: string;
  partnerCode: string;
  key: string;
  ambiente: "sandbox" | "producao";
};

export type ResultadoEmola = {
  sucesso: boolean;
  pendente: boolean;
  codigo: string;
  mensagem: string;
  requestId: string | null;
  gwTransId: string | null;
  resposta: unknown;
};

export const CODIGOS_EMOLA: Record<string, string> = {
  "0": "Pagamento concluído com sucesso.",
  "11": "Tempo esgotado. O cliente não confirmou o PIN a tempo.",
  "22": "Pedido enviado. Aguarda a confirmação do PIN no telemóvel.",
  "01": "Saldo insuficiente na conta e-Mola.",
  "07": "Transação recusada.",
  "6003": "Pedido rejeitado pelo e-Mola.",
  "1000": "Erro no gateway e-Mola.",
};

export function lerConfigEmola(): EmolaConfig | null {
  const ambiente = process.env["EMOLA_AMBIENTE"] === "producao" ? "producao" : "sandbox";
  const url =
    process.env["EMOLA_URL"] ||
    (ambiente === "producao" ? process.env["EMOLA_PROD_URL"] : process.env["EMOLA_UAT_URL"]);
  const username = process.env["EMOLA_USERNAME"];
  const password = process.env["EMOLA_PASSWORD"];
  const partnerCode = process.env["EMOLA_PARTNER_CODE"];
  const key = process.env["EMOLA_KEY"];
  if (!url || !username || !password || !partnerCode || !key) return null;
  return { url, username, password, partnerCode, key, ambiente };
}

/** e-Mola aceita o número nacional (86/87XXXXXXX). */
export function normalizarMsisdnEmola(telefone: string): string | null {
  const digitos = telefone.replace(/\D/g, "").replace(/^0+/, "");
  const nacional = digitos.startsWith("258") ? digitos.slice(3) : digitos;
  if (!/^8[67]\d{7}$/.test(nacional)) return null;
  return nacional;
}

function escaparXml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function envelope(config: EmolaConfig, wscode: string, params: Record<string, string>): string {
  const linhas = Object.entries(params)
    .map(
      ([nome, valor]) => `        <param name="${escaparXml(nome)}" value="${escaparXml(valor)}"/>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://webservice.bccsgw.viettel.com/">
  <soapenv:Header/>
  <soapenv:Body>
    <web:gwOperation>
      <Input>
        <username>${escaparXml(config.username)}</username>
        <password>${escaparXml(config.password)}</password>
        <wscode>${escaparXml(wscode)}</wscode>
${linhas}
        <rawData>?</rawData>
      </Input>
    </web:gwOperation>
  </soapenv:Body>
</soapenv:Envelope>`;
}

function extrair(xml: string, tag: string): string | null {
  const m = new RegExp(`<(?:[\\w-]+:)?${tag}[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`, "i").exec(
    xml,
  );
  return m?.[1] ? m[1].trim() : null;
}

function desescapar(valor: string): string {
  return valor
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

async function chamar(
  config: EmolaConfig,
  wscode: string,
  params: Record<string, string>,
): Promise<ResultadoEmola> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 120_000);
  try {
    const resposta = await fetch(config.url, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: "#POST" },
      body: envelope(config, wscode, params),
      signal: controlador.signal,
    });
    const xml = await resposta.text();
    if (!resposta.ok) {
      return {
        sucesso: false,
        pendente: false,
        codigo: `HTTP-${resposta.status}`,
        mensagem: "O gateway e-Mola devolveu um erro.",
        requestId: null,
        gwTransId: null,
        resposta: xml.slice(0, 2000),
      };
    }
    const erroGateway = extrair(xml, "error");
    const gwTransId = extrair(xml, "gwtransid");
    if (erroGateway && erroGateway !== "0") {
      return {
        sucesso: false,
        pendente: false,
        codigo: `GW-${erroGateway}`,
        mensagem:
          CODIGOS_EMOLA[erroGateway] ??
          "O gateway e-Mola rejeitou o pedido (credenciais ou parâmetros).",
        requestId: null,
        gwTransId,
        resposta: xml.slice(0, 2000),
      };
    }
    // O detalhe vem num envelope SOAP interno, escapado dentro de <original>.
    const original = extrair(xml, "original");
    const interno = original ? desescapar(original) : xml;
    const codigo = extrair(interno, "errorCode") ?? "?";
    const mensagem = extrair(interno, "message") ?? "";
    const requestId = extrair(interno, "reqeustId") ?? extrair(interno, "requestId");
    return {
      sucesso: codigo === "0",
      pendente: codigo === "22",
      codigo,
      mensagem: CODIGOS_EMOLA[codigo] ?? (mensagem || "Resposta desconhecida do e-Mola."),
      requestId,
      gwTransId,
      resposta: { codigo, mensagem, requestId, gwTransId },
    };
  } catch (erro) {
    return {
      sucesso: false,
      pendente: true,
      codigo: "REDE",
      mensagem:
        erro instanceof Error && erro.name === "AbortError"
          ? "O e-Mola demorou demasiado a responder."
          : "Não foi possível contactar o e-Mola.",
      requestId: null,
      gwTransId: null,
      resposta: { erro: String(erro) },
    };
  } finally {
    clearTimeout(temporizador);
  }
}

/** C2B via USSD push. */
export async function cobrarEmola(
  config: EmolaConfig,
  dados: { msisdn: string; valor: number; referencia: string; descricao: string },
): Promise<ResultadoEmola> {
  return chamar(config, "pushUssdMessage", {
    msisdn: dados.msisdn,
    smsContent: dados.descricao.slice(0, 60),
    transAmount: Math.round(dados.valor).toString(),
    transId: dados.referencia,
    language: "pt",
    refNo: dados.referencia,
    partnerCode: config.partnerCode,
    key: config.key,
  });
}

/** Consulta o estado de uma transação C2B pela nossa referência. */
export async function consultarEmola(
  config: EmolaConfig,
  referencia: string,
): Promise<ResultadoEmola> {
  return chamar(config, "queryTransaction", {
    transId: referencia,
    transType: "C2B",
    partnerCode: config.partnerCode,
    key: config.key,
  });
}
