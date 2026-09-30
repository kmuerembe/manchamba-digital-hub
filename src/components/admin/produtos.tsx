import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Check, Eye, ImageOff, Search, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AcaoRapida, Bloco, CAMPO, Esqueleto, Etiqueta, Filtros } from "@/components/admin/ui";
import {
  alternarDestaqueProduto,
  atualizarStockProduto,
  definirEstadoProduto,
  listarProdutosAdmin,
  type EstadoProduto,
} from "@/lib/admin";
import { dataCurta, mzn } from "@/lib/formato";

type Filtro = "pendente" | "ativo" | "rejeitado" | "todos";

const OPCOES: { chave: Filtro; rotulo: string }[] = [
  { chave: "pendente", rotulo: "À espera" },
  { chave: "ativo", rotulo: "Aprovados" },
  { chave: "rejeitado", rotulo: "Rejeitados" },
  { chave: "todos", rotulo: "Todos" },
];

const ESTADO_PRODUTO: Record<string, { rotulo: string; tom: string }> = {
  pendente: { rotulo: "À espera de aprovação", tom: "bg-warning/20 text-accent-foreground" },
  ativo: { rotulo: "Aprovado", tom: "bg-success/15 text-primary" },
  rejeitado: { rotulo: "Rejeitado", tom: "bg-destructive/10 text-destructive" },
  inativo: { rotulo: "Inactivo", tom: "bg-muted text-muted-foreground" },
  vendido: { rotulo: "Vendido", tom: "bg-secondary text-secondary-foreground" },
};

export function AprovacaoProdutos() {
  const [filtro, setFiltro] = useState<Filtro>("pendente");
  const [termo, setTermo] = useState("");
  const queryClient = useQueryClient();

  const produtos = useQuery({
    queryKey: ["admin-produtos", filtro],
    queryFn: () => listarProdutosAdmin(filtro),
  });

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-produtos"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-resumo"] });
  };

  const mudarEstado = useMutation({
    mutationFn: (dados: { id: string; estado: EstadoProduto }) =>
      definirEstadoProduto(dados.id, dados.estado),
    onSuccess: (_resultado, dados) => {
      toast.success(
        dados.estado === "ativo"
          ? "Anúncio aprovado e visível no mercado"
          : dados.estado === "rejeitado"
            ? "Anúncio rejeitado — o vendedor foi avisado"
            : "Estado actualizado",
      );
      invalidar();
    },
    onError: () => toast.error("Não foi possível actualizar o anúncio"),
  });

  const destacar = useMutation({
    mutationFn: (dados: { id: string; destaque: boolean }) =>
      alternarDestaqueProduto(dados.id, dados.destaque),
    onSuccess: (_resultado, dados) => {
      toast.success(dados.destaque ? "Anúncio em destaque" : "Destaque removido");
      invalidar();
    },
    onError: () => toast.error("Não foi possível alterar o destaque"),
  });

  const stock = useMutation({
    mutationFn: (dados: { id: string; stock: number }) =>
      atualizarStockProduto(dados.id, dados.stock),
    onSuccess: invalidar,
    onError: () => toast.error("Não foi possível actualizar o stock"),
  });

  const visiveis = useMemo(() => {
    const lista = produtos.data ?? [];
    const alvo = termo.trim().toLowerCase();
    if (!alvo) return lista;
    return lista.filter((produto) =>
      [produto.titulo, produto.vendedorNome, produto.categoria, produto.marca ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(alvo),
    );
  }, [produtos.data, termo]);

  return (
    <Bloco
      titulo="Aprovação de anúncios"
      descricao="Revê o que os vendedores publicam e decide o que vai para o mercado."
      acao={<span className="text-xs text-muted-foreground">{visiveis.length} anúncio(s)</span>}
    >
      <div className="space-y-3">
        <Filtros opcoes={OPCOES} valor={filtro} onMudar={setFiltro} />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={termo}
            onChange={(evento) => setTermo(evento.target.value)}
            placeholder="Filtrar por título, vendedor, marca…"
            className={`${CAMPO} pl-9`}
          />
        </div>

        {produtos.isLoading ? (
          <Esqueleto linhas={4} />
        ) : produtos.isError ? (
          <p className="text-sm text-destructive">Não foi possível carregar os anúncios.</p>
        ) : !visiveis.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {filtro === "pendente"
              ? "Não há anúncios à espera de aprovação. Bom trabalho!"
              : "Nenhum anúncio encontrado com estes filtros."}
          </p>
        ) : (
          <ul className="space-y-2">
            {visiveis.map((produto) => {
              const estado = ESTADO_PRODUTO[produto.estado] ?? {
                rotulo: produto.estado,
                tom: "bg-muted text-muted-foreground",
              };
              return (
                <li
                  key={produto.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3 sm:flex-row sm:items-center"
                >
                  <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary">
                    {produto.imagem ? (
                      <img src={produto.imagem} alt="" className="size-full object-cover" />
                    ) : (
                      <ImageOff className="size-4 text-muted-foreground" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="truncate text-sm">{produto.titulo}</strong>
                      <Etiqueta tom={estado.tom}>{estado.rotulo}</Etiqueta>
                      {produto.destaque && (
                        <Etiqueta tom="bg-accent/25 text-accent-foreground">Em destaque</Etiqueta>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {produto.vendedorNome} · {produto.categoria} ·{" "}
                      {produto.distrito ?? produto.provincia ?? "Moçambique"} ·{" "}
                      {dataCurta(produto.criadoEm)}
                    </p>
                    <p className="mt-0.5 text-xs">
                      <strong className="font-display text-sm">{mzn(produto.preco)}</strong>
                      <span className="text-muted-foreground">
                        {" "}
                        / {produto.unidade} · stock {produto.stock} · {produto.vendas} vendidos
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link
                      to="/produto/$id"
                      params={{ id: produto.id }}
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold hover:border-primary"
                    >
                      <Eye className="size-3.5" /> Ver
                    </Link>
                    <AcaoRapida
                      onClick={() => stock.mutate({ id: produto.id, stock: produto.stock + 10 })}
                      titulo="Adicionar 10 unidades ao stock"
                    >
                      +10 stock
                    </AcaoRapida>
                    <AcaoRapida
                      onClick={() =>
                        destacar.mutate({ id: produto.id, destaque: !produto.destaque })
                      }
                      tom={
                        produto.destaque
                          ? "border-accent bg-accent/20 text-accent-foreground"
                          : "border-border bg-card hover:border-primary"
                      }
                    >
                      <Star className="size-3.5" /> {produto.destaque ? "Destacado" : "Destacar"}
                    </AcaoRapida>
                    {produto.estado !== "ativo" && (
                      <AcaoRapida
                        onClick={() => mudarEstado.mutate({ id: produto.id, estado: "ativo" })}
                        tom="border-primary bg-primary text-primary-foreground hover:opacity-90"
                        desativado={mudarEstado.isPending}
                      >
                        <Check className="size-3.5" /> Aprovar
                      </AcaoRapida>
                    )}
                    {produto.estado !== "rejeitado" && (
                      <AcaoRapida
                        onClick={() => mudarEstado.mutate({ id: produto.id, estado: "rejeitado" })}
                        tom="border-destructive/40 bg-destructive/10 text-destructive hover:border-destructive"
                        desativado={mudarEstado.isPending}
                      >
                        <X className="size-3.5" /> Rejeitar
                      </AcaoRapida>
                    )}
                    {produto.vendedorVerificado && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                        <BadgeCheck className="size-3.5" /> vendedor verificado
                      </span>
                    )}
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
