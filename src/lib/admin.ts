import { supabase } from "@/integrations/supabase/client";
import { SELECT_PEDIDO, mapearPedidos, type LinhaPedido, type Pedido } from "@/lib/loja";
import { SELECT_PRODUTO, mapearProdutos, type LinhaProduto, type Produto } from "@/lib/machamba";

/** Limite generoso: o painel mostra os registos mais recentes de cada área. */
const LIMITE = 300;

export type EstadoProduto = "pendente" | "ativo" | "rejeitado" | "inativo" | "vendido";

export const FILTROS_PRODUTO = ["pendente", "ativo", "rejeitado", "todos"] as const;
export const FILTROS_PEDIDO = [
  "aguarda_pagamento",
  "pago",
  "em_preparacao",
  "enviado",
  "entregue",
  "cancelado",
  "todos",
] as const;

/** Todos os produtos (qualquer estado) — usado na aprovação de anúncios. */
export async function listarProdutosAdmin(estado: string = "pendente"): Promise<Produto[]> {
  let consulta = supabase
    .from("produtos")
    .select(SELECT_PRODUTO)
    .order("criado_em", { ascending: false })
    .limit(LIMITE);
  if (estado !== "todos") consulta = consulta.eq("estado", estado);
  const { data, error } = await consulta;
  if (error) throw error;
  return mapearProdutos((data ?? []) as unknown as LinhaProduto[]);
}

export async function definirEstadoProduto(produtoId: string, estado: EstadoProduto) {
  const { error } = await supabase.from("produtos").update({ estado }).eq("id", produtoId);
  if (error) throw error;
}

export async function alternarDestaqueProduto(produtoId: string, destaque: boolean) {
  const { error } = await supabase.from("produtos").update({ destaque }).eq("id", produtoId);
  if (error) throw error;
}

export async function atualizarStockProduto(produtoId: string, stock: number) {
  const { error } = await supabase
    .from("produtos")
    .update({ stock: Math.max(0, Math.round(stock)) })
    .eq("id", produtoId);
  if (error) throw error;
}

/** Todas as encomendas da plataforma, com os artigos e os dados de entrega. */
export async function listarEncomendasAdmin(estado: string = "todos"): Promise<Pedido[]> {
  let consulta = supabase
    .from("pedidos")
    .select(SELECT_PEDIDO)
    .order("criado_em", { ascending: false })
    .limit(LIMITE);
  if (estado !== "todos") consulta = consulta.eq("estado", estado);
  const { data, error } = await consulta;
  if (error) throw error;
  return mapearPedidos((data ?? []) as unknown as LinhaPedido[]);
}

export const ESTADOS_PEDIDO_ADMIN = [
  "aguarda_pagamento",
  "pago",
  "em_preparacao",
  "enviado",
  "entregue",
  "cancelado",
] as const;

export async function definirEstadoEncomenda(pedidoId: string, estado: string) {
  const { error } = await supabase.from("pedidos").update({ estado }).eq("id", pedidoId);
  if (error) throw error;
}

export type UtilizadorAdmin = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  tipo: string;
  provincia: string | null;
  distrito: string | null;
  verificado: boolean;
  ativo: boolean;
  criadoEm: string;
  ehAdmin: boolean;
  papeis: string[];
  produtos: number;
  encomendas: number;
  gasto: number;
};

/** Perfis com papéis, nº de anúncios e nº de encomendas de cada conta. */
export async function listarUtilizadoresAdmin(): Promise<UtilizadorAdmin[]> {
  const [perfis, papeis, produtos, pedidos] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,nome,email,telefone,tipo,provincia,distrito,verificado,ativo,criado_em")
      .order("criado_em", { ascending: false })
      .limit(LIMITE),
    supabase.from("user_roles").select("user_id,role"),
    supabase.from("produtos").select("vendedor_id"),
    supabase.from("pedidos").select("comprador_id,total,estado"),
  ]);
  if (perfis.error) throw perfis.error;

  const mapaPapeis = new Map<string, string[]>();
  for (const linha of papeis.data ?? []) {
    mapaPapeis.set(linha.user_id, [...(mapaPapeis.get(linha.user_id) ?? []), linha.role]);
  }
  const anuncios = new Map<string, number>();
  for (const linha of produtos.data ?? []) {
    anuncios.set(linha.vendedor_id, (anuncios.get(linha.vendedor_id) ?? 0) + 1);
  }
  const compras = new Map<string, { total: number; gasto: number }>();
  for (const linha of pedidos.data ?? []) {
    const atual = compras.get(linha.comprador_id) ?? { total: 0, gasto: 0 };
    atual.total += 1;
    atual.gasto += Number(linha.total);
    compras.set(linha.comprador_id, atual);
  }

  return (perfis.data ?? []).map((perfil) => {
    const papeisDoPerfil = mapaPapeis.get(perfil.id) ?? [];
    return {
      id: perfil.id,
      nome: perfil.nome?.trim() || "Utilizador",
      email: perfil.email,
      telefone: perfil.telefone,
      tipo: perfil.tipo,
      provincia: perfil.provincia,
      distrito: perfil.distrito,
      verificado: perfil.verificado,
      ativo: perfil.ativo,
      criadoEm: perfil.criado_em,
      ehAdmin: papeisDoPerfil.includes("admin"),
      papeis: papeisDoPerfil,
      produtos: anuncios.get(perfil.id) ?? 0,
      encomendas: compras.get(perfil.id)?.total ?? 0,
      gasto: compras.get(perfil.id)?.gasto ?? 0,
    };
  });
}

export async function atualizarPerfilAdmin(
  utilizadorId: string,
  dados: { verificado?: boolean | undefined; ativo?: boolean | undefined },
) {
  const valores: { verificado?: boolean; ativo?: boolean } = {};
  if (dados.verificado !== undefined) valores.verificado = dados.verificado;
  if (dados.ativo !== undefined) valores.ativo = dados.ativo;
  const { error } = await supabase.from("profiles").update(valores).eq("id", utilizadorId);
  if (error) throw error;
}

export type CategoriaAdmin = {
  id: string;
  nome: string;
  slug: string;
  tipo: string;
  icone: string | null;
  cor: string | null;
  ativo: boolean;
  ordem: number;
  produtos: number;
};

export function gerarSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function listarCategoriasAdmin(): Promise<CategoriaAdmin[]> {
  const [categorias, produtos] = await Promise.all([
    supabase.from("categorias").select("id,nome,slug,tipo,icone,cor,ativo,ordem").order("ordem"),
    supabase.from("produtos").select("categoria_id"),
  ]);
  if (categorias.error) throw categorias.error;

  const contagem = new Map<string, number>();
  for (const linha of produtos.data ?? []) {
    if (!linha.categoria_id) continue;
    contagem.set(linha.categoria_id, (contagem.get(linha.categoria_id) ?? 0) + 1);
  }

  return (categorias.data ?? []).map((categoria) => ({
    id: categoria.id,
    nome: categoria.nome,
    slug: categoria.slug,
    tipo: categoria.tipo,
    icone: categoria.icone,
    cor: categoria.cor,
    ativo: categoria.ativo,
    ordem: categoria.ordem,
    produtos: contagem.get(categoria.id) ?? 0,
  }));
}

export type CategoriaInput = {
  id?: string;
  nome: string;
  slug: string;
  tipo: string;
  icone: string;
  cor: string;
  ativo: boolean;
  ordem: number;
};

export async function guardarCategoria(dados: CategoriaInput) {
  const valores = {
    nome: dados.nome.trim(),
    slug: dados.slug.trim() || gerarSlug(dados.nome),
    tipo: dados.tipo,
    icone: dados.icone.trim() || null,
    cor: dados.cor.trim() || null,
    ativo: dados.ativo,
    ordem: dados.ordem,
  };
  const { error } = dados.id
    ? await supabase.from("categorias").update(valores).eq("id", dados.id)
    : await supabase.from("categorias").insert(valores);
  if (error) throw error;
}

export async function apagarCategoria(id: string) {
  const { error } = await supabase.from("categorias").delete().eq("id", id);
  if (error) throw error;
}

export type DenunciaAdmin = {
  id: string;
  motivo: string;
  descricao: string | null;
  estado: string;
  resolucao: string | null;
  criadoEm: string;
  denunciante: string;
  denuncianteId: string;
  produtoId: string | null;
  produtoTitulo: string | null;
};

const SELECT_DENUNCIA =
  "id,motivo,descricao,estado,resolucao,criado_em,denunciante_id,produto_id,produtos(titulo),profiles!denuncias_denunciante_fk(nome)";

type LinhaDenuncia = {
  id: string;
  motivo: string;
  descricao: string | null;
  estado: string;
  resolucao: string | null;
  criado_em: string;
  denunciante_id: string;
  produto_id: string | null;
  produtos: { titulo: string } | null;
  profiles: { nome: string } | null;
};

export async function listarDenunciasAdmin(estado: string = "todos"): Promise<DenunciaAdmin[]> {
  let consulta = supabase
    .from("denuncias")
    .select(SELECT_DENUNCIA)
    .order("criado_em", { ascending: false })
    .limit(LIMITE);
  if (estado !== "todos") consulta = consulta.eq("estado", estado);
  const { data, error } = await consulta;
  if (error) throw error;
  return ((data ?? []) as unknown as LinhaDenuncia[]).map((linha) => ({
    id: linha.id,
    motivo: linha.motivo,
    descricao: linha.descricao,
    estado: linha.estado,
    resolucao: linha.resolucao,
    criadoEm: linha.criado_em,
    denuncianteId: linha.denunciante_id,
    denunciante: linha.profiles?.nome?.trim() || "Utilizador",
    produtoId: linha.produto_id,
    produtoTitulo: linha.produtos?.titulo ?? null,
  }));
}

export async function resolverDenuncia(id: string, estado: string, resolucao: string) {
  const { error } = await supabase
    .from("denuncias")
    .update({ estado, resolucao: resolucao.trim() || null })
    .eq("id", id);
  if (error) throw error;
}

export type ArtigoAdmin = {
  id: string;
  titulo: string;
  slug: string;
  resumo: string | null;
  conteudo: string | null;
  imagemUrl: string | null;
  publicado: boolean;
  criadoEm: string;
  autor: string | null;
};

const SELECT_ARTIGO =
  "id,titulo,slug,resumo,conteudo,imagem_url,publicado,criado_em,profiles!artigos_autor_fk(nome)";

type LinhaArtigo = {
  id: string;
  titulo: string;
  slug: string;
  resumo: string | null;
  conteudo: string | null;
  imagem_url: string | null;
  publicado: boolean;
  criado_em: string;
  profiles: { nome: string } | null;
};

export async function listarArtigosAdmin(): Promise<ArtigoAdmin[]> {
  const { data, error } = await supabase
    .from("artigos")
    .select(SELECT_ARTIGO)
    .order("criado_em", { ascending: false })
    .limit(LIMITE);
  if (error) throw error;
  return ((data ?? []) as unknown as LinhaArtigo[]).map((linha) => ({
    id: linha.id,
    titulo: linha.titulo,
    slug: linha.slug,
    resumo: linha.resumo,
    conteudo: linha.conteudo,
    imagemUrl: linha.imagem_url,
    publicado: linha.publicado,
    criadoEm: linha.criado_em,
    autor: linha.profiles?.nome?.trim() || null,
  }));
}

export type ArtigoInput = {
  id?: string;
  titulo: string;
  slug: string;
  resumo: string;
  conteudo: string;
  imagemUrl: string;
  publicado: boolean;
  autorId: string;
};

function slugUnico(titulo: string): string {
  const base = gerarSlug(titulo) || "artigo";
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function guardarArtigo(dados: ArtigoInput) {
  const valores = {
    titulo: dados.titulo.trim(),
    slug: dados.slug.trim() || slugUnico(dados.titulo),
    resumo: dados.resumo.trim() || null,
    conteudo: dados.conteudo.trim() || null,
    imagem_url: dados.imagemUrl.trim() || null,
    publicado: dados.publicado,
  };
  const { error } = dados.id
    ? await supabase.from("artigos").update(valores).eq("id", dados.id)
    : await supabase.from("artigos").insert({ ...valores, autor_id: dados.autorId });
  if (error) throw error;
}

export async function apagarArtigo(id: string) {
  const { error } = await supabase.from("artigos").delete().eq("id", id);
  if (error) throw error;
}
