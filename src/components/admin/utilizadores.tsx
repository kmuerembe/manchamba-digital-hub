import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Search, ShieldCheck, ShieldOff, Store, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Bloco, Esqueleto, Etiqueta, Filtros } from "@/components/admin/ui";
import { useAuth } from "@/lib/auth";
import { atualizarPerfilAdmin, listarUtilizadoresAdmin, type UtilizadorAdmin } from "@/lib/admin";
import { definirAdministrador } from "@/lib/admin.functions";
import { dataCurta, mzn } from "@/lib/formato";

type Filtro = "todos" | "admins" | "vendedores" | "novos";

const OPCOES: { chave: Filtro; rotulo: string }[] = [
  { chave: "todos", rotulo: "Todos" },
  { chave: "admins", rotulo: "Administradores" },
  { chave: "vendedores", rotulo: "Vendedores" },
  { chave: "novos", rotulo: "Novos (30 dias)" },
];

function inicial(nome: string): string {
  return nome.trim().charAt(0).toUpperCase() || "U";
}

export function GestaoUtilizadores() {
  const { user, recarregarPerfil } = useAuth();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [termo, setTermo] = useState("");
  const queryClient = useQueryClient();

  const utilizadores = useQuery({
    queryKey: ["admin-utilizadores"],
    queryFn: listarUtilizadoresAdmin,
  });

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-utilizadores"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-resumo"] });
  };

  const definirAdmin = useMutation({
    mutationFn: (dados: { utilizadorId: string; admin: boolean }) =>
      definirAdministrador({ data: dados }),
    onSuccess: (resultado, dados) => {
      toast.success(
        dados.admin
          ? `${resultado.nome || "O utilizador"} passou a administrador`
          : "Acesso de administrador removido",
      );
      invalidar();
      if (dados.utilizadorId === user?.id) void recarregarPerfil();
    },
    onError: (erro: Error) => toast.error(erro.message || "Não foi possível alterar o papel"),
  });

  const editarPerfil = useMutation({
    mutationFn: (dados: { id: string; verificado?: boolean; ativo?: boolean }) =>
      atualizarPerfilAdmin(dados.id, { verificado: dados.verificado, ativo: dados.ativo }),
    onSuccess: () => {
      toast.success("Perfil actualizado");
      invalidar();
    },
    onError: () => toast.error("Não foi possível actualizar o perfil"),
  });

  const visiveis = useMemo(() => {
    const alvo = termo.trim().toLowerCase();
    const limite = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return (utilizadores.data ?? []).filter((conta) => {
      if (filtro === "admins" && !conta.ehAdmin) return false;
      if (filtro === "vendedores" && conta.produtos === 0) return false;
      if (filtro === "novos" && new Date(conta.criadoEm).getTime() < limite) return false;
      if (!alvo) return true;
      return [conta.nome, conta.email ?? "", conta.telefone ?? "", conta.tipo]
        .join(" ")
        .toLowerCase()
        .includes(alvo);
    });
  }, [utilizadores.data, filtro, termo]);

  return (
    <Bloco
      titulo="Utilizadores"
      descricao="Gere contas, vendedores e quem tem acesso ao painel."
      acao={<span className="text-xs text-muted-foreground">{visiveis.length} conta(s)</span>}
    >
      <div className="space-y-3">
        <Filtros opcoes={OPCOES} valor={filtro} onMudar={setFiltro} />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={termo}
            onChange={(evento) => setTermo(evento.target.value)}
            placeholder="Procurar por nome, email, telemóvel…"
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>

        {utilizadores.isLoading ? (
          <Esqueleto linhas={4} />
        ) : utilizadores.isError ? (
          <p className="text-sm text-destructive">Não foi possível carregar os utilizadores.</p>
        ) : !visiveis.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma conta encontrada com estes filtros.
          </p>
        ) : (
          <ul className="space-y-2">
            {visiveis.map((conta: UtilizadorAdmin) => {
              const eu = conta.id === user?.id;
              return (
                <li key={conta.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 font-display font-bold text-primary">
                      {conta.verificado ? (
                        <BadgeCheck className="size-5" />
                      ) : (
                        <span>{inicial(conta.nome)}</span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="truncate text-sm">{conta.nome}</strong>
                        {eu && (
                          <Etiqueta tom="bg-secondary text-secondary-foreground">És tu</Etiqueta>
                        )}
                        {conta.ehAdmin && (
                          <Etiqueta tom="bg-primary/15 text-primary">
                            <ShieldCheck className="mr-1 size-3" /> Administrador
                          </Etiqueta>
                        )}
                        {conta.produtos > 0 && (
                          <Etiqueta tom="bg-accent/25 text-accent-foreground">
                            <Store className="mr-1 size-3" /> Vendedor
                          </Etiqueta>
                        )}
                        {!conta.ativo && (
                          <Etiqueta tom="bg-destructive/10 text-destructive">Inactivo</Etiqueta>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {[conta.email, conta.telefone, `${conta.tipo}`].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[conta.distrito, conta.provincia].filter(Boolean).join(", ") ||
                          "Sem localização"}{" "}
                        · desde {dataCurta(conta.criadoEm)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-xs">
                      <p>
                        <strong className="font-display text-sm">{conta.produtos}</strong> anúncios
                      </p>
                      <p>
                        <strong className="font-display text-sm">{conta.encomendas}</strong>{" "}
                        encomendas
                      </p>
                      <p className="text-muted-foreground">{mzn(conta.gasto)}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-2">
                    <button
                      type="button"
                      disabled={definirAdmin.isPending || (eu && conta.ehAdmin)}
                      onClick={() =>
                        definirAdmin.mutate({ utilizadorId: conta.id, admin: !conta.ehAdmin })
                      }
                      title={
                        conta.ehAdmin && eu ? "Não podes retirar o teu próprio acesso" : undefined
                      }
                      className={`inline-flex min-h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold disabled:opacity-50 ${
                        conta.ehAdmin
                          ? "border-destructive/40 bg-destructive/10 text-destructive"
                          : "border-primary bg-primary text-primary-foreground"
                      }`}
                    >
                      {conta.ehAdmin ? (
                        <>
                          <ShieldOff className="size-3.5" /> Retirar admin
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="size-3.5" /> Dar admin
                        </>
                      )}
                    </button>

                    <label className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={conta.verificado}
                        disabled={editarPerfil.isPending}
                        onChange={(evento) =>
                          editarPerfil.mutate({
                            id: conta.id,
                            verificado: evento.target.checked,
                          })
                        }
                        className="size-3.5 accent-primary"
                      />
                      Verificado
                    </label>

                    <label className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={conta.ativo}
                        disabled={editarPerfil.isPending}
                        onChange={(evento) =>
                          editarPerfil.mutate({ id: conta.id, ativo: evento.target.checked })
                        }
                        className="size-3.5 accent-primary"
                      />
                      Conta activa
                    </label>

                    {!conta.papeis.length && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <UserRound className="size-3.5" /> sem papéis especiais
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
