import { Heart, ImageOff, ShieldCheck, Star, X } from "lucide-react";
import type { ReactNode } from "react";

import type { Produto } from "@/lib/machamba";

export function AppButton({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  ariaLabel,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "soft" | "plain" | "outline";
  className?: string;
  type?: "button" | "submit";
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const styles = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    soft: "bg-secondary text-secondary-foreground hover:bg-muted",
    plain: "text-foreground hover:bg-muted",
    outline: "border border-border bg-card text-foreground hover:border-primary",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end bg-foreground/55 sm:items-center sm:justify-center"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-background p-5 sm:max-w-lg sm:rounded-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="grid size-10 place-items-center rounded-lg hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function Empty({
  icon,
  title,
  text,
  action,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mt-10 border-y border-border py-12 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-primary">{icon}</span>
      <h2 className="mt-4 font-display font-semibold">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && onAction && (
        <AppButton className="mt-5" onClick={onAction}>
          {action}
        </AppButton>
      )}
    </div>
  );
}

export function ProdutoFoto({ produto, className }: { produto: Produto; className: string }) {
  if (!produto.imagem) {
    return (
      <span className={`grid shrink-0 place-items-center bg-secondary text-muted-foreground ${className}`}>
        <ImageOff className="size-5" />
      </span>
    );
  }
  return <img src={produto.imagem} alt={produto.titulo} loading="lazy" className={`object-cover ${className}`} />;
}

export function ProductCard({
  produto,
  favorito,
  onFavorite,
  onOpen,
}: {
  produto: Produto;
  favorito: boolean;
  onFavorite: () => void;
  onOpen: () => void;
}) {
  return (
    <article className="group flex overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left">
        <ProdutoFoto produto={produto} className="size-20 shrink-0 rounded-md" />
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-sm">{produto.titulo}</strong>
          <span className="mt-1 block truncate text-xs text-muted-foreground">
            {produto.vendedorNome} · {produto.distrito ?? produto.provincia ?? "Moçambique"}
          </span>
          <span className="mt-2 flex items-center gap-2">
            <strong className="font-display text-base">
              {produto.preco} <small className="font-sans text-[10px] text-muted-foreground">MZN/{produto.unidade}</small>
            </strong>
            {produto.vendedorVerificado && (
              <span className="flex items-center gap-0.5 text-[10px] text-primary">
                <ShieldCheck className="size-3" /> verificado
              </span>
            )}
          </span>
        </span>
      </button>
      <button
        onClick={onFavorite}
        aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        className="self-start p-3 text-muted-foreground hover:text-primary"
      >
        <Heart className={`size-5 ${favorito ? "fill-primary text-primary" : ""}`} />
      </button>
    </article>
  );
}

export function Estrelas({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="text-xs text-muted-foreground">Sem avaliações</span>;
  return (
    <span className="flex items-center gap-1 text-sm">
      <Star className="size-4 fill-accent text-accent" />
      {valor}
    </span>
  );
}
