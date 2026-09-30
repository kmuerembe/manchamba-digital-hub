import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ImageOff, MapPin, Phone, Receipt, Truck } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { AppShell, Badge } from "@/components/loja/layout";
import { METODOS, PagamentoMovel } from "@/components/loja/pagamento";
import { AppButton } from "@/components/machamba/ui";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ESTADOS_ITEM, ESTADOS_PEDIDO, dataHora, mzn } from "@/lib/formato";
import { listarPagamentos, obterPedido } from "@/lib/loja";
import { cancelarPedido } from "@/lib/loja.functions";

export const Route = createFileRoute("/pedidos/$id")({
  head: () => ({ meta: [{ title: "Encomenda — Machamba Digital" }] }),
  component: PaginaPedido,
});

const PASSOS = ["pago", "em_preparacao", "enviado", "entregue"];

function PaginaPedido() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const pedido = useQuery({
    queryKey: ["pedido", id],
    queryFn: () => obterPedido(id),
    enabled: Boolean(user),
  });
  const pagamentos = useQuery({
    queryKey: ["pagamentos", id],
    queryFn: () => listarPagamentos(id),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!user) return;
    const canal = supabase
      .channel(`pedido-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pedidos", filter: `id=eq.${id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["pedido", id] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pagamentos", filter: `pedido_id=eq.${id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["pagamentos", id] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [id, user, queryClient]);

  const cancelar = useMutation({
    mutationFn: () => cancelarPedido({ data: { pedidoId: id } }),
    onSuccess: () => {
      toast.success("Encomenda cancelada");
      void queryClient.invalidateQueries({ queryKey: ["pedido", id] });
      void queryClient.invalidateQueries({ queryKey: ["pedidos", user?.id] });
    },
    onError: () => toast.error("Não foi possível cancelar"),
  });

  const atualizarTudo = () => {
    void queryClient.invalidateQueries({ queryKey: ["pedido", id] });
    void queryClient.invalidateQueries({ queryKey: ["pedidos", user?.id] });
    void queryClient.invalidateQueries({ queryKey: ["pagamentos", id] });
    void queryClient.invalidateQueries({ queryKey: ["produtos"] });
  };

  const item = pedido.data;

  return (
    <AppShell>
      <Link
        to="/pedidos"
        className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground"
      >
        <ChevronLeft className="size-4" /> Encomendas
      </Link>

      {!user ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Entra na tua conta para ver esta encomenda.
        </p>
      ) : pedido.isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      ) : !item ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Encomenda não encontrada.</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h1 className="font-display text-2xl font-bold">{item.numero}</h1>
                  <p className="text-xs text-muted-foreground">
                    Feita em {dataHora(item.criadoEm)}
                  </p>
                </div>
                <Badge
                  className={`${(ESTADOS_PEDIDO[item.estado] ?? { cor: "bg-muted" }).cor} text-xs`}
                >
                  {(ESTADOS_PEDIDO[item.estado] ?? { rotulo: item.estado }).rotulo}
                </Badge>
              </div>

              {PASSOS.includes(item.estado) && (
                <ol className="mt-4 grid grid-cols-4 gap-1 text-center text-[10px] font-semibold">
                  {PASSOS.map((passo, indice) => {
                    const feito = PASSOS.indexOf(item.estado) >= indice;
                    return (
                      <li key={passo} className={feito ? "text-primary" : "text-muted-foreground"}>
                        <div
                          className={`mx-auto mb-1 h-1.5 w-full rounded-full ${feito ? "bg-primary" : "bg-muted"}`}
                        />
                        {ESTADOS_PEDIDO[passo]?.rotulo}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="font-display text-lg font-bold">Artigos</h2>
              <ul className="mt-3 divide-y divide-border">
                {item.itens.map((linha) => (
                  <li key={linha.id} className="flex items-center gap-3 py-3">
                    <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary">
                      {linha.imagem ? (
                        <img src={linha.imagem} alt="" className="size-full object-cover" />
                      ) : (
                        <ImageOff className="size-4 text-muted-foreground" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      {linha.produtoId ? (
                        <Link
                          to="/produto/$id"
                          params={{ id: linha.produtoId }}
                          className="line-clamp-2 text-sm font-semibold"
                        >
                          {linha.titulo}
                        </Link>
                      ) : (
                        <p className="line-clamp-2 text-sm font-semibold">{linha.titulo}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {linha.quantidade} × {mzn(linha.preco)} ·{" "}
                        {ESTADOS_ITEM[linha.estado] ?? linha.estado}
                      </p>
                    </div>
                    <strong className="text-sm">{mzn(linha.preco * linha.quantidade)}</strong>
                  </li>
                ))}
              </ul>
              <dl className="mt-2 space-y-1 border-t border-border pt-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{mzn(item.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Entrega</dt>
                  <dd>{item.envio ? mzn(item.envio) : "Grátis"}</dd>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <dt>Total</dt>
                  <dd className="text-destructive">{mzn(item.total)}</dd>
                </div>
              </dl>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-4 text-sm">
                <h2 className="flex items-center gap-2 font-display text-base font-bold">
                  <MapPin className="size-4 text-primary" /> Entrega
                </h2>
                <p className="mt-2 font-semibold">{String(item.endereco.nome ?? "")}</p>
                <p className="text-muted-foreground">
                  {[item.endereco.bairro, item.endereco.distrito, item.endereco.provincia]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {item.endereco.referencia && (
                  <p className="text-xs text-muted-foreground">
                    Ref.: {String(item.endereco.referencia)}
                  </p>
                )}
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="size-3" /> {String(item.endereco.telefone ?? "")}
                </p>
                {item.notas && (
                  <p className="mt-2 rounded-lg bg-secondary p-2 text-xs">Nota: {item.notas}</p>
                )}
              </div>
              <div className="rounded-xl border border-border bg-card p-4 text-sm">
                <h2 className="flex items-center gap-2 font-display text-base font-bold">
                  <Receipt className="size-4 text-primary" /> Pagamentos
                </h2>
                {!pagamentos.data?.length ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Ainda sem tentativas de pagamento.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {pagamentos.data.map((pagamento) => (
                      <li key={pagamento.id} className="rounded-lg bg-secondary/60 p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <strong>
                            {METODOS[pagamento.metodo as keyof typeof METODOS]?.nome ??
                              pagamento.metodo}{" "}
                            · {pagamento.telefone}
                          </strong>
                          <Badge
                            className={
                              pagamento.estado === "pago"
                                ? "bg-success/20 text-primary"
                                : pagamento.estado === "pendente"
                                  ? "bg-warning/20"
                                  : "bg-destructive/10 text-destructive"
                            }
                          >
                            {pagamento.estado}
                          </Badge>
                        </div>
                        <p className="mt-1 text-muted-foreground">{pagamento.mensagem}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          Ref. {pagamento.referencia}
                          {pagamento.transacaoId
                            ? ` · Transação ${pagamento.transacaoId}`
                            : ""} · {dataHora(pagamento.criadoEm)}
                          {pagamento.ambiente !== "producao" ? ` · ${pagamento.ambiente}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <aside className="h-fit space-y-3 lg:sticky lg:top-20">
            {["aguarda_pagamento", "falhou"].includes(item.estado) &&
            item.compradorId === user.id ? (
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="font-display text-lg font-bold">Pagar agora</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Total {mzn(item.total)} · confirma o PIN no telemóvel.
                </p>
                <PagamentoMovel
                  pedidoId={item.id}
                  total={item.total}
                  telefoneInicial={(
                    item.telefonePagamento ?? String(item.endereco.telefone ?? "")
                  ).replace(/^258/, "")}
                  onPago={() => {
                    toast.success("Pagamento confirmado!");
                    atualizarTudo();
                  }}
                />
                <AppButton
                  variant="plain"
                  className="mt-3 w-full text-destructive"
                  disabled={cancelar.isPending}
                  onClick={() => cancelar.mutate()}
                >
                  Cancelar encomenda
                </AppButton>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-4 text-sm">
                <h2 className="flex items-center gap-2 font-display text-base font-bold">
                  <Truck className="size-4 text-primary" /> Próximos passos
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {item.estado === "pago" && "O vendedor foi avisado e vai preparar a encomenda."}
                  {item.estado === "em_preparacao" &&
                    "A encomenda está a ser preparada para envio."}
                  {item.estado === "enviado" &&
                    "A encomenda está a caminho. O vendedor pode contactar-te pelo telefone indicado."}
                  {item.estado === "entregue" &&
                    "Encomenda entregue. Obrigado por comprares na Machamba Digital!"}
                  {item.estado === "cancelado" && "Esta encomenda foi cancelada."}
                </p>
                {item.metodoPagamento && item.pagoEm && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Pago com {METODOS[item.metodoPagamento as keyof typeof METODOS]?.nome} em{" "}
                    {dataHora(item.pagoEm)}.
                  </p>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </AppShell>
  );
}
