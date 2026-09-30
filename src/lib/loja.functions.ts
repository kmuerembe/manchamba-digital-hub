import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ItemInput = z.object({
  produtoId: z.string().uuid(),
  quantidade: z.number().int().min(1).max(99),
});

const EnderecoInput = z.object({
  nome: z.string().trim().min(2).max(80),
  telefone: z.string().trim().min(9).max(16),
  provincia: z.string().trim().min(2),
  distrito: z.string().trim().min(2),
  bairro: z.string().trim().max(120).optional().default(""),
  referencia: z.string().trim().max(200).optional().default(""),
});

const CriarPedidoInput = z.object({
  itens: z.array(ItemInput).min(1).max(30),
  endereco: EnderecoInput,
  notas: z.string().trim().max(300).optional().default(""),
  guardarEndereco: z.boolean().optional().default(false),
});

export type ResumoPedidoCriado = {
  pedidoId: string;
  numero: string;
  subtotal: number;
  envio: number;
  total: number;
};

/** Cria a encomenda validando preços e stock no servidor (nunca confia no carrinho do browser). */
export const criarPedido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => CriarPedidoInput.parse(input))
  .handler(async ({ data, context }): Promise<ResumoPedidoCriado> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ids = [...new Set(data.itens.map((item) => item.produtoId))];

    const { data: produtos, error } = await supabaseAdmin
      .from("produtos")
      .select(
        "id,titulo,preco,stock,estado,vendedor_id,envio_gratis,custo_envio,produto_fotos(url,ordem)",
      )
      .in("id", ids);
    if (error) throw new Error("Não foi possível validar os produtos.");

    const porId = new Map((produtos ?? []).map((produto) => [produto.id, produto]));
    let subtotal = 0;
    let envio = 0;
    const vendedoresComEnvio = new Set<string>();
    const itens = data.itens.map((item) => {
      const produto = porId.get(item.produtoId);
      if (!produto || produto.estado !== "ativo")
        throw new Error("Um dos produtos já não está disponível.");
      if (produto.vendedor_id === context.userId)
        throw new Error("Não podes comprar os teus próprios produtos.");
      if (produto.stock < item.quantidade)
        throw new Error(`Só restam ${produto.stock} unidade(s) de "${produto.titulo}".`);
      const preco = Number(produto.preco);
      subtotal += preco * item.quantidade;
      if (!produto.envio_gratis && !vendedoresComEnvio.has(produto.vendedor_id)) {
        vendedoresComEnvio.add(produto.vendedor_id);
        envio += Number(produto.custo_envio ?? 0);
      }
      const foto =
        [...(produto.produto_fotos ?? [])].sort((a, b) => a.ordem - b.ordem)[0]?.url ?? null;
      return {
        produto_id: produto.id,
        vendedor_id: produto.vendedor_id,
        titulo: produto.titulo,
        preco,
        quantidade: item.quantidade,
        imagem_url: foto,
      };
    });

    subtotal = Math.round(subtotal * 100) / 100;
    envio = Math.round(envio * 100) / 100;
    const total = Math.round((subtotal + envio) * 100) / 100;
    if (total < 1) throw new Error("O valor mínimo de uma encomenda é 1 MZN.");

    const { data: pedido, error: erroPedido } = await supabaseAdmin
      .from("pedidos")
      .insert({
        comprador_id: context.userId,
        subtotal,
        envio,
        total,
        endereco: data.endereco,
        notas: data.notas || null,
      })
      .select("id,numero")
      .single();
    if (erroPedido || !pedido) throw new Error("Não foi possível criar a encomenda.");

    const { error: erroItens } = await supabaseAdmin
      .from("pedido_itens")
      .insert(itens.map((item) => ({ ...item, pedido_id: pedido.id })));
    if (erroItens) {
      await supabaseAdmin.from("pedidos").delete().eq("id", pedido.id);
      throw new Error("Não foi possível registar os artigos da encomenda.");
    }

    if (data.guardarEndereco) {
      await supabaseAdmin
        .from("enderecos")
        .insert({ ...data.endereco, utilizador_id: context.userId, principal: true });
    }

    return { pedidoId: pedido.id, numero: pedido.numero, subtotal, envio, total };
  });

const IniciarPagamentoInput = z.object({
  pedidoId: z.string().uuid(),
  metodo: z.enum(["mpesa", "emola"]),
  telefone: z.string().trim().min(9).max(16),
});

export const iniciarPagamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => IniciarPagamentoInput.parse(input))
  .handler(async ({ data, context }) => {
    const { iniciarCobranca } = await import("@/lib/pagamentos/processar.server");
    return iniciarCobranca({ ...data, compradorId: context.userId });
  });

export const consultarPagamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ pagamentoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { consultarCobranca } = await import("@/lib/pagamentos/processar.server");
    const { data: dono } = await supabaseAdmin
      .from("pagamentos")
      .select("id,pedidos!inner(comprador_id)")
      .eq("id", data.pagamentoId)
      .maybeSingle();
    const comprador = (dono as unknown as { pedidos: { comprador_id: string } } | null)?.pedidos
      ?.comprador_id;
    if (!dono || comprador !== context.userId) throw new Error("Pagamento não encontrado.");
    return consultarCobranca(data.pagamentoId);
  });

export const metodosDisponiveis = createServerFn({ method: "GET" }).handler(async () => {
  const { disponibilidadeMetodos } = await import("@/lib/pagamentos/processar.server");
  return disponibilidadeMetodos();
});

export const cancelarPedido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ pedidoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("pedidos")
      .update({ estado: "cancelado" })
      .eq("id", data.pedidoId)
      .eq("comprador_id", context.userId)
      .in("estado", ["aguarda_pagamento", "falhou"]);
    if (error) throw new Error("Não foi possível cancelar.");
    return { ok: true };
  });

const EstadoItemInput = z.object({
  itemId: z.string().uuid(),
  estado: z.enum(["confirmado", "enviado", "entregue", "cancelado"]),
});

/** Vendedor actualiza o estado do seu artigo; quando todos coincidem, a encomenda acompanha. */
export const atualizarEstadoItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => EstadoItemInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: item } = await supabaseAdmin
      .from("pedido_itens")
      .select("id,pedido_id,vendedor_id")
      .eq("id", data.itemId)
      .maybeSingle();
    if (!item || item.vendedor_id !== context.userId) throw new Error("Artigo não encontrado.");

    await supabaseAdmin.from("pedido_itens").update({ estado: data.estado }).eq("id", item.id);

    const { data: todos } = await supabaseAdmin
      .from("pedido_itens")
      .select("estado")
      .eq("pedido_id", item.pedido_id);
    const estados = new Set((todos ?? []).map((linha) => linha.estado));
    const mapa: Record<string, string> = {
      confirmado: "em_preparacao",
      enviado: "enviado",
      entregue: "entregue",
    };
    const novoEstado = mapa[data.estado];
    if (estados.size === 1 && novoEstado) {
      await supabaseAdmin
        .from("pedidos")
        .update({ estado: novoEstado })
        .eq("id", item.pedido_id)
        .neq("estado", "aguarda_pagamento");
    }
    return { ok: true };
  });
