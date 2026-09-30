import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Apple,
  Baby,
  Car,
  Camera,
  ChevronRight,
  Dumbbell,
  Flame,
  Laptop,
  Leaf,
  Plug,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sofa,
  Sparkles,
  Sprout,
  Store,
  Tag,
  Truck,
  Wheat,
  WifiOff,
  Wrench,
  FlaskConical,
  SprayCan,
  ShieldCheck,
  Smile,
} from "lucide-react";
import { useMemo } from "react";

import { AppShell } from "@/components/loja/layout";
import { GrelhaProdutos } from "@/components/loja/produto-card";
import { Empty } from "@/components/machamba/ui";
import { listarCategorias, listarProdutos, type Categoria } from "@/lib/machamba";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Machamba Digital — Loja online de Moçambique" },
      {
        name: "description",
        content:
          "Telemóveis, moda, casa, electrónica e produtos da machamba. Paga com M-Pesa ou e-Mola e recebe em qualquer província.",
      },
      { property: "og:title", content: "Machamba Digital — Loja online de Moçambique" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PaginaInicial,
});

const ICONES: Record<string, typeof Leaf> = {
  leaf: Leaf,
  sprout: Sprout,
  apple: Apple,
  wheat: Wheat,
  wrench: Wrench,
  "flask-conical": FlaskConical,
  "spray-can": SprayCan,
  smartphone: Smartphone,
  plug: Plug,
  shirt: Shirt,
  sofa: Sofa,
  sparkles: Sparkles,
  baby: Baby,
  dumbbell: Dumbbell,
  car: Car,
  "shopping-basket": ShoppingBasket,
  laptop: Laptop,
};

export function IconeCategoria({
  categoria,
  className = "size-5",
}: {
  categoria: Categoria;
  className?: string;
}) {
  const Icone = ICONES[categoria.icone ?? ""] ?? Tag;
  return <Icone className={className} />;
}

function PaginaInicial() {
  const produtos = useQuery({ queryKey: ["produtos"], queryFn: listarProdutos });
  const categorias = useQuery({ queryKey: ["categorias"], queryFn: listarCategorias });

  const lista = useMemo(() => produtos.data ?? [], [produtos.data]);
  const promocoes = useMemo(
    () =>
      lista
        .filter((produto) => produto.precoAntigo && produto.precoAntigo > produto.preco)
        .slice(0, 10),
    [lista],
  );
  const maisVendidos = useMemo(
    () =>
      [...lista]
        .sort((a, b) => b.vendas - a.vendas)
        .filter((produto) => produto.vendas > 0)
        .slice(0, 10),
    [lista],
  );
  const recentes = useMemo(() => lista.slice(0, 30), [lista]);

  return (
    <AppShell>
      {/* Banner principal */}
      <section className="relative overflow-hidden rounded-2xl bg-primary px-5 py-7 text-primary-foreground sm:px-8 sm:py-10">
        <div className="relative z-10 max-w-lg">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
            <Flame className="size-3.5" /> Compra tudo. Paga no telemóvel.
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
            A loja de Moçambique, da machamba à electrónica.
          </h1>
          <p className="mt-2 text-sm text-primary-foreground/85 sm:text-base">
            Milhares de produtos de vendedores em todo o país. Pagamento com M-Pesa ou e-Mola e
            entrega na tua província.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/pesquisa"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-bold text-accent-foreground"
            >
              Ver produtos <ChevronRight className="size-4" />
            </Link>
            <Link
              to="/vender"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary-foreground/40 px-5 text-sm font-semibold"
            >
              <Store className="size-4" /> Vender na loja
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 size-56 rounded-full bg-accent/25 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-24 size-48 rounded-full bg-primary-foreground/10 blur-2xl" />
      </section>

      {/* Garantias */}
      <section className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold sm:text-xs">
        <div className="rounded-xl border border-border bg-card p-3">
          <Smartphone className="mx-auto size-5 text-destructive" />
          <p className="mt-1">M-Pesa e e-Mola</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <Truck className="mx-auto size-5 text-primary" />
          <p className="mt-1">Entrega em todo o país</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <ShieldCheck className="mx-auto size-5 text-accent" />
          <p className="mt-1">Vendedores verificados</p>
        </div>
      </section>

      {/* Categorias */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Categorias</h2>
          <Link to="/pesquisa" className="text-xs font-semibold text-primary">
            Ver todas
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-9">
          {(categorias.data ?? [])
            .filter((categoria) => categoria.ativo)
            .map((categoria) => (
              <Link
                key={categoria.id}
                to="/pesquisa"
                search={{ categoria: categoria.slug }}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center text-[11px] font-semibold hover:border-primary"
              >
                <span
                  className="grid size-10 place-items-center rounded-full text-white"
                  style={{ background: categoria.cor ?? "var(--primary)" }}
                >
                  <IconeCategoria categoria={categoria} />
                </span>
                <span className="line-clamp-2 leading-tight">{categoria.nome}</span>
              </Link>
            ))}
        </div>
      </section>

      {/* Promoções */}
      {promocoes.length > 0 && (
        <section className="mt-7">
          <div className="mb-3 flex items-center gap-2">
            <Flame className="size-5 text-destructive" />
            <h2 className="font-display text-lg font-bold">Promoções</h2>
          </div>
          <GrelhaProdutos produtos={promocoes} />
        </section>
      )}

      {/* Mais vendidos */}
      {maisVendidos.length > 0 && (
        <section className="mt-7">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="size-5 text-accent" />
            <h2 className="font-display text-lg font-bold">Mais vendidos</h2>
          </div>
          <GrelhaProdutos produtos={maisVendidos} />
        </section>
      )}

      {/* Recomendados */}
      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Para ti</h2>
          <Link to="/pesquisa" className="text-xs font-semibold text-primary">
            Ver mais
          </Link>
        </div>
        {produtos.isLoading ? (
          <GrelhaProdutos produtos={[]} carregando />
        ) : produtos.isError ? (
          <Empty
            icon={<WifiOff className="size-7" />}
            title="Sem ligação à loja"
            text="Verifica a tua internet e tenta novamente."
            action="Tentar de novo"
            onAction={() => void produtos.refetch()}
          />
        ) : recentes.length ? (
          <GrelhaProdutos produtos={recentes} />
        ) : (
          <Empty
            icon={<Smile className="size-7" />}
            title="A loja está a começar"
            text="Ainda não há produtos activos. Sê o primeiro a vender — publica um produto em minutos."
          />
        )}
      </section>

      {/* Atalhos agrícolas mantidos */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link
          to="/diagnostico"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary"
        >
          <span className="grid size-11 place-items-center rounded-lg bg-secondary text-primary">
            <Camera className="size-5" />
          </span>
          <span>
            <strong className="block text-sm">Diagnóstico da cultura por fotografia</strong>
            <span className="text-xs text-muted-foreground">
              Orientação para agricultores, com sugestões de produtos reais.
            </span>
          </span>
          <ChevronRight className="ml-auto size-4 text-muted-foreground" />
        </Link>
        <Link
          to="/aprender"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary"
        >
          <span className="grid size-11 place-items-center rounded-lg bg-secondary text-primary">
            <Leaf className="size-5" />
          </span>
          <span>
            <strong className="block text-sm">Aprender</strong>
            <span className="text-xs text-muted-foreground">
              Guias e artigos para vender melhor e cultivar melhor.
            </span>
          </span>
          <ChevronRight className="ml-auto size-4 text-muted-foreground" />
        </Link>
      </section>
    </AppShell>
  );
}
