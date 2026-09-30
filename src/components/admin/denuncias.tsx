import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Archive, Check, Clock3, ExternalLink, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AcaoRapida, Bloco, CAMPO, Esqueleto, Etiqueta, Filtros } from "@/components/admin/ui";
import { AppButton, ModalShell } from "@/components/machamba/ui";
import { listarDenunciasAdmin, resolverDenuncia, type DenunciaAdmin } from "@/lib/admin";
import { dataHora } from "@/lib/formato";

type Filtro = "aberta" | "em_analise" | "resolvida" | "todas";

const OPCOES: { chave: Filtro; rotulo: string }[] = [
  { chave: "aberta", rotulo: "Abertas" },
  { chave: "em_analise", rotulo: "Em análise" },
  { chave: "resolvida", rotulo: "Resolvidas" },
  { chave: "todas", rotulo: "Todas" },
];

const ESTADO: Record<string, { rotulo: string; tom: string }> = {
  aberta: { rotulo: "Aberta", tom: "bg-destructive/10 text-destructive" },
  em_analise: { rotulo: "Em análise", tom: "bg-warning/20 text-accent-foreground" },
  resolvida: { rotulo: "Resolvida", tom: "bg-success/15 text-primary" },
  arquivada: { rotulo: "Arquivada", tom: "bg-muted text-muted-foreground" },
};

export function GestaoDenuncias() {
  const [filtro, setFiltro] = useState<Filtro>("aberta");
  const [resolver, setResolver] = useState<DenunciaAdmin | null>(null);
  const [nota, setNota] = useState("");
  const queryClient = useQueryClient();

  const denuncias = useQuery({
    queryKey: ["admin-denuncias", filtro],
    queryFn: () => listarDenunciasAdmin(filtro),
  });

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-denuncias"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-resumo"] });
  };

  const marcar = useMutation({
    mutationFn: (dados: { id: string; estado: string; resolucao?: string }) =>
      resolverDenuncia(dados.id, dados.estado, dados.resolucao ?? ""),
    onSuccess: (_resultado, dados) => {
      toast.success(
        dados.estado === "resolvida" ? "Denúncia resolvida" : "Estado da denúncia actualizado",
      );
      setResolver(null);
      setNota("");
      invalidar();
    },
    onError: () => toast.error("Não foi possível actualizar a denúncia"),
  });

  return (
    <Bloco
      titulo="Denúncias"
      descricao="Queixas enviadas por compradores e vendedores sobre anúncios e comportamentos."
      acao={<Filtros opcoes={OPCOES} valor={filtro} onMudar={setFiltro} />}
    >
      {denuncias.isLoading ? (
        <Esqueleto linhas={3} />
      ) : denuncias.isError ? (
        <p className="text-sm text-destructive">Não foi possível carregar as denúncias.</p>
      ) : !denuncias.data?.length ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <ShieldAlert className="size-4" /> Nada por resolver por aqui.
        </p>
      ) : (
        <ul className="space-y-2">
          {denuncias.data.map((denuncia) => {
            const estado = ESTADO[denuncia.estado] ?? {
              rotulo: denuncia.estado,
              tom: "bg-muted text-muted-foreground",
            };
            return (
              <li key={denuncia.id} className="rounded-xl border border-border bg-background p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold">
                      <ShieldAlert className="size-4 text-destructive" />
                      {denuncia.motivo.replace(/_/g, " ")}
                    </span>
                    <Etiqueta tom={estado.tom}>{estado.rotulo}</Etiqueta>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="size-3.5" /> {dataHora(denuncia.criadoEm)}
                  </span>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  Denunciado por <strong className="text-foreground">{denuncia.denunciante}</strong>
                  {denuncia.produtoId && (
                    <>
                      {" · "}
                      <Link
                        to="/produto/$id"
                        params={{ id: denuncia.produtoId }}
                        className="inline-flex items-center gap-1 font-semibold text-primary"
                      >
                        <ExternalLink className="size-3" />
                        {denuncia.produtoTitulo ?? "ver anúncio"}
                      </Link>
                    </>
                  )}
                </p>

                {denuncia.descricao && (
                  <p className="mt-2 rounded-lg bg-secondary/60 p-2 text-xs">
                    {denuncia.descricao}
                  </p>
                )}
                {denuncia.resolucao && (
                  <p className="mt-2 rounded-lg bg-success/10 p-2 text-xs text-primary">
                    Resolução: {denuncia.resolucao}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
                  {denuncia.estado !== "em_analise" && denuncia.estado !== "resolvida" && (
                    <AcaoRapida
                      onClick={() => marcar.mutate({ id: denuncia.id, estado: "em_analise" })}
                      desativado={marcar.isPending}
                    >
                      <Clock3 className="size-3.5" /> Pôr em análise
                    </AcaoRapida>
                  )}
                  <AcaoRapida
                    tom="border-primary bg-primary text-primary-foreground hover:opacity-90"
                    desativado={marcar.isPending}
                    onClick={() => {
                      setResolver(denuncia);
                      setNota(denuncia.resolucao ?? "");
                    }}
                  >
                    <Check className="size-3.5" /> Resolver
                  </AcaoRapida>
                  {denuncia.estado !== "arquivada" && (
                    <AcaoRapida
                      tom="border-border bg-card hover:border-primary"
                      desativado={marcar.isPending}
                      onClick={() => marcar.mutate({ id: denuncia.id, estado: "arquivada" })}
                    >
                      <Archive className="size-3.5" /> Arquivar
                    </AcaoRapida>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {resolver && (
        <ModalShell title="Resolver denúncia" onClose={() => setResolver(null)}>
          <form
            className="mt-4 space-y-3"
            onSubmit={(evento) => {
              evento.preventDefault();
              marcar.mutate({ id: resolver.id, estado: "resolvida", resolucao: nota });
            }}
          >
            <p className="text-sm text-muted-foreground">
              Motivo:{" "}
              <strong className="text-foreground">{resolver.motivo.replace(/_/g, " ")}</strong>
              {resolver.produtoTitulo && ` · ${resolver.produtoTitulo}`}
            </p>
            <label className="block text-sm">
              <span className="font-semibold">O que foi feito</span>
              <textarea
                value={nota}
                onChange={(evento) => setNota(evento.target.value)}
                rows={4}
                className={`${CAMPO} mt-1 h-auto py-2`}
                placeholder="Ex.: anúncio removido, vendedor avisado, reembolso processado…"
              />
            </label>
            <div className="flex justify-end gap-2">
              <AppButton variant="plain" onClick={() => setResolver(null)}>
                Cancelar
              </AppButton>
              <AppButton type="submit" disabled={marcar.isPending}>
                <Check className="size-4" /> Marcar como resolvida
              </AppButton>
            </div>
          </form>
        </ModalShell>
      )}
    </Bloco>
  );
}
