import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, ImageOff, MapPin, Phone } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Bloco, Esqueleto, Etiqueta, Filtros } from "@/components/admin/ui";
import { Badge } from "@/components/loja/layout";
import { definirEstadoEncomenda, listarEncomendasAdmin, ESTADOS_PEDIDO_ADMIN } from "@/lib/admin";
import { ESTADOS_PEDIDO, dataHora, mzn } from "@/lib/formato";

type Filtro = (typeof ESTADOS_PEDIDO_ADMIN)[number] | "todos";

const OPCOES: { chave: Filtro; rotulo: string }[] = [
  { chave: "todos", rotulo: "Todas" },
  { chave: "aguarda_pagamento", rotulo: "Aguarda pagamento" },
  { chave: "pago", rotulo: "Pagas" },
  { chave: "em_preparacao", rotulo: "Em preparação" },
  { chave: "enviado", rotulo: "Enviadas" },
  { chave: "entregue", rotulo: "Entregues" },
  { chave: "cancelado", rotulo: "Canceladas" },
];

export function GestaoEncomendas() {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const queryClient = useQueryClient();

  const encomendas = useQuery({
    queryKey: ["admin-encomendas", filtro],
    queryFn: () => listarEncomendasAdmin(filtro),
  });

  const mudarEstado = useMutation({
    mutationFn: (dados: { id: string; estado: string }) =>
      definirEstadoEncomenda(dados.id, dados.estado),
    onSuccess: () => {
      toast.success("Estado da encomenda actualizado");
      void queryClient.invalidateQueries({ queryKey: ["admin-encomendas"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-resumo"] });
    },
    onError: () => toast.error("Não foi possível actualizar a encomenda"),
  });

  const totais = useMemo(() => {
    const lista = encomendas.data ?? [];
    const valor = lista
      .filter((pedido) => !["cancelado", "falhou", "aguarda_pagamento"].includes(pedido.estado))
      .reduce((soma, pedido) => soma + pedido.total, 0);
    return { quantidade: lista.length, valor };
  }, [encomendas.data]);

  return (
    <Bloco
      titulo="Encomendas"
      descricao="Acompanha pagamentos, preparação e entregas de toda a plataforma."
      acao={
        <span className="text-xs text-muted-foreground">
          {totais.quantidade} encomenda(s) · {mzn(totais.valor)} pagos
        </span>
      }
    >
      <div className="space-y-3">
        <Filtros opcoes={OPCOES} valor={filtro} onMudar={setFiltro} />

        {encomendas.isLoading ? (
          <Esqueleto linhas={4} />
        ) : encomendas.isError ? (
          <p className="text-sm text-destructive">Não foi possível carregar as encomendas.</p>
        ) : !encomendas.data?.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma encomenda neste estado.
          </p>
        ) : (
          <ul className="space-y-3">
            {encomendas.data.map((pedido) => {
              const estado = ESTADOS_PEDIDO[pedido.estado] ?? {
                rotulo: pedido.estado,
                cor: "bg-muted text-muted-foreground",
              };
              const nome = String(pedido.endereco.nome ?? "");
              const telefone = String(pedido.endereco.telefone ?? "");
              return (
                <li key={pedido.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <strong className="text-sm">{pedido.numero}</strong>
                      <Badge className={estado.cor}>{estado.rotulo}</Badge>
                      {pedido.metodoPagamento && (
                        <Etiqueta
                          tom={
                            pedido.metodoPagamento === "mpesa"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-accent/25 text-accent-foreground"
                          }
                        >
                          {pedido.metodoPagamento === "mpesa" ? "M-Pesa" : "e-Mola"}
                        </Etiqueta>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {dataHora(pedido.criadoEm)}
                    </span>
                  </div>

                  <div className="mt-2 rounded-lg bg-secondary/60 p-2 text-xs">
                    <strong>{nome || "Comprador"}</strong>
                    <span className="ml-2 inline-flex items-center gap-1 text-muted-foreground">
                      <MapPin className="size-3" />
                      {[pedido.endereco.bairro, pedido.endereco.distrito, pedido.endereco.provincia]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                    {telefone && (
                      <a
                        href={`tel:${telefone}`}
                        className="ml-2 inline-flex items-center gap-1 font-semibold text-primary"
                      >
                        <Phone className="size-3" /> {telefone}
                      </a>
                    )}
                    {pedido.notas && (
                      <p className="mt-1 text-muted-foreground">Nota: {pedido.notas}</p>
                    )}
                  </div>

                  <ul className="mt-2 divide-y divide-border">
                    {pedido.itens.map((item) => (
                      <li key={item.id} className="flex items-center gap-3 py-2">
                        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary">
                          {item.imagem ? (
                            <img src={item.imagem} alt="" className="size-full object-cover" />
                          ) : (
                            <ImageOff className="size-3.5 text-muted-foreground" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {item.titulo}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.quantidade} × {mzn(item.preco)} · {item.estado}
                          </span>
                        </span>
                        <strong className="text-sm">{mzn(item.preco * item.quantidade)}</strong>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                    <span className="text-sm">
                      Total{" "}
                      <strong className="font-display text-base text-destructive">
                        {mzn(pedido.total)}
                      </strong>
                      <span className="ml-2 text-xs text-muted-foreground">
                        artigos {mzn(pedido.subtotal)} + envio {mzn(pedido.envio)}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <select
                        value={pedido.estado}
                        disabled={mudarEstado.isPending}
                        onChange={(evento) =>
                          mudarEstado.mutate({ id: pedido.id, estado: evento.target.value })
                        }
                        className="h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold"
                        aria-label={`Estado da encomenda ${pedido.numero}`}
                      >
                        {ESTADOS_PEDIDO_ADMIN.map((chave) => (
                          <option key={chave} value={chave}>
                            {ESTADOS_PEDIDO[chave]?.rotulo ?? chave}
                          </option>
                        ))}
                      </select>
                      <Link
                        to="/pedidos/$id"
                        params={{ id: pedido.id }}
                        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-semibold hover:border-primary"
                      >
                        Detalhe <ChevronRight className="size-3.5" />
                      </Link>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Bloco>
  );
}
