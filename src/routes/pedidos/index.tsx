import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, ImageOff, Package } from "lucide-react";

import { AppShell, Badge, Titulo } from "@/components/loja/layout";
import { Empty } from "@/components/machamba/ui";
import { useAuth } from "@/lib/auth";
import { ESTADOS_PEDIDO, dataCurta, mzn } from "@/lib/formato";
import { listarMeusPedidos } from "@/lib/loja";

export const Route = createFileRoute("/pedidos/")({
  head: () => ({ meta: [{ title: "As minhas encomendas — Machamba Digital" }] }),
  component: PaginaPedidos,
});

function PaginaPedidos() {
  const { user, carregando } = useAuth();
  const navigate = useNavigate();
  const pedidos = useQuery({
    queryKey: ["pedidos", user?.id],
    queryFn: () => listarMeusPedidos(user!.id),
    enabled: Boolean(user),
  });

  return (
    <AppShell>
      <Titulo>As minhas encomendas</Titulo>
      {!user && !carregando ? (
        <Empty
          icon={<Package className="size-7" />}
          title="Entra para ver as tuas encomendas"
          text="Acompanha pagamentos, envios e entregas."
          action="Entrar"
          onAction={() => void navigate({ to: "/auth", search: { voltar: "/pedidos" } })}
        />
      ) : pedidos.isLoading || carregando ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : !pedidos.data?.length ? (
        <Empty
          icon={<Package className="size-7" />}
          title="Ainda não tens encomendas"
          text="Quando comprares algo, aparece aqui com o estado do pagamento e da entrega."
          action="Ir às compras"
          onAction={() => void navigate({ to: "/pesquisa" })}
        />
      ) : (
        <ul className="space-y-3">
          {pedidos.data.map((pedido) => {
            const estado = ESTADOS_PEDIDO[pedido.estado] ?? {
              rotulo: pedido.estado,
              cor: "bg-muted",
            };
            return (
              <li key={pedido.id}>
                <Link
                  to="/pedidos/$id"
                  params={{ id: pedido.id }}
                  className="block rounded-xl border border-border bg-card p-3 hover:border-primary"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <strong className="text-sm">{pedido.numero}</strong>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {dataCurta(pedido.criadoEm)}
                      </span>
                    </div>
                    <Badge className={estado.cor}>{estado.rotulo}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {pedido.itens.slice(0, 4).map((item) => (
                        <span
                          key={item.id}
                          className="grid size-12 place-items-center overflow-hidden rounded-lg border-2 border-card bg-secondary"
                        >
                          {item.imagem ? (
                            <img src={item.imagem} alt="" className="size-full object-cover" />
                          ) : (
                            <ImageOff className="size-4 text-muted-foreground" />
                          )}
                        </span>
                      ))}
                    </div>
                    <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {pedido.itens.map((item) => `${item.quantidade}× ${item.titulo}`).join(", ")}
                    </p>
                    <strong className="font-display text-destructive">{mzn(pedido.total)}</strong>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                  {["aguarda_pagamento", "falhou"].includes(pedido.estado) && (
                    <p className="mt-2 text-xs font-semibold text-primary">
                      Toca para pagar com M-Pesa ou e-Mola →
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
