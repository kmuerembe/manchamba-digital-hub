import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type AbaAdmin =
  "resumo" | "produtos" | "encomendas" | "utilizadores" | "categorias" | "denuncias" | "artigos";

export type AbaDefinicao = {
  chave: AbaAdmin;
  rotulo: string;
  Icone: LucideIcon;
  badge?: number | undefined;
};

/** Cartão de número grande usado no resumo. */
export function Kpi({
  rotulo,
  valor,
  nota,
  Icone,
  tom = "text-primary",
}: {
  rotulo: string;
  valor: string | number;
  nota?: string;
  Icone: LucideIcon;
  tom?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <Icone className={`size-4 ${tom}`} />
      <p className="mt-1 text-[11px] text-muted-foreground">{rotulo}</p>
      <strong className="font-display text-lg leading-tight">{valor}</strong>
      {nota && <p className="mt-0.5 text-[11px] text-muted-foreground">{nota}</p>}
    </div>
  );
}

export function Abas({
  abas,
  ativa,
  onMudar,
}: {
  abas: AbaDefinicao[];
  ativa: AbaAdmin;
  onMudar: (aba: AbaAdmin) => void;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex w-max gap-1 border-b border-border">
        {abas.map(({ chave, rotulo, Icone, badge }) => {
          const selecionada = chave === ativa;
          return (
            <button
              key={chave}
              type="button"
              onClick={() => onMudar(chave)}
              aria-current={selecionada ? "page" : undefined}
              className={`-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                selecionada
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icone className="size-4" />
              {rotulo}
              {Boolean(badge) && (
                <span className="grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {badge! > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Filtros<T extends string>({
  opcoes,
  valor,
  onMudar,
  contagens,
}: {
  opcoes: readonly { chave: T; rotulo: string }[];
  valor: T;
  onMudar: (chave: T) => void;
  contagens?: Partial<Record<T, number>>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opcoes.map(({ chave, rotulo }) => {
        const ativa = chave === valor;
        const total = contagens?.[chave];
        return (
          <button
            key={chave}
            type="button"
            onClick={() => onMudar(chave)}
            className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-colors ${
              ativa
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground"
            }`}
          >
            {rotulo}
            {total !== undefined && <span className="opacity-70">({total})</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Etiqueta({
  children,
  tom = "bg-secondary text-muted-foreground",
}: {
  children: ReactNode;
  tom?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${tom}`}
    >
      {children}
    </span>
  );
}

export function Bloco({
  titulo,
  descricao,
  acao,
  children,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold">{titulo}</h2>
          {descricao && <p className="text-xs text-muted-foreground">{descricao}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function Esqueleto({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: linhas }, (_, indice) => (
        <div key={indice} className="h-20 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

export function Aviso({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      {children}
    </p>
  );
}

/** Botão compacto de ação em linhas de lista. */
export function AcaoRapida({
  children,
  onClick,
  tom = "border-border bg-card hover:border-primary",
  desativado,
  titulo,
}: {
  children: ReactNode;
  onClick: () => void;
  tom?: string;
  desativado?: boolean;
  titulo?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desativado}
      title={titulo}
      className={`inline-flex min-h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition-colors disabled:opacity-50 ${tom}`}
    >
      {children}
    </button>
  );
}

export const CAMPO =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";
