import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, Heart, MapPin, MessageCircle, PackagePlus, Star } from "lucide-react";
import { useState } from "react";

import { AppButton, Estrelas, ModalShell, ProdutoFoto } from "@/components/machamba/ui";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { enviarFoto } from "@/lib/fotos";
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
            {produto.quantidade ? `${produto.quantidade} ${produto.unidade} disponíveis` : "Disponibilidade a combinar"}
            {produto.negociavel ? " · preço negociável" : ""}
          </p>
        </div>
        <strong className="shrink-0 font-display text-xl">
          {produto.preco} <small className="font-sans text-xs text-muted-foreground">MZN/{produto.unidade}</small>
        </strong>
      </div>

      {produto.descricao && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{produto.descricao}</p>}

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
        <AppButton variant="plain" onClick={() => (user ? setAvaliar(true) : pedirEntrada())} disabled={!posso.data}>
          <Star className="size-4" /> Avaliar vendedor
        </AppButton>
        <AppButton variant="plain" onClick={() => (user ? setDenunciar(true) : pedirEntrada())}>
          <Flag className="size-4" /> Denunciar
        </AppButton>
      </div>
      {user && posso.data === false && user.id !== produto.vendedorId && (
        <p className="mt-2 text-xs text-muted-foreground">Só podes avaliar depois de teres conversado com este vendedor.</p>
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

function AvaliarModal({ vendedorId, onClose, onDone }: { vendedorId: string; onClose: () => void; onDone: () => void }) {
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
          <button key={valor} onClick={() => setEstrelas(valor)} aria-label={`${valor} estrelas`} className="p-1">
            <Star className={`size-7 ${valor <= estrelas ? "fill-accent text-accent" : "text-muted-foreground"}`} />
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
      <AppButton className="mt-4 w-full" disabled={guardar.isPending} onClick={() => guardar.mutate()}>
        Enviar avaliação
      </AppButton>
    </ModalShell>
  );
}

function DenunciarModal({ produtoId, onClose, onDone }: { produtoId: string; onClose: () => void; onDone: () => void }) {
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
      <AppButton className="mt-4 w-full" disabled={guardar.isPending} onClick={() => guardar.mutate()}>
        Enviar denúncia
      </AppButton>
    </ModalShell>
  );
}

export function FilterModal({
  categoria,
  provincia,
  cidade,
  categorias,
  onCategoria,
  onProvincia,
  onCidade,
  onClose,
}: {
  categoria: string;
  provincia: string;
  cidade: string;
  categorias: string[];
  onCategoria: (valor: string) => void;
  onProvincia: (valor: string) => void;
  onCidade: (valor: string) => void;
  onClose: () => void;
}) {
  const cidades = citiesOf(provincia);
  return (
    <ModalShell title="Filtrar mercado" onClose={onClose}>
      <div className="mt-5 space-y-4">
        <label className="block text-sm font-semibold">
          Categoria
          <select
            value={categoria}
            onChange={(evento) => onCategoria(evento.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal"
          >
            <option>Todos</option>
            {categorias.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Província
          <select
            value={provincia}
            onChange={(evento) => onProvincia(evento.target.value)}
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
            disabled={!cidades.length}
            onChange={(evento) => onCidade(evento.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal disabled:opacity-60"
          >
            <option>Todas</option>
            {cidades.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          {!cidades.length && (
            <small className="mt-1 block text-xs font-normal text-muted-foreground">Escolhe primeiro uma província.</small>
          )}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <AppButton
            variant="outline"
            onClick={() => {
              onCategoria("Todos");
              onProvincia("Todas");
              onCidade("Todas");
            }}
          >
            Limpar
          </AppButton>
          <AppButton onClick={onClose}>Aplicar filtros</AppButton>
        </div>
      </div>
    </ModalShell>
  );
}

export function SellModal({ onClose, onDone }: { onClose: () => void; onDone: (mensagem: string) => void }) {
  const { user, perfil } = useAuth();
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
  const [foto, setFoto] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const cidades = citiesOf(provincia);

  const publicar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .insert({
          titulo,
          descricao: descricao || null,
          preco: Number(preco),
          unidade,
          quantidade: quantidade ? Number(quantidade) : null,
          negociavel,
          categoria_id: categoriaId || null,
          vendedor_id: user!.id,
          provincia: provincia || null,
          distrito: distrito || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (foto) {
        const caminho = await enviarFoto("produtos", user!.id, foto);
        await supabase.from("produto_fotos").insert({ produto_id: data.id, url: caminho, ordem: 0 });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["meus-produtos", user?.id] });
      onDone("Anúncio enviado para revisão");
    },
    onError: () => setErro("Não foi possível publicar o anúncio. Tenta de novo."),
  });

  return (
    <ModalShell title="Publicar anúncio" onClose={onClose}>
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
            placeholder="Ex.: Milho branco"
            className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal"
          />
        </label>
        <label className="block text-sm font-semibold">
          Descrição
          <textarea
            value={descricao}
            onChange={(evento) => setDescricao(evento.target.value)}
            rows={3}
            placeholder="Estado do produto, colheita, entrega..."
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
              <option>kg</option>
              <option>saco</option>
              <option>unidade</option>
              <option>molho</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">
            Quantidade
            <input
              type="number"
              min="0"
              value={quantidade}
              onChange={(evento) => setQuantidade(evento.target.value)}
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
          Fotografia do produto
          <input
            type="file"
            accept="image/*"
            onChange={(evento) => setFoto(evento.target.files?.[0] ?? null)}
            className="mt-2 w-full rounded-lg border border-border bg-card p-2 text-xs font-normal"
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={negociavel} onChange={(evento) => setNegociavel(evento.target.checked)} className="size-4" />
          Preço negociável
        </label>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <p className="text-xs text-muted-foreground">O anúncio será revisto antes de aparecer no mercado.</p>
        <AppButton type="submit" className="w-full" disabled={publicar.isPending}>
          <PackagePlus className="size-4" /> Enviar para revisão
        </AppButton>
      </form>
    </ModalShell>
  );
}
