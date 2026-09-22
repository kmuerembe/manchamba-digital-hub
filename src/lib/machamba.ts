import { supabase } from "@/integrations/supabase/client";
import { urlsDasFotos } from "@/lib/fotos";

export type Categoria = {
  id: string;
  nome: string;
  slug: string;
  tipo: string;
  ativo: boolean;
  ordem: number;
  cor: string | null;
  icone: string | null;
};

export type Produto = {
  id: string;
  titulo: string;
  descricao: string | null;
  preco: number;
  unidade: string;
  quantidade: number | null;
  negociavel: boolean;
  estado: string;
  provincia: string | null;
  distrito: string | null;
  bairro: string | null;
  destaque: boolean;
  criadoEm: string;
  categoriaId: string | null;
  categoria: string;
  vendedorId: string;
  vendedorNome: string;
  vendedorVerificado: boolean;
  imagem: string | null;
};

type LinhaProduto = {
  id: string;
  titulo: string;
  descricao: string | null;
  preco: number | string;
  unidade: string;
  quantidade: number | string | null;
  negociavel: boolean;
  estado: string;
  provincia: string | null;
  distrito: string | null;
  bairro: string | null;
  destaque: boolean;
  criado_em: string;
  categoria_id: string | null;
  vendedor_id: string;
  categorias: { nome: string } | null;
  produto_fotos: { url: string; ordem: number }[] | null;
  profiles: { nome: string; verificado: boolean } | null;
};

const SELECT_PRODUTO =
  "id,titulo,descricao,preco,unidade,quantidade,negociavel,estado,provincia,distrito,bairro,destaque,criado_em,categoria_id,vendedor_id,categorias(nome),produto_fotos(url,ordem),profiles!produtos_vendedor_fk(nome,verificado)";

async function mapearProdutos(linhas: LinhaProduto[]): Promise<Produto[]> {
  const caminhos = linhas
    .map((linha) => [...(linha.produto_fotos ?? [])].sort((a, b) => a.ordem - b.ordem)[0]?.url)
    .filter((valor): valor is string => Boolean(valor));
  const urls = await urlsDasFotos("produtos", caminhos);

  return linhas.map((linha) => {
    const caminho = [...(linha.produto_fotos ?? [])].sort((a, b) => a.ordem - b.ordem)[0]?.url ?? null;
    return {
      id: linha.id,
      titulo: linha.titulo,
      descricao: linha.descricao,
      preco: Number(linha.preco),
      unidade: linha.unidade,
      quantidade: linha.quantidade === null ? null : Number(linha.quantidade),
      negociavel: linha.negociavel,
      estado: linha.estado,
      provincia: linha.provincia,
      distrito: linha.distrito,
      bairro: linha.bairro,
      destaque: linha.destaque,
      criadoEm: linha.criado_em,
      categoriaId: linha.categoria_id,
      categoria: linha.categorias?.nome ?? "Sem categoria",
      vendedorId: linha.vendedor_id,
      vendedorNome: linha.profiles?.nome?.trim() || "Vendedor",
      vendedorVerificado: Boolean(linha.profiles?.verificado),
      imagem: caminho ? (urls[caminho] ?? null) : null,
    };
  });
}

export async function listarCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from("categorias")
    .select("id,nome,slug,tipo,ativo,ordem,cor,icone")
    .order("ordem");
  if (error) throw error;
  return (data ?? []) as Categoria[];
}

export async function listarProdutos(): Promise<Produto[]> {
  const { data, error } = await supabase
    .from("produtos")
    .select(SELECT_PRODUTO)
    .eq("estado", "ativo")
    .order("destaque", { ascending: false })
    .order("criado_em", { ascending: false })
    .limit(200);
  if (error) throw error;
  return mapearProdutos((data ?? []) as unknown as LinhaProduto[]);
}

export async function listarProdutosPorEstado(estado: string): Promise<Produto[]> {
  const { data, error } = await supabase
    .from("produtos")
    .select(SELECT_PRODUTO)
    .eq("estado", estado)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return mapearProdutos((data ?? []) as unknown as LinhaProduto[]);
}

export async function listarMeusProdutos(utilizadorId: string): Promise<Produto[]> {
  const { data, error } = await supabase
    .from("produtos")
    .select(SELECT_PRODUTO)
    .eq("vendedor_id", utilizadorId)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return mapearProdutos((data ?? []) as unknown as LinhaProduto[]);
}

export async function listarFavoritos(utilizadorId: string): Promise<{ ids: string[]; produtos: Produto[] }> {
  const { data, error } = await supabase
    .from("favoritos")
    .select("produto_id")
    .eq("utilizador_id", utilizadorId);
  if (error) throw error;
  const ids = (data ?? []).map((linha) => linha.produto_id);
  if (!ids.length) return { ids: [], produtos: [] };
  const { data: linhas, error: erroProdutos } = await supabase.from("produtos").select(SELECT_PRODUTO).in("id", ids);
  if (erroProdutos) throw erroProdutos;
  return { ids, produtos: await mapearProdutos((linhas ?? []) as unknown as LinhaProduto[]) };
}

export async function alternarFavorito(utilizadorId: string, produtoId: string, guardado: boolean) {
  if (guardado) {
    const { error } = await supabase
      .from("favoritos")
      .delete()
      .eq("utilizador_id", utilizadorId)
      .eq("produto_id", produtoId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("favoritos").insert({ utilizador_id: utilizadorId, produto_id: produtoId });
  if (error) throw error;
}

export type Conversa = {
  id: string;
  produtoId: string | null;
  produtoTitulo: string | null;
  outroId: string;
  outroNome: string;
  ultimaMensagem: string | null;
  ultimaMensagemEm: string | null;
};

export async function listarConversas(utilizadorId: string): Promise<Conversa[]> {
  const { data, error } = await supabase
    .from("conversas")
    .select(
      "id,produto_id,participante1_id,participante2_id,ultima_mensagem,ultima_mensagem_em,produtos(titulo),p1:profiles!conversas_p1_fk(id,nome),p2:profiles!conversas_p2_fk(id,nome)",
    )
    .order("ultima_mensagem_em", { ascending: false, nullsFirst: false });
  if (error) throw error;

  type Linha = {
    id: string;
    produto_id: string | null;
    participante1_id: string;
    participante2_id: string;
    ultima_mensagem: string | null;
    ultima_mensagem_em: string | null;
    produtos: { titulo: string } | null;
    p1: { id: string; nome: string } | null;
    p2: { id: string; nome: string } | null;
  };

  return ((data ?? []) as unknown as Linha[]).map((linha) => {
    const souPrimeiro = linha.participante1_id === utilizadorId;
    const outro = souPrimeiro ? linha.p2 : linha.p1;
    return {
      id: linha.id,
      produtoId: linha.produto_id,
      produtoTitulo: linha.produtos?.titulo ?? null,
      outroId: outro?.id ?? (souPrimeiro ? linha.participante2_id : linha.participante1_id),
      outroNome: outro?.nome?.trim() || "Utilizador",
      ultimaMensagem: linha.ultima_mensagem,
      ultimaMensagemEm: linha.ultima_mensagem_em,
    };
  });
}

export type Mensagem = {
  id: string;
  conversaId: string;
  remetenteId: string;
  destinatarioId: string;
  conteudo: string;
  criadoEm: string;
};

export async function listarMensagens(conversaId: string): Promise<Mensagem[]> {
  const { data, error } = await supabase
    .from("mensagens")
    .select("id,conversa_id,remetente_id,destinatario_id,conteudo,criado_em")
    .eq("conversa_id", conversaId)
    .order("criado_em");
  if (error) throw error;
  return (data ?? []).map((linha) => ({
    id: linha.id,
    conversaId: linha.conversa_id,
    remetenteId: linha.remetente_id,
    destinatarioId: linha.destinatario_id,
    conteudo: linha.conteudo,
    criadoEm: linha.criado_em,
  }));
}

/** Encontra a conversa existente para este produto e par de utilizadores, ou cria uma. */
export async function abrirConversa(euId: string, outroId: string, produtoId: string | null): Promise<string> {
  let procura = supabase
    .from("conversas")
    .select("id")
    .or(
      `and(participante1_id.eq.${euId},participante2_id.eq.${outroId}),and(participante1_id.eq.${outroId},participante2_id.eq.${euId})`,
    );
  procura = produtoId ? procura.eq("produto_id", produtoId) : procura.is("produto_id", null);
  const existente = await procura.limit(1).maybeSingle();

  if (existente.data?.id) return existente.data.id;

  const { data, error } = await supabase
    .from("conversas")
    .insert({ participante1_id: euId, participante2_id: outroId, produto_id: produtoId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function enviarMensagem(conversaId: string, remetenteId: string, destinatarioId: string, conteudo: string) {
  const { error } = await supabase.from("mensagens").insert({
    conversa_id: conversaId,
    remetente_id: remetenteId,
    destinatario_id: destinatarioId,
    conteudo,
  });
  if (error) throw error;
}

export type Notificacao = {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string | null;
  lida: boolean;
  criado_em: string;
};

export async function listarNotificacoes(utilizadorId: string): Promise<Notificacao[]> {
  const { data, error } = await supabase
    .from("notificacoes")
    .select("id,tipo,titulo,mensagem,lida,criado_em")
    .eq("utilizador_id", utilizadorId)
    .order("criado_em", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Notificacao[];
}

export async function marcarNotificacoesLidas(utilizadorId: string) {
  await supabase.from("notificacoes").update({ lida: true }).eq("utilizador_id", utilizadorId).eq("lida", false);
}

export type Artigo = {
  id: string;
  titulo: string;
  resumo: string | null;
  conteudo: string | null;
  imagem_url: string | null;
  criado_em: string;
};

export async function listarArtigos(): Promise<Artigo[]> {
  const { data, error } = await supabase
    .from("artigos")
    .select("id,titulo,resumo,conteudo,imagem_url,criado_em")
    .eq("publicado", true)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Artigo[];
}

export type Analise = {
  id: string;
  cultura: string | null;
  diagnostico: string | null;
  descricao: string | null;
  recomendacao: string | null;
  gravidade: string | null;
  confianca: number | null;
  estado: string;
  criado_em: string;
  foto_url: string | null;
  produtos_sugeridos: unknown;
};

export async function listarAnalises(utilizadorId: string): Promise<Analise[]> {
  const { data, error } = await supabase
    .from("analises_cultura")
    .select("id,cultura,diagnostico,descricao,recomendacao,gravidade,confianca,estado,criado_em,foto_url,produtos_sugeridos")
    .eq("utilizador_id", utilizadorId)
    .order("criado_em", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as Analise[];
}

export async function avaliacaoDoVendedor(vendedorId: string): Promise<{ media: number | null; total: number }> {
  const { data, error } = await supabase.from("avaliacoes").select("estrelas").eq("avaliado_id", vendedorId);
  if (error) throw error;
  const linhas = data ?? [];
  if (!linhas.length) return { media: null, total: 0 };
  const soma = linhas.reduce((total, linha) => total + linha.estrelas, 0);
  return { media: Math.round((soma / linhas.length) * 10) / 10, total: linhas.length };
}

export async function podeAvaliar(euId: string, outroId: string): Promise<boolean> {
  const { data } = await supabase
    .from("conversas")
    .select("id")
    .or(
      `and(participante1_id.eq.${euId},participante2_id.eq.${outroId}),and(participante1_id.eq.${outroId},participante2_id.eq.${euId})`,
    )
    .limit(1);
  return Boolean(data?.length);
}

export async function guardarAvaliacao(avaliadorId: string, avaliadoId: string, estrelas: number, comentario: string) {
  const { error } = await supabase
    .from("avaliacoes")
    .upsert(
      { avaliador_id: avaliadorId, avaliado_id: avaliadoId, estrelas, comentario: comentario || null },
      { onConflict: "avaliador_id,avaliado_id" },
    );
  if (error) throw error;
}

export async function criarDenuncia(denuncianteId: string, produtoId: string, motivo: string, descricao: string) {
  const { error } = await supabase.from("denuncias").insert({
    denunciante_id: denuncianteId,
    produto_id: produtoId,
    motivo,
    descricao: descricao || null,
  });
  if (error) throw error;
}
