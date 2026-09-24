import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  Camera,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  PackagePlus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DiagnosisView } from "@/components/machamba/diagnostico";
import { MessagesView } from "@/components/machamba/mensagens";
import { FilterModal, ProductModal, SellModal } from "@/components/machamba/modais";
import { ProfileView } from "@/components/machamba/perfil";
import { AppButton, Empty, ProductCard } from "@/components/machamba/ui";
import { useAuth } from "@/lib/auth";
import {
  alternarFavorito,
  listarArtigos,
  listarCategorias,
  listarFavoritos,
  listarProdutos,
  type Produto,
} from "@/lib/machamba";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Machamba Digital — Mercado agrícola de Moçambique" },
      {
        name: "description",
        content: "Compra, vende e encontra produtos agrícolas perto de ti. Avalia também a tua cultura por fotografia.",
      },
      { property: "og:title", content: "Machamba Digital — Mercado agrícola de Moçambique" },
      { property: "og:description", content: "Produtos da machamba, equipamentos e orientação para culturas num só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MachambaApp,
});

type Tab = "mercado" | "diagnostico" | "favoritos" | "mensagens" | "aprender" | "perfil";

const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "mercado", label: "Mercado", icon: Home },
  { id: "diagnostico", label: "Diagnóstico", icon: Camera },
  { id: "favoritos", label: "Favoritos", icon: Heart },
  { id: "mensagens", label: "Mensagens", icon: MessageCircle },
  { id: "aprender", label: "Aprender", icon: BookOpen },
  { id: "perfil", label: "Perfil", icon: CircleUserRound },
];

function MachambaApp() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("mercado");
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState("Todos");
  const [provincia, setProvincia] = useState("Todas");
  const [cidade, setCidade] = useState("Todas");
  const [selecionado, setSelecionado] = useState<Produto | null>(null);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [venderAberto, setVenderAberto] = useState(false);
  const [conversaAberta, setConversaAberta] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const produtos = useQuery({ queryKey: ["produtos"], queryFn: listarProdutos });
  const categorias = useQuery({ queryKey: ["categorias"], queryFn: listarCategorias });
  const favoritos = useQuery({
    queryKey: ["favoritos", user?.id],
    queryFn: () => listarFavoritos(user!.id),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const showNotice = (mensagem: string) => setNotice(mensagem);
  const pedirEntrada = () => showNotice("Entra na tua conta para continuar");

  const guardados = favoritos.data?.ids ?? [];

  const alternar = useMutation({
    mutationFn: async (produtoId: string) => alternarFavorito(user!.id, produtoId, guardados.includes(produtoId)),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["favoritos", user?.id] }),
  });

  const toggleFavorito = (produtoId: string) => {
    if (!user) {
      pedirEntrada();
      return;
    }
    alternar.mutate(produtoId);
  };

  const visiveis = useMemo(() => {
    const lista = produtos.data ?? [];
    const termo = query.trim().toLowerCase();
    return lista.filter((produto) => {
      const combinaTermo =
        !termo || produto.titulo.toLowerCase().includes(termo) || produto.vendedorNome.toLowerCase().includes(termo);
      const combinaCategoria = categoria === "Todos" || produto.categoria === categoria;
      const combinaProvincia = provincia === "Todas" || produto.provincia === provincia;
      const combinaCidade = cidade === "Todas" || produto.distrito === cidade;
      return combinaTermo && combinaCategoria && combinaProvincia && combinaCidade;
    });
  }, [produtos.data, query, categoria, provincia, cidade]);

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <header className="sticky top-0 z-30 border-b border-primary/10 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between">
            <button className="flex items-center gap-2.5 text-left" onClick={() => setTab("mercado")} aria-label="Ir ao mercado">
              <span className="grid size-10 place-items-center rounded-lg bg-primary font-display text-lg font-bold text-primary-foreground">
                M
              </span>
              <span>
                <strong className="block font-display text-base leading-none">Machamba</strong>
                <span className="text-xs text-muted-foreground">Digital</span>
              </span>
            </button>
            <div className="flex items-center gap-2">
              <AppButton
                variant="soft"
                className="min-h-9 max-w-[45vw] rounded-full px-3 text-xs"
                onClick={() => setFiltrosAbertos(true)}
              >
                <MapPin className="size-3.5 shrink-0 text-accent" />
                <span className="truncate">{cidade !== "Todas" ? cidade : provincia !== "Todas" ? provincia : "Todo o país"}</span>
              </AppButton>
              {!user && (
                <Link
                  to="/auth"
                  className="inline-flex min-h-9 items-center rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground"
                >
                  Entrar
                </Link>
              )}
            </div>
          </div>
          <div className="mt-3 flex gap-2 md:max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(evento) => setQuery(evento.target.value)}
                placeholder="O que procuras hoje?"
                className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <AppButton variant="outline" className="size-11 px-0" ariaLabel="Abrir filtros" onClick={() => setFiltrosAbertos(true)}>
              <SlidersHorizontal className="size-4" />
            </AppButton>
            <AppButton className="hidden md:inline-flex" onClick={() => (user ? setVenderAberto(true) : pedirEntrada())}>
              <PackagePlus className="size-4" /> Vender
            </AppButton>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        {tab === "mercado" && (
          <MarketView
            produtos={visiveis}
            carregando={produtos.isLoading}
            categoria={categoria}
            categorias={(categorias.data ?? []).filter((item) => item.ativo).map((item) => item.nome)}
            setCategoria={setCategoria}
            favoritos={guardados}
            toggleFavorito={toggleFavorito}
            setSelecionado={setSelecionado}
            setTab={setTab}
            abrirVenda={() => (user ? setVenderAberto(true) : pedirEntrada())}
          />
        )}
        {tab === "diagnostico" && <DiagnosisView showNotice={showNotice} pedirEntrada={pedirEntrada} />}
        {tab === "favoritos" && (
          <FavoritesView
            produtos={favoritos.data?.produtos ?? []}
            autenticado={Boolean(user)}
            toggleFavorito={toggleFavorito}
            setSelecionado={setSelecionado}
            setTab={setTab}
          />
        )}
        {tab === "mensagens" && (
          <MessagesView conversaAberta={conversaAberta} abrirConversaId={setConversaAberta} pedirEntrada={pedirEntrada} />
        )}
        {tab === "aprender" && <LearnView />}
        {tab === "perfil" && <ProfileView showNotice={showNotice} pedirEntrada={pedirEntrada} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/98 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_color-mix(in_oklab,var(--foreground)_8%,transparent)]">
        <div className="mx-auto grid max-w-xl grid-cols-6 px-1">
          {tabs.map((item) => {
            const Icon = item.icon;
            const ativo = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-[9px] font-semibold ${ativo ? "text-primary" : "text-muted-foreground"}`}
              >
                <Icon className={`size-5 ${ativo ? "fill-primary/10" : ""}`} />
                <span className="max-w-full truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {selecionado && (
        <ProductModal
          produto={selecionado}
          favorito={guardados.includes(selecionado.id)}
          onFavorite={() => toggleFavorito(selecionado.id)}
          onClose={() => setSelecionado(null)}
          showNotice={showNotice}
          pedirEntrada={pedirEntrada}
          onConversa={(conversaId) => {
            setConversaAberta(conversaId);
            setTab("mensagens");
          }}
        />
      )}
      {filtrosAbertos && (
        <FilterModal
          categoria={categoria}
          provincia={provincia}
          cidade={cidade}
          categorias={(categorias.data ?? []).filter((item) => item.ativo).map((item) => item.nome)}
          onCategoria={setCategoria}
          onProvincia={(valor) => {
            setProvincia(valor);
            setCidade("Todas");
          }}
          onCidade={setCidade}
          onClose={() => setFiltrosAbertos(false)}
        />
      )}
      {venderAberto && (
        <SellModal
          onClose={() => setVenderAberto(false)}
          onDone={(mensagem) => {
            setVenderAberto(false);
            showNotice(mensagem);
          }}
        />
      )}
      {notice && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-lg bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-lg"
        >
          <ShieldCheck className="size-4" />
          {notice}
        </div>
      )}
    </div>
  );
}

function MarketView({
  produtos,
  carregando,
  categoria,
  categorias,
  setCategoria,
  favoritos,
  toggleFavorito,
  setSelecionado,
  setTab,
  abrirVenda,
}: {
  produtos: Produto[];
  carregando: boolean;
  categoria: string;
  categorias: string[];
  setCategoria: (valor: string) => void;
  favoritos: string[];
  toggleFavorito: (id: string) => void;
  setSelecionado: (produto: Produto) => void;
  setTab: (tab: Tab) => void;
  abrirVenda: () => void;
}) {
  const hoje = new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });
  const destaque = produtos.find((produto) => produto.destaque) ?? produtos[0] ?? null;

  return (
    <div className="animate-enter">
      <section className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold capitalize text-primary">{hoje}</p>
          <h1 className="mt-1 font-display text-3xl font-bold">Machamba de hoje</h1>
        </div>
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <WifiOff className="size-3.5" /> Preparado para ligação fraca
        </span>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
        <div className="relative overflow-hidden rounded-lg bg-primary p-5 text-primary-foreground sm:p-7">
          <span className="text-xs font-bold uppercase text-accent">Oferta do dia</span>
          {destaque ? (
            <>
              <h2 className="mt-1 font-display text-2xl font-bold">{destaque.titulo}</h2>
              <div className="mt-6 flex items-end justify-between">
                <div>
                  <strong className="font-display text-4xl">{destaque.preco}</strong>
                  <span className="text-sm opacity-75"> MZN / {destaque.unidade}</span>
                </div>
                <div className="text-right text-xs opacity-80">
                  <strong className="block text-sm opacity-100">{destaque.vendedorNome}</strong>
                  {destaque.distrito ?? destaque.provincia ?? "Moçambique"}
                </div>
              </div>
              <AppButton variant="soft" className="mt-5 w-full bg-background text-primary" onClick={() => setSelecionado(destaque)}>
                Ver produto <ChevronRight className="size-4" />
              </AppButton>
            </>
          ) : (
            <>
              <h2 className="mt-1 font-display text-2xl font-bold">Ainda sem anúncios</h2>
              <p className="mt-2 text-sm opacity-80">Sê o primeiro a publicar um produto da tua machamba.</p>
              <AppButton variant="soft" className="mt-5 w-full bg-background text-primary" onClick={abrirVenda}>
                Publicar anúncio <ChevronRight className="size-4" />
              </AppButton>
            </>
          )}
        </div>
        <button
          onClick={() => setTab("diagnostico")}
          className="flex min-h-36 items-center gap-4 rounded-lg border border-accent/40 bg-accent/10 p-5 text-left transition-colors hover:bg-accent/15"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
            <Sparkles className="size-6" />
          </span>
          <span>
            <strong className="font-display text-lg">Avaliar a minha cultura</strong>
            <small className="mt-1 block text-muted-foreground">Tira uma fotografia e recebe orientação.</small>
          </span>
          <ChevronRight className="ml-auto size-5" />
        </button>
      </section>

      <section className="mt-7">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Produtos perto de ti</h2>
          <button onClick={() => setCategoria("Todos")} className="text-xs font-semibold text-primary">
            Ver tudo
          </button>
        </div>
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2">
          {["Todos", ...categorias].map((item) => (
            <button
              key={item}
              onClick={() => setCategoria(item)}
              className={`min-h-10 shrink-0 rounded-full border px-4 text-xs font-semibold ${categoria === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}
            >
              {item}
            </button>
          ))}
        </div>
        {carregando ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">A carregar produtos...</p>
        ) : produtos.length ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {produtos.map((produto) => (
              <ProductCard
                key={produto.id}
                produto={produto}
                favorito={favoritos.includes(produto.id)}
                onFavorite={() => toggleFavorito(produto.id)}
                onOpen={() => setSelecionado(produto)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 border-y border-border py-12 text-center">
            <Search className="mx-auto size-7 text-muted-foreground" />
            <h3 className="mt-3 font-display font-semibold">Nenhum produto encontrado</h3>
            <p className="mt-1 text-sm text-muted-foreground">Experimenta outra pesquisa ou categoria.</p>
          </div>
        )}
      </section>

      <section className="mt-7 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-accent/35 bg-accent/10 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-accent" />
            <h2 className="font-display font-semibold">Compra com confiança</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Confirma o produto antes de pagar e encontra-te num local seguro.</p>
        </div>
        <AppButton className="min-h-24 justify-between text-left" onClick={abrirVenda}>
          <span>
            <span className="block font-display text-lg">Vender na minha banca</span>
            <span className="block text-xs font-normal opacity-75">Publica produtos e equipamentos</span>
          </span>
          <PackagePlus className="size-6" />
        </AppButton>
      </section>
    </div>
  );
}

function FavoritesView({
  produtos,
  autenticado,
  toggleFavorito,
  setSelecionado,
  setTab,
}: {
  produtos: Produto[];
  autenticado: boolean;
  toggleFavorito: (id: string) => void;
  setSelecionado: (produto: Produto) => void;
  setTab: (tab: Tab) => void;
}) {
  return (
    <section className="animate-enter">
      <h1 className="font-display text-3xl font-bold">Favoritos</h1>
      <p className="mt-1 text-sm text-muted-foreground">Produtos que guardaste para ver depois.</p>
      {!autenticado ? (
        <Empty
          icon={<Heart className="size-7" />}
          title="Entra para guardar produtos"
          text="Com conta, os teus favoritos ficam guardados em qualquer telemóvel."
          action="Explorar mercado"
          onAction={() => setTab("mercado")}
        />
      ) : produtos.length ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {produtos.map((produto) => (
            <ProductCard
              key={produto.id}
              produto={produto}
              favorito
              onFavorite={() => toggleFavorito(produto.id)}
              onOpen={() => setSelecionado(produto)}
            />
          ))}
        </div>
      ) : (
        <Empty
          icon={<Heart className="size-7" />}
          title="Ainda não guardaste produtos"
          text="Toca no coração de um anúncio para encontrá-lo aqui."
          action="Explorar mercado"
          onAction={() => setTab("mercado")}
        />
      )}
    </section>
  );
}

function LearnView() {
  const artigos = useQuery({ queryKey: ["artigos"], queryFn: listarArtigos });
  return (
    <section className="animate-enter">
      <h1 className="font-display text-3xl font-bold">Aprender</h1>
      <p className="mt-1 text-sm text-muted-foreground">Conselhos práticos para a tua produção.</p>
      {artigos.data?.length ? (
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {artigos.data.map((artigo) => (
            <article key={artigo.id} className="rounded-lg border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold leading-tight">{artigo.titulo}</h2>
              {artigo.resumo && <p className="mt-2 text-sm text-muted-foreground">{artigo.resumo}</p>}
              <p className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" /> {new Date(artigo.criado_em).toLocaleDateString("pt-PT")}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          icon={<BookOpen className="size-7" />}
          title="Ainda não há conselhos publicados"
          text="Assim que a equipa publicar conselhos, eles aparecem aqui."
        />
      )}
    </section>
  );
}
