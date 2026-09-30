import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, ImageOff, PackagePlus, Phone, Store, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, Badge, Titulo } from "@/components/loja/layout";
import { SellModal } from "@/components/machamba/modais";
import { AppButton, Empty } from "@/components/machamba/ui";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ESTADOS_ITEM, ESTADOS_PEDIDO, dataHora, mzn } from "@/lib/formato";
import { listarVendas } from "@/lib/loja";
import { atualizarEstadoItem } from "@/lib/loja.functions";
import { listarMeusProdutos } from "@/lib/machamba";

export const Route = createFileRoute("/vender")({
  head: () => ({ meta: [{ title: "Vender — Machamba Digital" }] }),
  component: PaginaVender,
});

const ESTADO_PRODUTO: Record<string, string> = {
  pendente: "Em revisão",
  ativo: "Activo",
  rejeitado: "Rejeitado",
  vendido: "Vendido",
  inativo: "Inactivo",
};

function PaginaVender() {
  const { user, carregando } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [aba, setAba] = useState<"vendas" | "produtos">("vendas");
  const [publicar, setPublicar] = useState(false);

  const produtos = useQuery({
    queryKey: ["meus-produtos", user?.id],
    queryFn: () => listarMeusProdutos(user!.id),
    enabled: Boolean(user),
  });
  const vendas = useQuery({
    queryKey: ["vendas", user?.id],
    queryFn: () => listarVendas(user!.id),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!user) return;
    const canal = supabase
      .channel("vendas-vendedor")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => void queryClient.invalidateQueries({ queryKey: ["vendas", user.id] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [user, queryClient]);

  const atualizar = useMutation({
    mutationFn: (dados: {
      itemId: string;
      estado: "confirmado" | "enviado" | "entregue" | "cancelado";
    }) => atualizarEstadoItem({ data: dados }),
    onSuccess: () => {
      toast.success("Estado actualizado");
      void queryClient.invalidateQueries({ queryKey: ["vendas", user?.id] });
    },
    onError: () => toast.error("Não foi possível actualizar"),
  });

  const alternarStock = useMutation({
    mutationFn: async ({ id, stock }: { id: string; stock: number }) => {
      const { error } = await supabase.from("produtos").update({ stock }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["meus-produtos", user?.id] }),
  });

  if (!user && !carregando) {
    return (
      <AppShell>
        <Empty
          icon={<Store className="size-7" />}
          title="Abre a tua loja"
          text="Cria uma conta gratuita, publica produtos e recebe pagamentos por M-Pesa e e-Mola."
          action="Entrar ou criar conta"
          onAction={() => void navigate({ to: "/auth", search: { voltar: "/vender" } })}
        />
      </AppShell>
    );
  }

  const pagas = (vendas.data ?? []).filter(
    (pedido) => pedido.estado !== "cancelado" && pedido.estado !== "falhou",
  );
  const receita = pagas.reduce(
    (soma, pedido) => soma + pedido.itens.reduce((s, item) => s + item.preco * item.quantidade, 0),
    0,
  );
  const porEnviar = pagas.filter((pedido) =>
    pedido.itens.some((item) => ["pendente", "confirmado"].includes(item.estado)),
  ).length;

  return (
    <AppShell>
      <Titulo
        acao={
          <AppButton onClick={() => setPublicar(true)}>
            <PackagePlus className="size-4" /> Publicar produto
          </AppButton>
        }
      >
        A minha loja
      </Titulo>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3">
          <Wallet className="size-4 text-primary" />
          <p className="mt-1 text-[11px] text-muted-foreground">Vendas pagas</p>
          <strong className="font-display text-base">{mzn(receita)}</strong>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <TrendingUp className="size-4 text-accent" />
          <p className="mt-1 text-[11px] text-muted-foreground">Encomendas</p>
          <strong className="font-display text-base">{pagas.length}</strong>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <BadgeCheck className="size-4 text-destructive" />
          <p className="mt-1 text-[11px] text-muted-foreground">Por enviar</p>
          <strong className="font-display text-base">{porEnviar}</strong>
        </div>
      </div>

      <div className="mt-5 flex gap-2 border-b border-border">
        {(["vendas", "produtos"] as const).map((chave) => (
          <button
            key={chave}
            onClick={() => setAba(chave)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${aba === chave ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            {chave === "vendas"
              ? `Vendas (${pagas.length})`
              : `Produtos (${produtos.data?.length ?? 0})`}
          </button>
        ))}
      </div>

      {aba === "vendas" && (
        <div className="mt-4 space-y-3">
          {!pagas.length ? (
            <Empty
              icon={<Wallet className="size-7" />}
              title="Ainda sem vendas"
              text="Quando um cliente pagar um dos teus produtos, aparece aqui com os dados de entrega."
            />
          ) : (
            pagas.map((pedido) => (
              <article key={pedido.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong className="text-sm">{pedido.numero}</strong>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {dataHora(pedido.criadoEm)}
                    </span>
                  </div>
                  <Badge className={(ESTADOS_PEDIDO[pedido.estado] ?? { cor: "bg-muted" }).cor}>
                    {(ESTADOS_PEDIDO[pedido.estado] ?? { rotulo: pedido.estado }).rotulo}
                  </Badge>
                </div>
                <div className="mt-2 rounded-lg bg-secondary/60 p-2 text-xs">
                  <strong>{String(pedido.endereco.nome ?? "")}</strong> ·{" "}
                  {[pedido.endereco.bairro, pedido.endereco.distrito, pedido.endereco.provincia]
                    .filter(Boolean)
                    .join(", ")}
                  {pedido.endereco.referencia && (
                    <span> · Ref.: {String(pedido.endereco.referencia)}</span>
                  )}
                  <a
                    href={`tel:${String(pedido.endereco.telefone ?? "")}`}
                    className="ml-2 inline-flex items-center gap-1 font-semibold text-primary"
                  >
                    <Phone className="size-3" /> {String(pedido.endereco.telefone ?? "")}
                  </a>
                  {pedido.notas && (
                    <p className="mt-1 text-muted-foreground">Nota: {pedido.notas}</p>
                  )}
                </div>
                <ul className="mt-2 divide-y divide-border">
                  {pedido.itens.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center gap-3 py-2">
                      <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary">
                        {item.imagem ? (
                          <img src={item.imagem} alt="" className="size-full object-cover" />
                        ) : (
                          <ImageOff className="size-4 text-muted-foreground" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantidade} × {mzn(item.preco)} ·{" "}
                          {ESTADOS_ITEM[item.estado] ?? item.estado}
                        </p>
                      </div>
                      <select
                        value={item.estado}
                        disabled={
                          atualizar.isPending ||
                          item.estado === "cancelado" ||
                          pedido.estado === "aguarda_pagamento"
                        }
                        onChange={(evento) =>
                          atualizar.mutate({
                            itemId: item.id,
                            estado: evento.target.value as "confirmado",
                          })
                        }
                        className="h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold"
                      >
                        <option value="pendente" disabled>
                          Pendente
                        </option>
                        <option value="confirmado">Confirmado</option>
                        <option value="enviado">Enviado</option>
                        <option value="entregue">Entregue</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </li>
                  ))}
                </ul>
              </article>
            ))
          )}
        </div>
      )}

      {aba === "produtos" && (
        <div className="mt-4 space-y-2">
          {!produtos.data?.length ? (
            <Empty
              icon={<PackagePlus className="size-7" />}
              title="Ainda não publicaste produtos"
              text="Publica o primeiro produto com fotografias, preço e stock."
              action="Publicar produto"
              onAction={() => setPublicar(true)}
            />
          ) : (
            produtos.data.map((produto) => (
              <div
                key={produto.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <Link
                  to="/produto/$id"
                  params={{ id: produto.id }}
                  className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary"
                >
                  {produto.imagem ? (
                    <img src={produto.imagem} alt="" className="size-full object-cover" />
                  ) : (
                    <ImageOff className="size-4 text-muted-foreground" />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{produto.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {mzn(produto.preco)} · stock {produto.stock} · {produto.vendas} vendidos
                  </p>
                  <Badge
                    className={
                      produto.estado === "ativo"
                        ? "mt-1 bg-success/15 text-primary"
                        : "mt-1 bg-secondary"
                    }
                  >
                    {ESTADO_PRODUTO[produto.estado] ?? produto.estado}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      alternarStock.mutate({
                        id: produto.id,
                        stock: Math.max(0, produto.stock - 1),
                      })
                    }
                    className="size-8 rounded-md border border-border text-sm font-bold"
                    aria-label="Menos stock"
                  >
                    −
                  </button>
                  <button
                    onClick={() =>
                      alternarStock.mutate({ id: produto.id, stock: produto.stock + 1 })
                    }
                    className="size-8 rounded-md border border-border text-sm font-bold"
                    aria-label="Mais stock"
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {publicar && (
        <SellModal
          onClose={() => setPublicar(false)}
          onDone={(mensagem) => {
            setPublicar(false);
            toast.success(mensagem);
            setAba("produtos");
          }}
        />
      )}
    </AppShell>
  );
}
