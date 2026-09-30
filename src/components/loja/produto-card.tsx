import { Link } from "@tanstack/react-router";
import { ImageOff, ShieldCheck, Truck } from "lucide-react";

import { Badge } from "@/components/loja/layout";
import { mzn, percentagemDesconto } from "@/lib/formato";
import type { Produto } from "@/lib/machamba";

export function ProdutoCard({ produto }: { produto: Produto }) {
  const desconto = percentagemDesconto(produto.preco, produto.precoAntigo);
  const esgotado = produto.stock <= 0;
  return (
    <Link
      to="/produto/$id"
      params={{ id: produto.id }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-secondary">
        {produto.imagem ? (
          <img
            src={produto.imagem}
            alt={produto.titulo}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="grid size-full place-items-center text-muted-foreground">
            <ImageOff className="size-6" />
          </span>
        )}
        {desconto && (
          <Badge className="absolute left-2 top-2 bg-destructive text-destructive-foreground">
            -{desconto}%
          </Badge>
        )}
        {esgotado && (
          <Badge className="absolute right-2 top-2 bg-foreground/80 text-background">
            Esgotado
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col p-2.5">
        <p className="line-clamp-2 min-h-[2.5rem] text-xs leading-5">{produto.titulo}</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <strong className="font-display text-base text-destructive">{mzn(produto.preco)}</strong>
          {produto.precoAntigo && (
            <s className="text-[11px] text-muted-foreground">{mzn(produto.precoAntigo)}</s>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
          {produto.vendas > 0 && (
            <span>
              {produto.vendas} vendido{produto.vendas === 1 ? "" : "s"}
            </span>
          )}
          {produto.envioGratis && (
            <span className="inline-flex items-center gap-0.5 text-primary">
              <Truck className="size-3" /> Entrega grátis
            </span>
          )}
        </div>
        <div className="mt-auto flex items-center gap-1 pt-1.5 text-[10px] text-muted-foreground">
          <span className="truncate">{produto.distrito ?? produto.provincia ?? "Moçambique"}</span>
          {produto.vendedorVerificado && <ShieldCheck className="size-3 shrink-0 text-primary" />}
        </div>
      </div>
    </Link>
  );
}

export function GrelhaProdutos({
  produtos,
  carregando,
}: {
  produtos: Produto[];
  carregando?: boolean;
}) {
  if (carregando) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, indice) => (
          <div
            key={indice}
            className="animate-pulse overflow-hidden rounded-xl border border-border bg-card"
          >
            <div className="aspect-square bg-muted" />
            <div className="space-y-2 p-2.5">
              <div className="h-3 rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
              <div className="h-4 w-1/2 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {produtos.map((produto) => (
        <ProdutoCard key={produto.id} produto={produto} />
      ))}
    </div>
  );
}
