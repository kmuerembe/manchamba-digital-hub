/**
 * Orquestração de pagamentos (só servidor). Usa o cliente admin do Supabase porque
 * as tabelas pedidos/pagamentos só aceitam escrita pelo service_role.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database, Json } from "@/integrations/supabase/types";

import { cobrarEmola, consultarEmola, lerConfigEmola, normalizarMsisdnEmola } from "./emola.server";
import { cobrarMpesa, consultarMpesa, lerConfigMpesa, normalizarMsisdnMpesa } from "./mpesa.server";

export type Metodo = "mpesa" | "emola";
export type EstadoPagamento = "pendente" | "pago" | "falhou" | "expirado";

export type EstadoResultado = {
  pagamentoId: string;
  estado: EstadoPagamento;
  codigo: string | null;
  mensagem: string;
  ambiente: "producao" | "sandbox" | "simulacao";
};

/** Simulação só é permitida quando pedida explicitamente ou em desenvolvimento sem credenciais. */
function simulacaoPermitida(): boolean {
  if (process.env["PAGAMENTOS_SIMULACAO"] === "true") return true;
  if (process.env["PAGAMENTOS_SIMULACAO"] === "false") return false;
  return process.env["NODE_ENV"] !== "production";
}

export function disponibilidadeMetodos() {
  const mpesa = lerConfigMpesa();
  const emola = lerConfigEmola();
  const simulacao = simulacaoPermitida();
  return {
    mpesa: {
      disponivel: Boolean(mpesa) || simulacao,
      ambiente: mpesa ? mpesa.ambiente : simulacao ? "simulacao" : null,
    },
    emola: {
      disponivel: Boolean(emola) || simulacao,
      ambiente: emola ? emola.ambiente : simulacao ? "simulacao" : null,
    },
  } as const;
}

export function gerarReferencia(prefixo: string): string {
  const tempo = Date.now().toString(36).toUpperCase();
  const aleatorio = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefixo}${tempo}${aleatorio}`.slice(0, 20);
}

export function validarTelefone(metodo: Metodo, telefone: string): string | null {
  return metodo === "mpesa" ? normalizarMsisdnMpesa(telefone) : normalizarMsisdnEmola(telefone);
}

async function atualizarPagamento(
  pagamentoId: string,
  dados: {
    estado: EstadoPagamento;
    codigo: string | null;
    mensagem: string;
    transacaoId?: string | null;
    conversaId?: string | null;
    resposta?: unknown;
  },
) {
  const alteracoes: Database["public"]["Tables"]["pagamentos"]["Update"] = {
    estado: dados.estado,
    codigo_resposta: dados.codigo,
    mensagem: dados.mensagem,
    resposta: (dados.resposta ?? null) as Json,
  };
  if (dados.transacaoId) alteracoes.transacao_id = dados.transacaoId;
  if (dados.conversaId) alteracoes.conversa_id = dados.conversaId;
  const { error } = await supabaseAdmin.from("pagamentos").update(alteracoes).eq("id", pagamentoId);
  if (error) throw error;
}

/**
 * Cria o registo de pagamento e dispara o USSD push no operador.
 * Devolve o estado após a resposta síncrona do operador.
 */
export async function iniciarCobranca(dados: {
  pedidoId: string;
  compradorId: string;
  metodo: Metodo;
  telefone: string;
}): Promise<EstadoResultado> {
  const { data: pedido, error } = await supabaseAdmin
    .from("pedidos")
    .select("id,numero,total,estado,comprador_id")
    .eq("id", dados.pedidoId)
    .single();
  if (error || !pedido) throw new Error("Encomenda não encontrada.");
  if (pedido.comprador_id !== dados.compradorId) throw new Error("Esta encomenda não é tua.");
  if (pedido.estado === "pago") throw new Error("Esta encomenda já foi paga.");
  if (!["aguarda_pagamento", "falhou"].includes(pedido.estado))
    throw new Error("Esta encomenda já não aceita pagamento.");

  const msisdn = validarTelefone(dados.metodo, dados.telefone);
  if (!msisdn) {
    throw new Error(
      dados.metodo === "mpesa"
        ? "Número M-Pesa inválido. Usa um número Vodacom (84 ou 85)."
        : "Número e-Mola inválido. Usa um número Movitel (86 ou 87).",
    );
  }

  // Evita cobranças duplicadas: se existe um pagamento pendente recente reutiliza-o.
  const { data: pendente } = await supabaseAdmin
    .from("pagamentos")
    .select("id,criado_em,referencia")
    .eq("pedido_id", pedido.id)
    .eq("estado", "pendente")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pendente && Date.now() - new Date(pendente.criado_em).getTime() < 90_000) {
    return consultarCobranca(pendente.id);
  }
  if (pendente)
    await atualizarPagamento(pendente.id, {
      estado: "expirado",
      codigo: "EXPIRADO",
      mensagem: "Sem confirmação do cliente.",
    });

  const configMpesa = dados.metodo === "mpesa" ? lerConfigMpesa() : null;
  const configEmola = dados.metodo === "emola" ? lerConfigEmola() : null;
  const configurado = Boolean(configMpesa || configEmola);
  if (!configurado && !simulacaoPermitida()) {
    throw new Error(
      dados.metodo === "mpesa"
        ? "M-Pesa ainda não está configurado nesta loja."
        : "e-Mola ainda não está configurado nesta loja.",
    );
  }
  const ambiente: EstadoResultado["ambiente"] =
    configMpesa?.ambiente ?? configEmola?.ambiente ?? "simulacao";
  const referencia = gerarReferencia(dados.metodo === "mpesa" ? "MP" : "EM");

  const { data: pagamento, error: erroPagamento } = await supabaseAdmin
    .from("pagamentos")
    .insert({
      pedido_id: pedido.id,
      metodo: dados.metodo,
      telefone: msisdn,
      valor: Number(pedido.total),
      referencia,
      ambiente,
      mensagem: "A enviar pedido de pagamento…",
    })
    .select("id")
    .single();
  if (erroPagamento || !pagamento) throw new Error("Não foi possível registar o pagamento.");

  await supabaseAdmin
    .from("pedidos")
    .update({ metodo_pagamento: dados.metodo, telefone_pagamento: msisdn })
    .eq("id", pedido.id);

  // ---- Simulação (sem credenciais): confirma passados alguns segundos via consulta.
  if (ambiente === "simulacao") {
    await atualizarPagamento(pagamento.id, {
      estado: "pendente",
      codigo: "SIM-22",
      mensagem: "Modo de simulação: confirma no telemóvel (automático em poucos segundos).",
      resposta: { simulacao: true },
    });
    return {
      pagamentoId: pagamento.id,
      estado: "pendente",
      codigo: "SIM-22",
      mensagem: "Confirma o pagamento no telemóvel.",
      ambiente,
    };
  }

  // ---- M-Pesa (síncrono)
  if (configMpesa) {
    const resultado = await cobrarMpesa(configMpesa, {
      msisdn,
      valor: Number(pedido.total),
      referencia: pedido.numero.replace(/[^A-Za-z0-9]/g, "").slice(0, 20),
      terceiros: referencia,
    });
    const estado: EstadoPagamento = resultado.sucesso
      ? "pago"
      : resultado.pendente
        ? "pendente"
        : "falhou";
    await atualizarPagamento(pagamento.id, {
      estado,
      codigo: resultado.codigo,
      mensagem: resultado.mensagem,
      transacaoId: resultado.transacaoId,
      conversaId: resultado.conversaId,
      resposta: resultado.resposta,
    });
    return {
      pagamentoId: pagamento.id,
      estado,
      codigo: resultado.codigo,
      mensagem: resultado.mensagem,
      ambiente,
    };
  }

  // ---- e-Mola (síncrono ou assíncrono com callback)
  const resultado = await cobrarEmola(configEmola!, {
    msisdn,
    valor: Number(pedido.total),
    referencia,
    descricao: `Machamba Digital ${pedido.numero}`,
  });
  const estado: EstadoPagamento = resultado.sucesso
    ? "pago"
    : resultado.pendente
      ? "pendente"
      : "falhou";
  await atualizarPagamento(pagamento.id, {
    estado,
    codigo: resultado.codigo,
    mensagem: resultado.mensagem,
    transacaoId: resultado.gwTransId,
    conversaId: resultado.requestId,
    resposta: resultado.resposta,
  });
  return {
    pagamentoId: pagamento.id,
    estado,
    codigo: resultado.codigo,
    mensagem: resultado.mensagem,
    ambiente,
  };
}

/** Reconsulta o operador quando o pagamento continua pendente. */
export async function consultarCobranca(pagamentoId: string): Promise<EstadoResultado> {
  const { data: pagamento, error } = await supabaseAdmin
    .from("pagamentos")
    .select("id,metodo,estado,referencia,ambiente,codigo_resposta,mensagem,criado_em,transacao_id")
    .eq("id", pagamentoId)
    .single();
  if (error || !pagamento) throw new Error("Pagamento não encontrado.");

  const ambiente = pagamento.ambiente as EstadoResultado["ambiente"];
  const base = {
    pagamentoId: pagamento.id,
    codigo: pagamento.codigo_resposta,
    mensagem: pagamento.mensagem ?? "",
    ambiente,
  };
  if (pagamento.estado !== "pendente")
    return { ...base, estado: pagamento.estado as EstadoPagamento };

  const idade = Date.now() - new Date(pagamento.criado_em).getTime();

  if (ambiente === "simulacao") {
    if (idade > 8_000) {
      await atualizarPagamento(pagamento.id, {
        estado: "pago",
        codigo: "SIM-0",
        mensagem: "Pagamento simulado com sucesso.",
        transacaoId: `SIM${Date.now().toString(36).toUpperCase()}`,
        resposta: { simulacao: true },
      });
      return {
        ...base,
        estado: "pago",
        codigo: "SIM-0",
        mensagem: "Pagamento simulado com sucesso.",
      };
    }
    return { ...base, estado: "pendente" };
  }

  // Expira após 5 minutos sem confirmação.
  if (idade > 5 * 60_000) {
    await atualizarPagamento(pagamento.id, {
      estado: "expirado",
      codigo: "EXPIRADO",
      mensagem: "Sem confirmação do cliente.",
    });
    return {
      ...base,
      estado: "expirado",
      codigo: "EXPIRADO",
      mensagem: "Sem confirmação do cliente.",
    };
  }

  if (pagamento.metodo === "mpesa") {
    const config = lerConfigMpesa();
    if (!config) return { ...base, estado: "pendente" };
    const resultado = await consultarMpesa(config, {
      consulta: pagamento.transacao_id || pagamento.referencia,
      terceiros: pagamento.referencia,
    });
    if (resultado.pendente) return { ...base, estado: "pendente", mensagem: resultado.mensagem };
    const estado: EstadoPagamento = resultado.sucesso ? "pago" : "falhou";
    await atualizarPagamento(pagamento.id, {
      estado,
      codigo: resultado.codigo,
      mensagem: resultado.mensagem,
      transacaoId: resultado.transacaoId ?? pagamento.transacao_id,
      resposta: resultado.resposta,
    });
    return { ...base, estado, codigo: resultado.codigo, mensagem: resultado.mensagem };
  }

  const config = lerConfigEmola();
  if (!config) return { ...base, estado: "pendente" };
  const resultado = await consultarEmola(config, pagamento.referencia);
  if (resultado.pendente || resultado.codigo === "REDE")
    return { ...base, estado: "pendente", mensagem: resultado.mensagem };
  const estado: EstadoPagamento = resultado.sucesso ? "pago" : "falhou";
  await atualizarPagamento(pagamento.id, {
    estado,
    codigo: resultado.codigo,
    mensagem: resultado.mensagem,
    transacaoId: resultado.gwTransId ?? pagamento.transacao_id,
    resposta: resultado.resposta,
  });
  return { ...base, estado, codigo: resultado.codigo, mensagem: resultado.mensagem };
}

/** Callback assíncrono do e-Mola (JSON): { reqeustId, transId, refNo, errorCode, message } */
export async function tratarCallbackEmola(corpo: Record<string, unknown>): Promise<boolean> {
  const referencia = String(corpo["transId"] ?? corpo["refNo"] ?? "");
  const codigo = String(corpo["errorCode"] ?? "");
  const mensagem = String(corpo["message"] ?? "");
  if (!referencia) return false;

  const { data: pagamento } = await supabaseAdmin
    .from("pagamentos")
    .select("id,estado")
    .eq("referencia", referencia)
    .eq("metodo", "emola")
    .maybeSingle();
  if (!pagamento) return false;
  if (pagamento.estado !== "pendente") return true;

  await atualizarPagamento(pagamento.id, {
    estado: codigo === "0" ? "pago" : "falhou",
    codigo,
    mensagem:
      mensagem ||
      (codigo === "0" ? "Pagamento concluído com sucesso." : "Pagamento não concluído."),
    conversaId: corpo["reqeustId"] ? String(corpo["reqeustId"]) : null,
    resposta: corpo,
  });
  return true;
}
