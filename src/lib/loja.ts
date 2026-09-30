import { supabase } from "@/integrations/supabase/client";
import { urlsDasFotos } from "@/lib/fotos";

export type Endereco = {
  id: string;
  nome: string;
  telefone: string;
  provincia: string;
  distrito: string;
  bairro: string | null;
  referencia: string | null;
  principal: boolean;
};

export type ItemPedido = {
  id: string;
  produtoId: string | null;
  vendedorId: string;
  titulo: string;
  preco: number;
  quantidade: number;
  imagem: string | null;
  estado: string;
};

export type Pedido = {
  id: string;
  numero: string;
  compradorId: string;
  estado: string;
  subtotal: number;
  envio: number;
  total: number;
  metodoPagamento: string | null;
  telefonePagamento: string | null;
  endereco: Endereco | Record<string, string>;
  notas: string | null;
  pagoEm: string | null;
  criadoEm: string;
  itens: ItemPedido[];
};

export type Pagamento = {
  id: string;
  metodo: string;
  telefone: string;
  valor: number;
  referencia: string;
  estado: string;
  ambiente: string;
  codigoResposta: string | null;
  mensagem: string | null;
  transacaoId: string | null;
  criadoEm: string;
};

const SELECT_PEDIDO =
  "id,numero,comprador_id,estado,subtotal,envio,total,metodo_pagamento,telefone_pagamento,endereco,notas,pago_em,criado_em,pedido_itens(id,produto_id,vendedor_id,titulo,preco,quantidade,imagem_url,estado)";

type LinhaPedido = {
  id: string;
  numero: string;
  comprador_id: string;
  estado: string;
  subtotal: number | string;
  envio: number | string;
  total: number | string;
  metodo_pagamento: string | null;
  telefone_pagamento: string | null;
  endereco: Record<string, string>;
  notas: string | null;
  pago_em: string | null;
  criado_em: string;
  pedido_itens: {
    id: string;
    produto_id: string | null;
    vendedor_id: string;
    titulo: string;
    preco: number | string;
    quantidade: number;
    imagem_url: string | null;
    estado: string;
  }[];
};

async function mapearPedidos(linhas: LinhaPedido[]): Promise<Pedido[]> {
  const caminhos = linhas
    .flatMap((linha) => linha.pedido_itens.map((item) => item.imagem_url ?? ""))
    .filter(Boolean);
  const urls = await urlsDasFotos("produtos", caminhos);
  return linhas.map((linha) => ({
    id: linha.id,
    numero: linha.numero,
    compradorId: linha.comprador_id,
    estado: linha.estado,
    subtotal: Number(linha.subtotal),
    envio: Number(linha.envio),
    total: Number(linha.total),
    metodoPagamento: linha.metodo_pagamento,
    telefonePagamento: linha.telefone_pagamento,
    endereco: linha.endereco,
    notas: linha.notas,
    pagoEm: linha.pago_em,
    criadoEm: linha.criado_em,
    itens: linha.pedido_itens.map((item) => ({
      id: item.id,
      produtoId: item.produto_id,
      vendedorId: item.vendedor_id,
      titulo: item.titulo,
      preco: Number(item.preco),
      quantidade: item.quantidade,
      imagem: item.imagem_url ? (urls[item.imagem_url] ?? null) : null,
      estado: item.estado,
    })),
  }));
}

export async function listarMeusPedidos(compradorId: string): Promise<Pedido[]> {
  const { data, error } = await supabase
    .from("pedidos")
    .select(SELECT_PEDIDO)
    .eq("comprador_id", compradorId)
    .order("criado_em", { ascending: false })
    .limit(100);
  if (error) throw error;
  return mapearPedidos((data ?? []) as unknown as LinhaPedido[]);
}

export async function obterPedido(id: string): Promise<Pedido | null> {
  const { data, error } = await supabase
    .from("pedidos")
    .select(SELECT_PEDIDO)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [pedido] = await mapearPedidos([data as unknown as LinhaPedido]);
  return pedido ?? null;
}

/** Encomendas que contêm artigos deste vendedor. */
export async function listarVendas(vendedorId: string): Promise<Pedido[]> {
  const { data: itens, error } = await supabase
    .from("pedido_itens")
    .select("pedido_id")
    .eq("vendedor_id", vendedorId)
    .order("criado_em", { ascending: false })
    .limit(300);
  if (error) throw error;
  const ids = [...new Set((itens ?? []).map((item) => item.pedido_id))];
  if (!ids.length) return [];
  const { data, error: erroPedidos } = await supabase
    .from("pedidos")
    .select(SELECT_PEDIDO)
    .in("id", ids)
    .neq("estado", "aguarda_pagamento")
    .order("criado_em", { ascending: false });
  if (erroPedidos) throw erroPedidos;
  const pedidos = await mapearPedidos((data ?? []) as unknown as LinhaPedido[]);
  return pedidos.map((pedido) => ({
    ...pedido,
    itens: pedido.itens.filter((item) => item.vendedorId === vendedorId),
  }));
}

export async function listarPagamentos(pedidoId: string): Promise<Pagamento[]> {
  const { data, error } = await supabase
    .from("pagamentos")
    .select(
      "id,metodo,telefone,valor,referencia,estado,ambiente,codigo_resposta,mensagem,transacao_id,criado_em",
    )
    .eq("pedido_id", pedidoId)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((linha) => ({
    id: linha.id,
    metodo: linha.metodo,
    telefone: linha.telefone,
    valor: Number(linha.valor),
    referencia: linha.referencia,
    estado: linha.estado,
    ambiente: linha.ambiente,
    codigoResposta: linha.codigo_resposta,
    mensagem: linha.mensagem,
    transacaoId: linha.transacao_id,
    criadoEm: linha.criado_em,
  }));
}

export async function listarEnderecos(utilizadorId: string): Promise<Endereco[]> {
  const { data, error } = await supabase
    .from("enderecos")
    .select("id,nome,telefone,provincia,distrito,bairro,referencia,principal")
    .eq("utilizador_id", utilizadorId)
    .order("principal", { ascending: false })
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Endereco[];
}

export async function apagarEndereco(id: string) {
  const { error } = await supabase.from("enderecos").delete().eq("id", id);
  if (error) throw error;
}
