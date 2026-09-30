import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ImageOff, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

import { AppShell, Titulo } from "@/components/loja/layout";
import { AppButton, Empty } from "@/components/machamba/ui";
import { useCarrinho } from "@/lib/carrinho";
import { calcularEnvio } from "@/lib/envio";
import { mzn } from "@/lib/formato";

export const Route = createFileRoute("/carrinho")({
  head: () => ({ meta: [{ title: "Carrinho — Machamba Digital" }] }),
  component: PaginaCarrinho,
});

function PaginaCarrinho() {
  const { itens, total, quantidadeTotal, atualizar, remover, limpar } = useCarrinho();
  const navigate = useNavigate();
  const envio = calcularEnvio(itens);

  return (
    <AppShell>
      <Titulo
        acao={
          itens.length ? (
            <button
              onClick={limpar}
              className="text-xs font-semibold text-muted-foreground hover:text-destructive"
            >
              Esvaziar
            </button>
          ) : null
        }
      >
        Carrinho{" "}
        {quantidadeTotal > 0 && (
          <span className="text-base font-normal text-muted-foreground">({quantidadeTotal})</span>
        )}
      </Titulo>

      {!itens.length ? (
        <Empty
          icon={<ShoppingCart className="size-7" />}
          title="O teu carrinho está vazio"
          text="Explora as categorias e adiciona produtos. Pagas depois com M-Pesa ou e-Mola."
          action="Ir às compras"
          onAction={() => void navigate({ to: "/pesquisa" })}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <ul className="space-y-3">
            {itens.map((item) => (
              <li
                key={item.produtoId}
                className="flex gap-3 rounded-xl border border-border bg-card p-3"
              >
                <Link
                  to="/produto/$id"
                  params={{ id: item.produtoId }}
                  className="size-20 shrink-0 overflow-hidden rounded-lg bg-secondary"
                >
                  {item.imagem ? (
                    <img src={item.imagem} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center text-muted-foreground">
                      <ImageOff className="size-5" />
                    </span>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/produto/$id"
                    params={{ id: item.produtoId }}
                    className="line-clamp-2 text-sm font-semibold"
                  >
                    {item.titulo}
                  </Link>
                  <p className="text-xs text-muted-foreground">{item.vendedorNome}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <strong className="font-display text-destructive">
                      {mzn(item.preco * item.quantidade)}
                    </strong>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center rounded-lg border border-border">
                        <button
                          onClick={() => atualizar(item.produtoId, item.quantidade - 1)}
                          className="grid size-9 place-items-center"
                          aria-label="Menos"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold">{item.quantidade}</span>
                        <button
                          onClick={() => atualizar(item.produtoId, item.quantidade + 1)}
                          disabled={item.quantidade >= item.stock}
                          className="grid size-9 place-items-center disabled:opacity-40"
                          aria-label="Mais"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => remover(item.produtoId)}
                        className="grid size-9 place-items-center text-muted-foreground hover:text-destructive"
                        aria-label="Remover"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                  {item.quantidade >= item.stock && (
                    <p className="mt-1 text-[11px] text-warning">Máximo disponível: {item.stock}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-xl border border-border bg-card p-4 lg:sticky lg:top-20">
            <h2 className="font-display text-lg font-bold">Resumo</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{mzn(total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Entrega</dt>
                <dd>{envio ? mzn(envio) : "Grátis"}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd className="text-destructive">{mzn(total + envio)}</dd>
              </div>
            </dl>
            <AppButton
              className="mt-4 w-full bg-accent text-accent-foreground"
              onClick={() => void navigate({ to: "/checkout" })}
            >
              Finalizar compra
            </AppButton>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Pagamento com M-Pesa ou e-Mola no próximo passo.
            </p>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
