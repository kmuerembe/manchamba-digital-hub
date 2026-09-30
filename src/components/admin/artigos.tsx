import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AcaoRapida, Bloco, CAMPO, Esqueleto, Etiqueta } from "@/components/admin/ui";
import { AppButton, ModalShell } from "@/components/machamba/ui";
import { useAuth } from "@/lib/auth";
import {
  apagarArtigo,
  gerarSlug,
  guardarArtigo,
  listarArtigosAdmin,
  type ArtigoAdmin,
} from "@/lib/admin";
import { dataCurta } from "@/lib/formato";

type Formulario = {
  id?: string;
  titulo: string;
  slug: string;
  resumo: string;
  conteudo: string;
  imagemUrl: string;
  publicado: boolean;
};

const VAZIO: Formulario = {
  titulo: "",
  slug: "",
  resumo: "",
  conteudo: "",
  imagemUrl: "",
  publicado: false,
};

export function GestaoArtigos() {
  const { user } = useAuth();
  const [emEdicao, setEmEdicao] = useState<Formulario | null>(null);
  const queryClient = useQueryClient();

  const artigos = useQuery({ queryKey: ["admin-artigos"], queryFn: listarArtigosAdmin });

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-artigos"] });
    void queryClient.invalidateQueries({ queryKey: ["artigos"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-resumo"] });
  };

  const guardar = useMutation({
    mutationFn: (dados: Formulario) => guardarArtigo({ ...dados, autorId: user?.id ?? "" }),
    onSuccess: (_resultado, dados) => {
      toast.success(dados.id ? "Artigo actualizado" : "Artigo criado");
      setEmEdicao(null);
      invalidar();
    },
    onError: () => toast.error("Não foi possível guardar o artigo"),
  });

  const publicar = useMutation({
    mutationFn: (dados: { artigo: ArtigoAdmin; publicado: boolean }) =>
      guardarArtigo({
        id: dados.artigo.id,
        titulo: dados.artigo.titulo,
        slug: dados.artigo.slug,
        resumo: dados.artigo.resumo ?? "",
        conteudo: dados.artigo.conteudo ?? "",
        imagemUrl: dados.artigo.imagemUrl ?? "",
        publicado: dados.publicado,
        autorId: user?.id ?? "",
      }),
    onSuccess: (_resultado, dados) => {
      toast.success(dados.publicado ? "Artigo publicado" : "Artigo despublicado");
      invalidar();
    },
    onError: () => toast.error("Não foi possível alterar a publicação"),
  });

  const apagar = useMutation({
    mutationFn: (id: string) => apagarArtigo(id),
    onSuccess: () => {
      toast.success("Artigo apagado");
      invalidar();
    },
    onError: () => toast.error("Não foi possível apagar o artigo"),
  });

  return (
    <Bloco
      titulo="Artigos"
      descricao="Conteúdos da secção Aprender — publica ou guarda como rascunho."
      acao={
        <AppButton onClick={() => setEmEdicao({ ...VAZIO })}>
          <Plus className="size-4" /> Novo artigo
        </AppButton>
      }
    >
      {artigos.isLoading ? (
        <Esqueleto linhas={3} />
      ) : artigos.isError ? (
        <p className="text-sm text-destructive">Não foi possível carregar os artigos.</p>
      ) : !artigos.data?.length ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <BookOpen className="size-4" /> Ainda não há artigos. Escreve o primeiro.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {artigos.data.map((artigo) => (
            <li key={artigo.id} className="flex flex-wrap items-start gap-3 py-3">
              <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary">
                {artigo.imagemUrl ? (
                  <img src={artigo.imagemUrl} alt="" className="size-full object-cover" />
                ) : (
                  <BookOpen className="size-4 text-muted-foreground" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="truncate text-sm">{artigo.titulo}</strong>
                  <Etiqueta
                    tom={
                      artigo.publicado
                        ? "bg-success/15 text-primary"
                        : "bg-warning/20 text-accent-foreground"
                    }
                  >
                    {artigo.publicado ? "Publicado" : "Rascunho"}
                  </Etiqueta>
                </div>
                {artigo.resumo && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {artigo.resumo}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  /{artigo.slug} · {artigo.autor ?? "Equipa"} · {dataCurta(artigo.criadoEm)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <AcaoRapida
                  tom={
                    artigo.publicado
                      ? "border-border bg-card hover:border-primary"
                      : "border-primary bg-primary text-primary-foreground hover:opacity-90"
                  }
                  desativado={publicar.isPending}
                  onClick={() => publicar.mutate({ artigo, publicado: !artigo.publicado })}
                >
                  {artigo.publicado ? (
                    <>
                      <EyeOff className="size-3.5" /> Despublicar
                    </>
                  ) : (
                    <>
                      <Eye className="size-3.5" /> Publicar
                    </>
                  )}
                </AcaoRapida>
                <AcaoRapida
                  onClick={() =>
                    setEmEdicao({
                      id: artigo.id,
                      titulo: artigo.titulo,
                      slug: artigo.slug,
                      resumo: artigo.resumo ?? "",
                      conteudo: artigo.conteudo ?? "",
                      imagemUrl: artigo.imagemUrl ?? "",
                      publicado: artigo.publicado,
                    })
                  }
                >
                  <Pencil className="size-3.5" /> Editar
                </AcaoRapida>
                <AcaoRapida
                  tom="border-destructive/40 bg-destructive/10 text-destructive hover:border-destructive"
                  desativado={apagar.isPending}
                  onClick={() => {
                    if (window.confirm(`Apagar o artigo "${artigo.titulo}"?`))
                      apagar.mutate(artigo.id);
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
          title={emEdicao.id ? "Editar artigo" : "Novo artigo"}
          onClose={() => setEmEdicao(null)}
        >
          <form
            className="mt-4 space-y-3"
            onSubmit={(evento) => {
              evento.preventDefault();
              if (emEdicao.titulo.trim().length < 4) {
                toast.error("O título precisa de pelo menos 4 letras");
                return;
              }
              guardar.mutate(emEdicao);
            }}
          >
            <label className="block text-sm">
              <span className="font-semibold">Título</span>
              <input
                value={emEdicao.titulo}
                onChange={(evento) =>
                  setEmEdicao((atual) => {
                    if (!atual) return atual;
                    const titulo = evento.target.value;
                    return { ...atual, titulo, slug: atual.id ? atual.slug : gerarSlug(titulo) };
                  })
                }
                className={`${CAMPO} mt-1`}
                placeholder="Ex.: Como conservar hortaliças depois da colheita"
                required
              />
            </label>

            <label className="block text-sm">
              <span className="font-semibold">Slug</span>
              <input
                value={emEdicao.slug}
                onChange={(evento) =>
                  setEmEdicao((atual) =>
                    atual ? { ...atual, slug: gerarSlug(evento.target.value) } : atual,
                  )
                }
                className={`${CAMPO} mt-1`}
                placeholder="conservar-hortalicas"
              />
            </label>

            <label className="block text-sm">
              <span className="font-semibold">Resumo</span>
              <textarea
                value={emEdicao.resumo}
                onChange={(evento) =>
                  setEmEdicao((atual) =>
                    atual ? { ...atual, resumo: evento.target.value } : atual,
                  )
                }
                rows={2}
                className={`${CAMPO} mt-1 h-auto py-2`}
                placeholder="Uma frase que aparece na lista de artigos."
              />
            </label>

            <label className="block text-sm">
              <span className="font-semibold">Conteúdo</span>
              <textarea
                value={emEdicao.conteudo}
                onChange={(evento) =>
                  setEmEdicao((atual) =>
                    atual ? { ...atual, conteudo: evento.target.value } : atual,
                  )
                }
                rows={7}
                className={`${CAMPO} mt-1 h-auto py-2`}
                placeholder="Escreve o artigo…"
              />
            </label>

            <label className="block text-sm">
              <span className="font-semibold">Imagem (endereço)</span>
              <input
                value={emEdicao.imagemUrl}
                onChange={(evento) =>
                  setEmEdicao((atual) =>
                    atual ? { ...atual, imagemUrl: evento.target.value } : atual,
                  )
                }
                className={`${CAMPO} mt-1`}
                placeholder="https://…"
              />
            </label>

            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={emEdicao.publicado}
                onChange={(evento) =>
                  setEmEdicao((atual) =>
                    atual ? { ...atual, publicado: evento.target.checked } : atual,
                  )
                }
                className="size-4 accent-primary"
              />
              Publicar já na secção Aprender
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <AppButton variant="plain" onClick={() => setEmEdicao(null)}>
                Cancelar
              </AppButton>
              <AppButton type="submit" disabled={guardar.isPending}>
                <BookOpen className="size-4" /> {guardar.isPending ? "A guardar…" : "Guardar"}
              </AppButton>
            </div>
          </form>
        </ModalShell>
      )}
    </Bloco>
  );
}
