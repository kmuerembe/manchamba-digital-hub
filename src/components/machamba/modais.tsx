import type { User } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, Heart, MapPin, MessageCircle, PackagePlus, Star } from "lucide-react";
import { useState } from "react";

import { AppButton, Estrelas, ModalShell, ProdutoFoto } from "@/components/machamba/ui";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { codigoDoErro, mensagemDeErro } from "@/lib/erros";
import { enviarFotos, type EnvioDeFotos } from "@/lib/fotos";
import {
  abrirConversa,
  avaliacaoDoVendedor,
  criarDenuncia,
  guardarAvaliacao,
  listarCategorias,
  podeAvaliar,
  type Produto,
} from "@/lib/machamba";
import { citiesOf, provinceNames } from "@/lib/mozambique";

export function ProductModal({
  produto,
  favorito,
  onFavorite,
  onClose,
  showNotice,
  onConversa,
  pedirEntrada,
}: {
  produto: Produto;
  favorito: boolean;
  onFavorite: () => void;
  onClose: () => void;
  showNotice: (mensagem: string) => void;
  onConversa: (conversaId: string) => void;
  pedirEntrada: () => void;
}) {
  const { user } = useAuth();
  const [avaliar, setAvaliar] = useState(false);
  const [denunciar, setDenunciar] = useState(false);

  const nota = useQuery({
    queryKey: ["avaliacao", produto.vendedorId],
    queryFn: () => avaliacaoDoVendedor(produto.vendedorId),
  });

  const posso = useQuery({
    queryKey: ["pode-avaliar", user?.id, produto.vendedorId],
    queryFn: () => podeAvaliar(user!.id, produto.vendedorId),
    enabled: Boolean(user) && user?.id !== produto.vendedorId,
  });

  const contactar = useMutation({
    mutationFn: async () => abrirConversa(user!.id, produto.vendedorId, produto.id),
    onSuccess: (conversaId) => {
      onClose();
      onConversa(conversaId);
    },
    onError: () => showNotice("Não foi possível abrir a conversa"),
  });

  return (
    <ModalShell title="Detalhes do produto" onClose={onClose}>
      <ProdutoFoto produto={produto} className="mt-4 aspect-[16/10] w-full rounded-lg" />

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-primary">{produto.categoria}</p>
          <h3 className="font-display text-2xl font-bold">{produto.titulo}</h3>
          <p className="text-sm text-muted-foreground">
            {produto.quantidade
              ? `${produto.quantidade} ${produto.unidade} disponíveis`
              : "Disponibilidade a combinar"}
            {produto.negociavel ? " · preço negociável" : ""}
          </p>
        </div>
        <strong className="shrink-0 font-display text-xl">
          {produto.preco}{" "}
          <small className="font-sans text-xs text-muted-foreground">MZN/{produto.unidade}</small>
        </strong>
      </div>

      {produto.descricao && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{produto.descricao}</p>
      )}

      <div className="mt-4 flex items-center justify-between border-y border-border py-4">
        <div className="min-w-0">
          <strong className="text-sm">{produto.vendedorNome}</strong>
          <p className="text-xs text-muted-foreground">
            <MapPin className="mr-1 inline size-3" />
            {produto.distrito ?? "—"} · {produto.provincia ?? "Moçambique"}
          </p>
        </div>
        <Estrelas valor={nota.data?.media ?? null} />
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <AppButton
          disabled={contactar.isPending || user?.id === produto.vendedorId}
          onClick={() => {
            if (!user) {
              pedirEntrada();
              return;
            }
            contactar.mutate();
          }}
        >
          <MessageCircle className="size-4" />
          {user?.id === produto.vendedorId ? "Este anúncio é teu" : "Contactar vendedor"}
        </AppButton>
        <AppButton
          variant="outline"
          className="px-3"
          ariaLabel="Guardar favorito"
          onClick={() => {
            if (!user) {
              pedirEntrada();
              return;
            }
            onFavorite();
          }}
        >
          <Heart className={`size-5 ${favorito ? "fill-primary text-primary" : ""}`} />
        </AppButton>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <AppButton
          variant="plain"
          onClick={() => (user ? setAvaliar(true) : pedirEntrada())}
          disabled={!posso.data}
        >
          <Star className="size-4" /> Avaliar vendedor
        </AppButton>
        <AppButton variant="plain" onClick={() => (user ? setDenunciar(true) : pedirEntrada())}>
          <Flag className="size-4" /> Denunciar
        </AppButton>
      </div>
      {user && posso.data === false && user.id !== produto.vendedorId && (
        <p className="mt-2 text-xs text-muted-foreground">
          Só podes avaliar depois de teres conversado com este vendedor.
        </p>
      )}

      {avaliar && (
        <AvaliarModal
          vendedorId={produto.vendedorId}
          onClose={() => setAvaliar(false)}
          onDone={() => {
            setAvaliar(false);
            void nota.refetch();
            showNotice("Avaliação enviada");
          }}
        />
      )}
      {denunciar && (
        <DenunciarModal
          produtoId={produto.id}
          onClose={() => setDenunciar(false)}
          onDone={() => {
            setDenunciar(false);
            showNotice("Denúncia enviada para revisão");
          }}
        />
      )}
    </ModalShell>
  );
}

function AvaliarModal({
  vendedorId,
  onClose,
  onDone,
}: {
  vendedorId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const [estrelas, setEstrelas] = useState(5);
  const [comentario, setComentario] = useState("");
  const guardar = useMutation({
    mutationFn: async () => guardarAvaliacao(user!.id, vendedorId, estrelas, comentario),
    onSuccess: onDone,
  });

  return (
    <ModalShell title="Avaliar vendedor" onClose={onClose}>
      <div className="mt-5 flex gap-2">
        {[1, 2, 3, 4, 5].map((valor) => (
          <button
            key={valor}
            onClick={() => setEstrelas(valor)}
            aria-label={`${valor} estrelas`}
            className="p-1"
          >
            <Star
              className={`size-7 ${valor <= estrelas ? "fill-accent text-accent" : "text-muted-foreground"}`}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comentario}
        onChange={(evento) => setComentario(evento.target.value)}
        rows={3}
        placeholder="Comentário (opcional)"
        className="mt-4 w-full rounded-lg border border-border bg-card p-3 text-sm"
      />
      <AppButton
        className="mt-4 w-full"
        disabled={guardar.isPending}
        onClick={() => guardar.mutate()}
      >
        Enviar avaliação
      </AppButton>
    </ModalShell>
  );
}

function DenunciarModal({
  produtoId,
  onClose,
  onDone,
}: {
  produtoId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const [motivo, setMotivo] = useState("Anúncio falso");
  const [descricao, setDescricao] = useState("");
  const guardar = useMutation({
    mutationFn: async () => criarDenuncia(user!.id, produtoId, motivo, descricao),
    onSuccess: onDone,
  });

  return (
    <ModalShell title="Denunciar anúncio" onClose={onClose}>
      <label className="mt-5 block text-sm font-semibold">
        Motivo
        <select
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
          className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal"
        >
          <option>Anúncio falso</option>
          <option>Preço enganoso</option>
          <option>Produto proibido</option>
          <option>Comportamento abusivo</option>
        </select>
      </label>
      <textarea
        value={descricao}
        onChange={(evento) => setDescricao(evento.target.value)}
        rows={3}
        placeholder="Explica o que se passou (opcional)"
        className="mt-4 w-full rounded-lg border border-border bg-card p-3 text-sm"
      />
      <AppButton
        className="mt-4 w-full"
        disabled={guardar.isPending}
        onClick={() => guardar.mutate()}
      >
        Enviar denúncia
      </AppButton>
    </ModalShell>
  );
}

export function FilterModal({
  provincia,
  cidade,
  onProvincia,
  onCidade,
  onClose,
}: {
  provincia: string;
  cidade: string;
  onProvincia: (valor: string) => void;
  onCidade: (valor: string) => void;
  onClose: () => void;
}) {
  const cidades = citiesOf(provincia);
  return (
    <ModalShell title="Filtrar por local" onClose={onClose}>
      <div className="mt-5 space-y-4">
        <label className="block text-sm font-semibold">
          Província
          <select
            value={provincia}
            onChange={(evento) => {
              onProvincia(evento.target.value);
              onCidade("Todas");
            }}
            className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal"
          >
            <option>Todas</option>
            {provinceNames.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Cidade ou distrito
          <select
            value={cidade}
            disabled={provincia === "Todas"}
            onChange={(evento) => onCidade(evento.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal disabled:opacity-60"
          >
            <option>Todas</option>
            {cidades.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <AppButton
            variant="soft"
            onClick={() => {
              onProvincia("Todas");
              onCidade("Todas");
            }}
          >
            Limpar
          </AppButton>
          <AppButton onClick={onClose}>Aplicar</AppButton>
        </div>
      </div>
    </ModalShell>
  );
}

/**
 * Garante que existe uma linha em `public.profiles` para esta conta.
 *
 * `produtos.vendedor_id` é chave estrangeira para `profiles(id)` (migração 0002)
 * e há contas sem perfil — criadas antes do trigger `handle_new_user` ou por
 * entrada com telemóvel. Sem a linha, o insert do anúncio morria com 23503 e o
 * ecrã mostrava apenas "Não foi possível publicar o anúncio".
 */
async function garantirPerfilVendedor(utilizadorId: string, utilizador: User) {
  const { data: existente } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", utilizadorId)
    .maybeSingle();
  if (existente) return;

  const meta = (utilizador.user_metadata ?? {}) as Record<string, unknown>;
  const texto = (chave: string) => {
    const valor = meta[chave];
    return typeof valor === "string" && valor.trim() ? valor.trim() : null;
  };

  const { error } = await supabase.from("profiles").insert({
    id: utilizadorId,
    nome: texto("nome") ?? utilizador.email?.split("@")[0] ?? "Vendedor",
    email: utilizador.email ?? null,
    telefone: texto("telefone") ?? utilizador.phone ?? null,
    tipo: texto("tipo") ?? "vendedor",
    provincia: texto("provincia"),
    distrito: texto("distrito"),
  });
  // 23505: outra janela criou o perfil entretanto — não é um erro para o utilizador.
  if (error && codigoDoErro(error) !== "23505") throw error;
}

/** O anúncio é criado mesmo que as fotografias falhem; só o texto final muda. */
function mensagemDePublicacao(envio: EnvioDeFotos): string {
  if (!envio.falhas.length) return "Anúncio enviado para revisão";
  if (envio.baldeEmFalta)
    return "Anúncio enviado para revisão, mas as fotografias não foram guardadas: falta criar os baldes de imagens no Supabase.";
  const quantas = envio.falhas.length;
  return `Anúncio enviado para revisão — ${quantas} fotografia(s) não foram carregadas. Podes adicioná-las depois.`;
}

export function SellModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (mensagem: string) => void;
}) {
  const { user, perfil, recarregarPerfil } = useAuth();
  const queryClient = useQueryClient();
  const categorias = useQuery({ queryKey: ["categorias"], queryFn: listarCategorias });

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [unidade, setUnidade] = useState("kg");
  const [quantidade, setQuantidade] = useState("");
  const [negociavel, setNegociavel] = useState(false);
  const [categoriaId, setCategoriaId] = useState("");
  const [provincia, setProvincia] = useState(perfil?.provincia ?? "");
  const [distrito, setDistrito] = useState(perfil?.distrito ?? "");
  const [fotos, setFotos] = useState<File[]>([]);
  const [stock, setStock] = useState("1");
  const [precoAntigo, setPrecoAntigo] = useState("");
  const [envioGratis, setEnvioGratis] = useState(true);
  const [custoEnvio, setCustoEnvio] = useState("");
  const [marca, setMarca] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const cidades = citiesOf(provincia);

  const publicar = useMutation({
    mutationFn: async (): Promise<EnvioDeFotos> => {
      // 1. Sessão válida: sem JWT o RLS recusa o insert sem explicação útil.
      const { data: sessao, error: erroSessao } = await supabase.auth.getSession();
      const utilizadorId = sessao.session?.user.id;
      if (erroSessao || !utilizadorId || !sessao.session)
        throw new Error("A tua sessão expirou. Entra de novo para publicar o anúncio.");

      // 2. Perfil do vendedor (chave estrangeira de produtos.vendedor_id).
      await garantirPerfilVendedor(utilizadorId, sessao.session.user);

      // 3. Preço válido — `Number("")` é 0 e texto livre dava 22P02 na base de dados.
      const precoNumero = Number(preco);
      if (!Number.isFinite(precoNumero) || precoNumero <= 0)
        throw new Error("Indica um preço válido em MZN.");

      // 4. Anúncio.
      const { data, error } = await supabase
        .from("produtos")
        .insert({
          titulo,
          descricao: descricao || null,
          preco: precoNumero,
          unidade,
          quantidade: quantidade ? Number(quantidade) : null,
          negociavel,
          categoria_id: categoriaId || null,
          vendedor_id: utilizadorId,
          provincia: provincia || null,
          distrito: distrito || null,
          stock: Math.max(0, Number(stock) || 0),
          preco_antigo:
            precoAntigo && Number(precoAntigo) > precoNumero ? Number(precoAntigo) : null,
          envio_gratis: envioGratis,
          custo_envio: envioGratis ? 0 : Number(custoEnvio) || 0,
          marca: marca.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (!data) throw new Error("Não foi possível publicar o anúncio. Tenta de novo.");

      // 5. Fotografias: cada falha é registada, nunca deita o anúncio abaixo.
      const envio = await enviarFotos("produtos", utilizadorId, fotos.slice(0, 5));
      for (const [indice, caminho] of envio.enviadas.entries()) {
        const { error: erroFoto } = await supabase
          .from("produto_fotos")
          .insert({ produto_id: data.id, url: caminho, ordem: indice });
        if (erroFoto) console.warn("fotografia não associada ao anúncio", erroFoto);
      }
      if (envio.falhas.length) console.warn("fotografias por carregar", envio.falhas);
      return envio;
    },
    onSuccess: (envio) => {
      void queryClient.invalidateQueries({ queryKey: ["meus-produtos", user?.id] });
      void recarregarPerfil();
      onDone(mensagemDePublicacao(envio));
    },
    onError: (erro) => {
      console.error("publicação do anúncio falhou", erro);
      setErro(mensagemDeErro(erro, "Não foi possível publicar o anúncio. Tenta de novo."));
    },
  });

  return (
    <ModalShell title="Publicar produto" onClose={onClose}>
      <form
        className="mt-5 space-y-4"
        onSubmit={(evento) => {
          evento.preventDefault();
          setErro(null);
          publicar.mutate();
        }}
      >
        <label className="block text-sm font-semibold">
          Nome do produto
          <input
            required
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
            placeholder="Ex.: Auscultadores Bluetooth ou Milho branco"
            className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal"
          />
        </label>
        <label className="block text-sm font-semibold">
          Descrição
          <textarea
            value={descricao}
            onChange={(evento) => setDescricao(evento.target.value)}
            rows={3}
            placeholder="Características, estado, garantia, prazo de entrega..."
            className="mt-2 w-full rounded-lg border border-border bg-card p-3 font-normal"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">
            Preço (MZN)
            <input
              required
              type="number"
              min="1"
              value={preco}
              onChange={(evento) => setPreco(evento.target.value)}
              placeholder="0"
              className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal"
            />
          </label>
          <label className="block text-sm font-semibold">
            Unidade
            <select
              value={unidade}
              onChange={(evento) => setUnidade(evento.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal"
            >
              <option>unidade</option>
              <option>par</option>
              <option>conjunto</option>
              <option>kg</option>
              <option>saco</option>
              <option>molho</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">
            Preço antigo (opcional)
            <input
              type="number"
              min="0"
              value={precoAntigo}
              onChange={(evento) => setPrecoAntigo(evento.target.value)}
              placeholder="Mostra desconto"
              className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal"
            />
          </label>
          <label className="block text-sm font-semibold">
            Marca (opcional)
            <input
              value={marca}
              onChange={(evento) => setMarca(evento.target.value)}
              placeholder="Ex.: Samsung"
              className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">
            Stock disponível
            <input
              required
              type="number"
              min="0"
              value={stock}
              onChange={(evento) => {
                setStock(evento.target.value);
                setQuantidade(evento.target.value);
              }}
              placeholder="Ex.: 50"
              className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal"
            />
          </label>
          <label className="block text-sm font-semibold">
            Categoria
            <select
              required
              value={categoriaId}
              onChange={(evento) => setCategoriaId(evento.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal"
            >
              <option value="">Escolher</option>
              {(categorias.data ?? [])
                .filter((item) => item.ativo)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            Província
            <select
              required
              value={provincia}
              onChange={(evento) => {
                setProvincia(evento.target.value);
                setDistrito("");
              }}
              className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal"
            >
              <option value="">Escolher província</option>
              {provinceNames.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Cidade ou distrito
            <select
              required
              disabled={!cidades.length}
              value={distrito}
              onChange={(evento) => setDistrito(evento.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal disabled:opacity-60"
            >
              <option value="">Escolher cidade</option>
              {cidades.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm font-semibold">
          Fotografias do produto (até 5)
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(evento) => setFotos(Array.from(evento.target.files ?? []).slice(0, 5))}
            className="mt-2 w-full rounded-lg border border-border bg-card p-2 text-xs font-normal"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={envioGratis}
              onChange={(evento) => setEnvioGratis(evento.target.checked)}
              className="size-4"
            />
            Entrega grátis
          </label>
          {!envioGratis && (
            <label className="block text-sm font-semibold">
              Custo de entrega (MZN)
              <input
                type="number"
                min="0"
                value={custoEnvio}
                onChange={(evento) => setCustoEnvio(evento.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal"
              />
            </label>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={negociavel}
            onChange={(evento) => setNegociavel(evento.target.checked)}
            className="size-4"
          />
          Preço negociável
        </label>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <p className="text-xs text-muted-foreground">
          O anúncio será revisto antes de aparecer no mercado.
        </p>
        <AppButton type="submit" className="w-full" disabled={publicar.isPending}>
          <PackagePlus className="size-4" /> Enviar para revisão
        </AppButton>
      </form>
    </ModalShell>
  );
}
