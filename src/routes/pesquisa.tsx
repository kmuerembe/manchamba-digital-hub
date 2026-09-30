import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SearchX, SlidersHorizontal, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";

import { AppShell } from "@/components/loja/layout";
import { GrelhaProdutos } from "@/components/loja/produto-card";
import { FilterModal } from "@/components/machamba/modais";
import { Empty } from "@/components/machamba/ui";
import { listarCategorias, listarProdutos } from "@/lib/machamba";

const Pesquisa = z.object({
  q: z.string().optional(),
  categoria: z.string().optional(),
  provincia: z.string().optional(),
  cidade: z.string().optional(),
  ordem: z.enum(["relevancia", "preco_asc", "preco_desc", "vendas", "recentes"]).optional(),
});

export const Route = createFileRoute("/pesquisa")({
  validateSearch: (search) => Pesquisa.parse(search),
  head: () => ({ meta: [{ title: "Pesquisar produtos — Machamba Digital" }] }),
  component: PaginaPesquisa,
});

function PaginaPesquisa() {
  const filtros = Route.useSearch();
  const navigate = useNavigate({ from: "/pesquisa" });
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const produtos = useQuery({ queryKey: ["produtos"], queryFn: listarProdutos });
  const categorias = useQuery({ queryKey: ["categorias"], queryFn: listarCategorias });

  const atualizar = (novos: Partial<z.infer<typeof Pesquisa>>) =>
    void navigate({ search: (anterior) => ({ ...anterior, ...novos }) });

  const categoriaAtiva = (categorias.data ?? []).find(
    (categoria) => categoria.slug === filtros.categoria,
  );

  const visiveis = useMemo(() => {
    const termo = (filtros.q ?? "").trim().toLowerCase();
    const lista = (produtos.data ?? []).filter((produto) => {
      const combinaTermo =
        !termo ||
        produto.titulo.toLowerCase().includes(termo) ||
        (produto.descricao ?? "").toLowerCase().includes(termo) ||
        (produto.marca ?? "").toLowerCase().includes(termo) ||
        produto.vendedorNome.toLowerCase().includes(termo);
      const combinaCategoria = !categoriaAtiva || produto.categoriaId === categoriaAtiva.id;
      const combinaProvincia =
        !filtros.provincia ||
        filtros.provincia === "Todas" ||
        produto.provincia === filtros.provincia;
      const combinaCidade =
        !filtros.cidade || filtros.cidade === "Todas" || produto.distrito === filtros.cidade;
      return combinaTermo && combinaCategoria && combinaProvincia && combinaCidade;
    });
    switch (filtros.ordem) {
      case "preco_asc":
        return lista.sort((a, b) => a.preco - b.preco);
      case "preco_desc":
        return lista.sort((a, b) => b.preco - a.preco);
      case "vendas":
        return lista.sort((a, b) => b.vendas - a.vendas);
      case "recentes":
        return lista.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
      default:
        return lista;
    }
  }, [produtos.data, filtros, categoriaAtiva]);

  return (
    <AppShell pesquisa={filtros.q ?? ""}>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <button
          onClick={() => atualizar({ categoria: undefined })}
          className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold ${!filtros.categoria ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}
        >
          Todos
        </button>
        {(categorias.data ?? [])
          .filter((categoria) => categoria.ativo)
          .map((categoria) => (
            <button
              key={categoria.id}
              onClick={() => atualizar({ categoria: categoria.slug })}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold ${filtros.categoria === categoria.slug ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}
            >
              {categoria.nome}
            </button>
          ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl font-bold">
          {categoriaAtiva
            ? categoriaAtiva.nome
            : filtros.q
              ? `Resultados para “${filtros.q}”`
              : "Todos os produtos"}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({visiveis.length})
          </span>
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={filtros.ordem ?? "relevancia"}
            onChange={(evento) =>
              atualizar({ ordem: evento.target.value as z.infer<typeof Pesquisa>["ordem"] })
            }
            className="h-10 rounded-lg border border-border bg-card px-3 text-xs font-semibold"
            aria-label="Ordenar"
          >
            <option value="relevancia">Relevância</option>
            <option value="vendas">Mais vendidos</option>
            <option value="preco_asc">Preço: menor</option>
            <option value="preco_desc">Preço: maior</option>
            <option value="recentes">Mais recentes</option>
          </select>
          <button
            onClick={() => setFiltrosAbertos(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold"
          >
            <SlidersHorizontal className="size-4" />
            {filtros.cidade && filtros.cidade !== "Todas"
              ? filtros.cidade
              : filtros.provincia && filtros.provincia !== "Todas"
                ? filtros.provincia
                : "Local"}
          </button>
        </div>
      </div>

      <div className="mt-4">
        {produtos.isLoading ? (
          <GrelhaProdutos produtos={[]} carregando />
        ) : produtos.isError ? (
          <Empty
            icon={<WifiOff className="size-7" />}
            title="Sem ligação à loja"
            text="Verifica a tua internet e tenta novamente."
            action="Tentar de novo"
            onAction={() => void produtos.refetch()}
          />
        ) : visiveis.length ? (
          <GrelhaProdutos produtos={visiveis} />
        ) : (
          <Empty
            icon={<SearchX className="size-7" />}
            title="Nada encontrado"
            text="Experimenta outra palavra, outra categoria ou alarga a zona de pesquisa."
            action="Limpar filtros"
            onAction={() => void navigate({ search: {} })}
          />
        )}
      </div>

      {filtrosAbertos && (
        <FilterModal
          provincia={filtros.provincia ?? "Todas"}
          cidade={filtros.cidade ?? "Todas"}
          onProvincia={(valor) =>
            atualizar({ provincia: valor === "Todas" ? undefined : valor, cidade: undefined })
          }
          onCidade={(valor) => atualizar({ cidade: valor === "Todas" ? undefined : valor })}
          onClose={() => setFiltrosAbertos(false)}
        />
      )}
    </AppShell>
  );
}
