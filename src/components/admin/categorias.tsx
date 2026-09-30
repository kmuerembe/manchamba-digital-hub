import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AcaoRapida, Bloco, CAMPO, Esqueleto, Etiqueta } from "@/components/admin/ui";
import { AppButton, ModalShell } from "@/components/machamba/ui";
import {
  apagarCategoria,
  gerarSlug,
  guardarCategoria,
  listarCategoriasAdmin,
  type CategoriaAdmin,
} from "@/lib/admin";

type Formulario = {
  id?: string;
  nome: string;
  slug: string;
  tipo: string;
  icone: string;
  cor: string;
  ativo: boolean;
  ordem: number;
};

const VAZIO: Formulario = {
  nome: "",
  slug: "",
  tipo: "produto",
  icone: "",
  cor: "#2f6f3e",
  ativo: true,
  ordem: 100,
};

export function GestaoCategorias() {
  const [emEdicao, setEmEdicao] = useState<Formulario | null>(null);
  const queryClient = useQueryClient();

  const categorias = useQuery({
    queryKey: ["admin-categorias"],
    queryFn: listarCategoriasAdmin,
  });

  const guardar = useMutation({
    mutationFn: (dados: Formulario) => guardarCategoria(dados),
    onSuccess: (_resultado, dados) => {
      toast.success(dados.id ? "Categoria actualizada" : "Categoria criada");
      setEmEdicao(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-categorias"] });
      void queryClient.invalidateQueries({ queryKey: ["categorias"] });
    },
    onError: () => toast.error("Não foi possível guardar (o slug tem de ser único)"),
  });

  const apagar = useMutation({
    mutationFn: (id: string) => apagarCategoria(id),
    onSuccess: () => {
      toast.success("Categoria apagada");
      void queryClient.invalidateQueries({ queryKey: ["admin-categorias"] });
      void queryClient.invalidateQueries({ queryKey: ["categorias"] });
    },
    onError: () => toast.error("Não foi possível apagar a categoria"),
  });

  return (
    <Bloco
      titulo="Categorias"
      descricao="Organiza o catálogo. As categorias activas aparecem na loja e na pesquisa."
      acao={
        <AppButton onClick={() => setEmEdicao({ ...VAZIO })}>
          <Plus className="size-4" /> Nova categoria
        </AppButton>
      }
    >
      {categorias.isLoading ? (
        <Esqueleto linhas={4} />
      ) : categorias.isError ? (
        <p className="text-sm text-destructive">Não foi possível carregar as categorias.</p>
      ) : (
        <ul className="divide-y divide-border">
          {categorias.data?.map((categoria: CategoriaAdmin) => (
            <li key={categoria.id} className="flex flex-wrap items-center gap-3 py-3">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: categoria.cor ?? "#2f6f3e" }}
                aria-hidden
              >
                {categoria.nome.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="truncate text-sm">{categoria.nome}</strong>
                  <Etiqueta
                    tom={
                      categoria.ativo
                        ? "bg-success/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {categoria.ativo ? "Activa" : "Inactiva"}
                  </Etiqueta>
                  <Etiqueta>{categoria.tipo}</Etiqueta>
                </div>
                <p className="text-xs text-muted-foreground">
                  /{categoria.slug} · ordem {categoria.ordem} · {categoria.produtos} produto(s)
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <AcaoRapida
                  onClick={() =>
                    setEmEdicao({
                      id: categoria.id,
                      nome: categoria.nome,
                      slug: categoria.slug,
                      tipo: categoria.tipo,
                      icone: categoria.icone ?? "",
                      cor: categoria.cor ?? "#2f6f3e",
                      ativo: categoria.ativo,
                      ordem: categoria.ordem,
                    })
                  }
                >
                  <Pencil className="size-3.5" /> Editar
                </AcaoRapida>
                <AcaoRapida
                  tom="border-destructive/40 bg-destructive/10 text-destructive hover:border-destructive"
                  desativado={apagar.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Apagar a categoria "${categoria.nome}"? Os produtos ficam sem categoria.`,
                      )
                    )
                      apagar.mutate(categoria.id);
                  }}
                >
                  <Trash2 className="size-3.5" /> Apagar
                </AcaoRapida>
              </div>
            </li>
          ))}
        </ul>
      )}

      {emEdicao && (
        <ModalShell
          title={emEdicao.id ? "Editar categoria" : "Nova categoria"}
          onClose={() => setEmEdicao(null)}
        >
          <form
            className="mt-4 space-y-3"
            onSubmit={(evento) => {
              evento.preventDefault();
              if (emEdicao.nome.trim().length < 2) {
                toast.error("Escreve o nome da categoria");
                return;
              }
              guardar.mutate(emEdicao);
            }}
          >
            <label className="block text-sm">
              <span className="font-semibold">Nome</span>
              <input
                value={emEdicao.nome}
                onChange={(evento) => {
                  const nome = evento.target.value;
                  setEmEdicao((atual) =>
                    atual
                      ? {
                          ...atual,
                          nome,
                          slug: atual.id ? atual.slug : gerarSlug(nome),
                        }
                      : atual,
                  );
                }}
                className={`${CAMPO} mt-1`}
                placeholder="Ex.: Telemóveis"
                required
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-semibold">Slug (URL)</span>
                <input
                  value={emEdicao.slug}
                  onChange={(evento) =>
                    setEmEdicao((atual) =>
                      atual ? { ...atual, slug: gerarSlug(evento.target.value) } : atual,
                    )
                  }
                  className={`${CAMPO} mt-1`}
                  placeholder="telemoveis"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Tipo</span>
                <select
                  value={emEdicao.tipo}
                  onChange={(evento) =>
                    setEmEdicao((atual) =>
                      atual ? { ...atual, tipo: evento.target.value } : atual,
                    )
                  }
                  className={`${CAMPO} mt-1`}
                >
                  <option value="produto">Produto</option>
                  <option value="insumo">Insumo</option>
                  <option value="servico">Serviço</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="font-semibold">Ícone</span>
                <input
                  value={emEdicao.icone}
                  onChange={(evento) =>
                    setEmEdicao((atual) =>
                      atual ? { ...atual, icone: evento.target.value } : atual,
                    )
                  }
                  className={`${CAMPO} mt-1`}
                  placeholder="smartphone"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Cor</span>
                <input
                  type="color"
                  value={emEdicao.cor || "#2f6f3e"}
                  onChange={(evento) =>
                    setEmEdicao((atual) => (atual ? { ...atual, cor: evento.target.value } : atual))
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Ordem</span>
                <input
                  type="number"
                  value={emEdicao.ordem}
                  onChange={(evento) =>
                    setEmEdicao((atual) =>
                      atual ? { ...atual, ordem: Number(evento.target.value) || 0 } : atual,
                    )
                  }
                  className={`${CAMPO} mt-1`}
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={emEdicao.ativo}
                onChange={(evento) =>
                  setEmEdicao((atual) =>
                    atual ? { ...atual, ativo: evento.target.checked } : atual,
                  )
                }
                className="size-4 accent-primary"
              />
              Visível na loja
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <AppButton variant="plain" onClick={() => setEmEdicao(null)}>
                Cancelar
              </AppButton>
              <AppButton type="submit" disabled={guardar.isPending}>
                <Tags className="size-4" /> {guardar.isPending ? "A guardar…" : "Guardar"}
              </AppButton>
            </div>
          </form>
        </ModalShell>
      )}
    </Bloco>
  );
}
