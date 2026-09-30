import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CircleUserRound,
  Home,
  LayoutGrid,
  Package,
  Search,
  ShoppingCart,
  Store,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { useAuth } from "@/lib/auth";
import { useCarrinho } from "@/lib/carrinho";

export function AppShell({ children, pesquisa = "" }: { children: ReactNode; pesquisa?: string }) {
  const { user } = useAuth();
  const { quantidadeTotal } = useCarrinho();
  const navigate = useNavigate();
  const caminho = useRouterState({ select: (estado) => estado.location.pathname });
  const [termo, setTermo] = useState(pesquisa);

  useEffect(() => setTermo(pesquisa), [pesquisa]);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  const procurar = (evento: React.FormEvent) => {
    evento.preventDefault();
    void navigate({ to: "/pesquisa", search: { q: termo.trim() || undefined } });
  };

  const abas = [
    { to: "/", rotulo: "Início", Icone: Home },
    { to: "/pesquisa", rotulo: "Categorias", Icone: LayoutGrid },
    { to: "/carrinho", rotulo: "Carrinho", Icone: ShoppingCart, badge: quantidadeTotal },
    { to: "/pedidos", rotulo: "Encomendas", Icone: Package },
    { to: "/conta", rotulo: "Conta", Icone: CircleUserRound },
  ] as const;

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground md:pb-10">
      <header className="sticky top-0 z-30 border-b border-primary/10 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2"
            aria-label="Machamba Digital — início"
          >
            <span className="grid size-10 place-items-center rounded-lg bg-primary font-display text-lg font-bold text-primary-foreground">
              M
            </span>
            <span className="hidden sm:block">
              <strong className="block font-display text-base leading-none">Machamba</strong>
              <span className="text-xs text-muted-foreground">Digital · Loja</span>
            </span>
          </Link>

          <form onSubmit={procurar} className="relative flex-1" role="search">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={termo}
              onChange={(evento) => setTermo(evento.target.value)}
              placeholder="Pesquisar telemóveis, moda, casa, produtos da machamba…"
              aria-label="Pesquisar produtos"
              className="h-11 w-full rounded-full border border-border bg-card pl-10 pr-20 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            <button
              type="submit"
              className="absolute right-1 top-1/2 h-9 -translate-y-1/2 rounded-full bg-accent px-4 text-xs font-bold text-accent-foreground"
            >
              Procurar
            </button>
          </form>

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              to="/vender"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold hover:bg-muted"
            >
              <Store className="size-4" /> Vender
            </Link>
            <Link
              to="/pedidos"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold hover:bg-muted"
            >
              <Package className="size-4" /> Encomendas
            </Link>
            <Link
              to="/conta"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold hover:bg-muted"
            >
              <CircleUserRound className="size-4" /> {user ? "Conta" : "Entrar"}
            </Link>
          </nav>

          <Link
            to="/carrinho"
            aria-label="Carrinho"
            className="relative grid size-11 shrink-0 place-items-center rounded-lg hover:bg-muted"
          >
            <ShoppingCart className="size-5" />
            {quantidadeTotal > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {quantidadeTotal > 99 ? "99+" : quantidadeTotal}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>

      <footer className="mx-auto mt-10 hidden max-w-6xl px-4 pb-6 text-xs text-muted-foreground md:block">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <span>
            © {new Date().getFullYear()} Machamba Digital · Compra e vende em todo Moçambique.
          </span>
          <span className="flex items-center gap-3">
            <span className="rounded-md bg-destructive/10 px-2 py-1 font-bold text-destructive">
              M-Pesa
            </span>
            <span className="rounded-md bg-accent/20 px-2 py-1 font-bold text-accent-foreground">
              e-Mola
            </span>
            <span>Pagamentos seguros no telemóvel</span>
          </span>
        </div>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/98 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_color-mix(in_oklab,var(--foreground)_8%,transparent)] md:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 px-1">
          {abas.map(({ to, rotulo, Icone, ...resto }) => {
            const ativo = to === "/" ? caminho === "/" : caminho.startsWith(to);
            const badge = "badge" in resto ? resto.badge : 0;
            return (
              <Link
                key={to}
                to={to}
                className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${ativo ? "text-primary" : "text-muted-foreground"}`}
              >
                <Icone className="size-5" />
                <span>{rotulo}</span>
                {badge > 0 && (
                  <span className="absolute right-3 top-2 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function Titulo({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">{children}</h1>
      {acao}
    </div>
  );
}

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${className}`}
    >
      {children}
    </span>
  );
}
