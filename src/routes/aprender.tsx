import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Clock3 } from "lucide-react";

import { AppShell, Titulo } from "@/components/loja/layout";
import { Empty } from "@/components/machamba/ui";
import { listarArtigos } from "@/lib/machamba";

export const Route = createFileRoute("/aprender")({
  head: () => ({ meta: [{ title: "Aprender — Machamba Digital" }] }),
  component: PaginaAprender,
});

function PaginaAprender() {
  const artigos = useQuery({ queryKey: ["artigos"], queryFn: listarArtigos });
  return (
    <AppShell>
      <Titulo>Aprender</Titulo>
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">
        Conselhos práticos para vender melhor e produzir melhor.
      </p>
      {artigos.data?.length ? (
        <div className="grid gap-3 md:grid-cols-3">
          {artigos.data.map((artigo) => (
            <article key={artigo.id} className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold leading-tight">{artigo.titulo}</h2>
              {artigo.resumo && (
                <p className="mt-2 text-sm text-muted-foreground">{artigo.resumo}</p>
              )}
              <p className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" />{" "}
                {new Date(artigo.criado_em).toLocaleDateString("pt-PT")}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          icon={<BookOpen className="size-7" />}
          title="Ainda não há artigos publicados"
          text="Assim que a equipa publicar conteúdos, eles aparecem aqui."
        />
      )}
    </AppShell>
  );
}
