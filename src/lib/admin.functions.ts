import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Balde } from "@/lib/fotos";
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

/**
 * Baldes que `drizzle/migrations/0004_storage_baldes.sql` cria no storage do
 * Supabase. O tipo vem de `@/lib/fotos` (que é quem faz os uploads) para os nomes
 * não divergirem.
 */
const BALDES_FOTOS: Balde[] = ["produtos", "diagnosticos"];

export type EstadoVerificacao = "ok" | "aviso" | "erro";

export type VerificacaoInstalacao = {
  chave: string;
  rotulo: string;
  estado: EstadoVerificacao;
  detalhe: string;
};

export type EstadoInstalacao = {
  verificacoes: VerificacaoInstalacao[];
  /** Baldes de storage encontrados no projecto. */
  baldes: string[];
  /** Quantas verificações precisam de intervenção (aviso ou erro). */
  aCorrigir: number;
};

/**
 * Estado da instalação: o que falta configurar no Supabase e nas variáveis de
 * ambiente para a loja funcionar de ponta a ponta. É a primeira coisa a ver
 * quando publicar anúncios ou cobrar pagamentos começa a falhar — por exemplo,
 * os baldes de fotografias em falta (migração 0004) aparecem aqui como erro.
 *
 * Só devolve estados e textos: nunca devolve valores de chaves ou segredos.
 */
export const estadoInstalacao = createServerFn({ method: "GET" })
  .middleware([exigirAdmin])
  .handler(async (): Promise<EstadoInstalacao> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { disponibilidadeMetodos } = await import("@/lib/pagamentos/processar.server");
    const verificacoes: VerificacaoInstalacao[] = [];

    // --- baldes de fotografias (migração 0004) ---
    let baldes: string[] = [];
    let semLeitura = false;
    try {
      const { data, error } = await supabaseAdmin.storage.listBuckets();
      if (error) throw error;
      baldes = (data ?? []).map((balde) => balde.name);
    } catch {
      semLeitura = true;
    }
    const faltamBaldes = BALDES_FOTOS.filter((balde) => !baldes.includes(balde));
    verificacoes.push(
      semLeitura
        ? {
            chave: "baldes",
            rotulo: "Baldes de fotografias",
            estado: "aviso",
            detalhe: "Não foi possível ler os baldes de storage a partir do servidor.",
          }
        : faltamBaldes.length
          ? {
              chave: "baldes",
              rotulo: "Baldes de fotografias",
              estado: "erro",
              detalhe: `Falta criar ${faltamBaldes.map((balde) => `«${balde}»`).join(" e ")}: corre drizzle/migrations/0004_storage_baldes.sql no SQL editor do Supabase. Sem isto, publicar anúncios com fotografias e o diagnóstico de culturas falham.`,
            }
          : {
              chave: "baldes",
              rotulo: "Baldes de fotografias",
              estado: "ok",
              detalhe: "«produtos» e «diagnosticos» criados — os uploads de fotografias funcionam.",
            },
    );

    // --- chave de serviço (escreve encomendas, pagamentos e user_roles) ---
    verificacoes.push(
      process.env["SUPABASE_SERVICE_ROLE_KEY"]
        ? {
            chave: "service-role",
            rotulo: "Chave de serviço",
            estado: "ok",
            detalhe:
              "SUPABASE_SERVICE_ROLE_KEY presente — encomendas, pagamentos e papéis funcionam.",
          }
        : {
            chave: "service-role",
            rotulo: "Chave de serviço",
            estado: "erro",
            detalhe:
              "Falta SUPABASE_SERVICE_ROLE_KEY no servidor: não é possível criar encomendas, cobrar pagamentos nem dar acesso de administrador.",
          },
    );

    // --- pagamentos móveis ---
    const metodos = disponibilidadeMetodos();
    const rotuloMetodo = (
      nome: string,
      metodo: { disponivel: boolean; ambiente: string | null },
    ) =>
      metodo.ambiente === "simulacao"
        ? {
            chave: nome,
            rotulo: nome === "mpesa" ? "M-Pesa (Vodacom)" : "e-Mola (Movitel)",
            estado: "aviso" as EstadoVerificacao,
            detalhe:
              nome === "mpesa"
                ? "Em simulação: faltam MPESA_API_KEY e MPESA_PUBLIC_KEY, por isso os pagamentos confirmam-se sozinhos e não cobram dinheiro."
                : "Em simulação: faltam as variáveis EMOLA_* , por isso os pagamentos confirmam-se sozinhos e não cobram dinheiro.",
          }
        : metodo.ambiente
          ? {
              chave: nome,
              rotulo: nome === "mpesa" ? "M-Pesa (Vodacom)" : "e-Mola (Movitel)",
              estado: "ok" as EstadoVerificacao,
              detalhe: `Configurado em ambiente de ${metodo.ambiente === "producao" ? "produção" : "sandbox"}.`,
            }
          : {
              chave: nome,
              rotulo: nome === "mpesa" ? "M-Pesa (Vodacom)" : "e-Mola (Movitel)",
              estado: "erro" as EstadoVerificacao,
              detalhe:
                "Sem credenciais e com a simulação desligada: este método não aceita pagamentos. Preenche o .env ou liga PAGAMENTOS_SIMULACAO=true.",
            };
    verificacoes.push(rotuloMetodo("mpesa", metodos.mpesa), rotuloMetodo("emola", metodos.emola));

    // --- dados mínimos para a loja funcionar ---
    const [categorias, administradores, produtos] = await Promise.all([
      supabaseAdmin
        .from("categorias")
        .select("id", { count: "exact", head: true })
        .eq("tipo", "produto")
        .eq("ativo", true),
      supabaseAdmin
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin"),
      supabaseAdmin.from("produtos").select("id", { count: "exact", head: true }),
    ]);

    verificacoes.push({
      chave: "categorias",
      rotulo: "Categorias de produtos",
      estado: (categorias.count ?? 0) > 0 ? "ok" : "aviso",
      detalhe:
        (categorias.count ?? 0) > 0
          ? `${categorias.count} categoria(s) activas — o formulário de publicação já tem por onde escolher.`
          : "Sem categorias activas: ninguém consegue publicar anúncios. Corre a migração 0003 ou cria-as na aba Categorias.",
    });

    verificacoes.push({
      chave: "administradores",
      rotulo: "Administradores",
      estado: (administradores.count ?? 0) > 0 ? "ok" : "erro",
      detalhe:
        (administradores.count ?? 0) > 0
          ? `${administradores.count} conta(s) com o papel admin — o painel está acessível.`
          : "Nenhuma conta tem o papel admin: atribui-o uma vez pelo SQL editor (ver README).",
    });

    verificacoes.push(
      process.env["LOVABLE_API_KEY"]
        ? {
            chave: "ia",
            rotulo: "Diagnóstico de culturas",
            estado: "ok",
            detalhe: "Chave de IA presente — a análise de fotografias de culturas funciona.",
          }
        : {
            chave: "ia",
            rotulo: "Diagnóstico de culturas",
            estado: "aviso",
            detalhe:
              "Sem LOVABLE_API_KEY a análise de culturas está desligada; o resto da loja funciona normalmente.",
          },
    );

    // produtos serve só para confirmar que as tabelas da loja existem e são legíveis
    if (produtos.error)
      verificacoes.push({
        chave: "tabelas",
        rotulo: "Tabelas da loja",
        estado: "erro",
        detalhe:
          "Não foi possível ler a tabela produtos — faltam migrações de drizzle/migrations neste projecto.",
      });

    return {
      verificacoes,
      baldes,
      aCorrigir: verificacoes.filter((item) => item.estado !== "ok").length,
    };
  });
