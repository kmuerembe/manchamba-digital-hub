import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Exige que o utilizador autenticado tenha o papel `admin`.
 * Os painéis de administração usam o cliente com service role, por isso cada
 * chamada é validada aqui antes de tocar na base de dados.
 */
const exigirAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) throw new Error("Não foi possível confirmar as tuas permissões.");
    if (!data) throw new Error("Acesso restrito à equipa de administração.");
    return next({ context: { userId: context.userId } });
  });

export type PontoSerie = { dia: string; encomendas: number; receita: number };

export type ResumoAdmin = {
  utilizadores: number;
  novosUtilizadores: number;
  vendedores: number;
  produtos: { total: number; ativos: number; pendentes: number; rejeitados: number };
  encomendas: {
    total: number;
    pagas: number;
    aguardaPagamento: number;
    emEntrega: number;
    canceladas: number;
    receita: number;
    receita30: number;
  };
  denunciasAbertas: number;
  artigos: { total: number; publicados: number };
  pagamentos: { mpesa: number; emola: number; pago: number; falhou: number };
  serie: PontoSerie[];
  categorias: { nome: string; produtos: number; vendas: number }[];
};

const DIA = 24 * 60 * 60 * 1000;

function chaveDia(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/** Números e gráficos do painel — uma só viagem ao servidor. */
export const resumoAdmin = createServerFn({ method: "GET" })
  .middleware([exigirAdmin])
  .handler(async (): Promise<ResumoAdmin> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const desde = new Date(Date.now() - 30 * DIA).toISOString();
    const desdeSerie = new Date(Date.now() - 13 * DIA);
    desdeSerie.setHours(0, 0, 0, 0);

    const [
      utilizadores,
      novosUtilizadores,
      produtos,
      encomendas,
      encomendasSerie,
      denuncias,
      artigos,
      pagamentos,
      produtosCategoria,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("criado_em", desde),
      supabaseAdmin.from("produtos").select("vendedor_id, estado"),
      supabaseAdmin.from("pedidos").select("estado, total, criado_em"),
      supabaseAdmin
        .from("pedidos")
        .select("estado, total, criado_em")
        .gte("criado_em", desdeSerie.toISOString()),
      supabaseAdmin
        .from("denuncias")
        .select("id", { count: "exact", head: true })
        .eq("estado", "aberta"),
      supabaseAdmin.from("artigos").select("publicado"),
      supabaseAdmin.from("pagamentos").select("metodo, estado"),
      supabaseAdmin.from("produtos").select("vendedor_id, vendas, categorias(nome)"),
    ]);

    const linhasProdutos = produtos.data ?? [];
    const linhasPedidos = encomendas.data ?? [];
    const PAID = new Set(["pago", "em_preparacao", "enviado", "entregue"]);

    const receita = linhasPedidos
      .filter((pedido) => PAID.has(pedido.estado))
      .reduce((soma, pedido) => soma + Number(pedido.total), 0);
    const receita30 = linhasPedidos
      .filter((pedido) => PAID.has(pedido.estado) && pedido.criado_em >= desde)
      .reduce((soma, pedido) => soma + Number(pedido.total), 0);

    // série diária dos últimos 14 dias (dias sem vendas entram a zero)
    const mapa = new Map<string, PontoSerie>();
    for (let i = 0; i < 14; i += 1) {
      const dia = chaveDia(new Date(desdeSerie.getTime() + i * DIA));
      mapa.set(dia, { dia, encomendas: 0, receita: 0 });
    }
    for (const pedido of encomendasSerie.data ?? []) {
      const ponto = mapa.get(pedido.criado_em.slice(0, 10));
      if (!ponto) continue;
      ponto.encomendas += 1;
      if (PAID.has(pedido.estado)) ponto.receita += Number(pedido.total);
    }

    const porCategoria = new Map<string, { nome: string; produtos: number; vendas: number }>();
    for (const linha of produtosCategoria.data ?? []) {
      const nome =
        (linha.categorias as unknown as { nome: string } | null)?.nome ?? "Sem categoria";
      const atual = porCategoria.get(nome) ?? { nome, produtos: 0, vendas: 0 };
      atual.produtos += 1;
      atual.vendas += Number(linha.vendas ?? 0);
      porCategoria.set(nome, atual);
    }

    const linhasPagamentos = pagamentos.data ?? [];

    return {
      utilizadores: utilizadores.count ?? 0,
      novosUtilizadores: novosUtilizadores.count ?? 0,
      vendedores: new Set(linhasProdutos.map((linha) => linha.vendedor_id)).size,
      produtos: {
        total: linhasProdutos.length,
        ativos: linhasProdutos.filter((produto) => produto.estado === "ativo").length,
        pendentes: linhasProdutos.filter((produto) => produto.estado === "pendente").length,
        rejeitados: linhasProdutos.filter((produto) => produto.estado === "rejeitado").length,
      },
      encomendas: {
        total: linhasPedidos.length,
        pagas: linhasPedidos.filter((pedido) => PAID.has(pedido.estado)).length,
        aguardaPagamento: linhasPedidos.filter((pedido) => pedido.estado === "aguarda_pagamento")
          .length,
        emEntrega: linhasPedidos.filter((pedido) => pedido.estado === "enviado").length,
        canceladas: linhasPedidos.filter((pedido) =>
          ["cancelado", "falhou"].includes(pedido.estado),
        ).length,
        receita: Math.round(receita * 100) / 100,
        receita30: Math.round(receita30 * 100) / 100,
      },
      denunciasAbertas: denuncias.count ?? 0,
      artigos: {
        total: (artigos.data ?? []).length,
        publicados: (artigos.data ?? []).filter((artigo) => artigo.publicado).length,
      },
      pagamentos: {
        mpesa: linhasPagamentos.filter((linha) => linha.metodo === "mpesa").length,
        emola: linhasPagamentos.filter((linha) => linha.metodo === "emola").length,
        pago: linhasPagamentos.filter((linha) => linha.estado === "pago").length,
        falhou: linhasPagamentos.filter((linha) => ["falhou", "expirado"].includes(linha.estado))
          .length,
      },
      serie: [...mapa.values()],
      categorias: [...porCategoria.values()].sort((a, b) => b.produtos - a.produtos).slice(0, 6),
    };
  });

/** Atribui ou retira o papel de administrador. Só o service role escreve em user_roles. */
export const definirAdministrador = createServerFn({ method: "POST" })
  .middleware([exigirAdmin])
  .validator((input: unknown) =>
    z.object({ utilizadorId: z.string().uuid(), admin: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!data.admin && data.utilizadorId === context.userId)
      throw new Error("Não podes retirar o teu próprio acesso de administrador.");

    if (data.admin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: data.utilizadorId, role: "admin" },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );
      if (error) throw new Error("Não foi possível dar acesso de administrador.");
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.utilizadorId)
        .eq("role", "admin");
      if (error) throw new Error("Não foi possível retirar o acesso de administrador.");
    }

    const { data: perfil } = await supabaseAdmin
      .from("profiles")
      .select("nome")
      .eq("id", data.utilizadorId)
      .maybeSingle();

    await supabaseAdmin.from("notificacoes").insert({
      utilizador_id: data.utilizadorId,
      tipo: "conta",
      titulo: data.admin ? "Passaste a administrador" : "Deixaste de ser administrador",
      mensagem: data.admin
        ? "Tens agora acesso ao painel de administração da Machamba Digital."
        : "O teu acesso ao painel de administração foi removido.",
      link: "/admin",
    });

    return { ok: true, nome: perfil?.nome ?? "" };
  });
