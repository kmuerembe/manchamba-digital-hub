import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CircleUserRound, LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { AppButton, Empty, ModalShell } from "@/components/machamba/ui";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { listarMeusProdutos, listarNotificacoes, marcarNotificacoesLidas } from "@/lib/machamba";
import { citiesOf, provinceNames } from "@/lib/mozambique";

export function ProfileView({
  showNotice,
  pedirEntrada,
}: {
  showNotice: (mensagem: string) => void;
  pedirEntrada: () => void;
}) {
  const { user, perfil, admin, sair, recarregarPerfil } = useAuth();
  const queryClient = useQueryClient();
  const [editar, setEditar] = useState(false);
  const [verAvisos, setVerAvisos] = useState(false);

  const notificacoes = useQuery({
    queryKey: ["notificacoes", user?.id],
    queryFn: () => listarNotificacoes(user!.id),
    enabled: Boolean(user),
  });

  const meusProdutos = useQuery({
    queryKey: ["meus-produtos", user?.id],
    queryFn: () => listarMeusProdutos(user!.id),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!user) return;
    const canal = supabase
      .channel("notificacoes-perfil")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificacoes", filter: `utilizador_id=eq.${user.id}` },
        () => void queryClient.invalidateQueries({ queryKey: ["notificacoes", user.id] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [user, queryClient]);

  if (!user || !perfil) {
    return (
      <section className="mx-auto max-w-2xl animate-enter">
        <h1 className="font-display text-3xl font-bold">O meu perfil</h1>
        <Empty
          icon={<CircleUserRound className="size-7" />}
          title="Ainda não entraste"
          text="Cria a tua conta para publicar anúncios, conversar e guardar as tuas análises."
          action="Entrar ou criar conta"
          onAction={pedirEntrada}
        />
      </section>
    );
  }

  const porLer = notificacoes.data?.filter((item) => !item.lida).length ?? 0;
  const iniciais = (perfil.nome || "Utilizador").slice(0, 2).toUpperCase();

  return (
    <section className="mx-auto max-w-2xl animate-enter">
      <h1 className="font-display text-3xl font-bold">O meu perfil</h1>

      <div className="mt-6 flex items-center gap-4 border-y border-border py-5">
        <span className="grid size-16 place-items-center rounded-full bg-primary font-display text-xl font-bold text-primary-foreground">
          {iniciais}
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-semibold">{perfil.nome || "Sem nome"}</h2>
          <p className="truncate text-sm text-muted-foreground">
            {perfil.tipo} · {perfil.distrito ?? perfil.provincia ?? "Moçambique"}
          </p>
          {perfil.verificado && (
            <p className="mt-1 flex items-center gap-1 text-xs text-primary">
              <ShieldCheck className="size-3.5" /> Perfil verificado
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <AppButton variant="outline" onClick={() => setEditar(true)}>
          Editar perfil
        </AppButton>
        <AppButton variant="outline" onClick={() => setVerAvisos(true)}>
          Notificações <Bell className="size-4" />
          {porLer > 0 && (
            <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">{porLer}</span>
          )}
        </AppButton>
      </div>

      <div className="mt-6">
        <h2 className="font-display text-lg font-semibold">Os meus anúncios</h2>
        {meusProdutos.data?.length ? (
          <div className="mt-3 space-y-2">
            {meusProdutos.data.map((produto) => (
              <div key={produto.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
                <span className="min-w-0">
                  <strong className="block truncate text-sm">{produto.titulo}</strong>
                  <small className="text-xs text-muted-foreground">
                    {produto.preco} MZN/{produto.unidade}
                  </small>
                </span>
                <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {produto.estado === "pendente"
                    ? "à espera de aprovação"
                    : produto.estado === "ativo"
                      ? "no mercado"
                      : produto.estado}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Ainda não publicaste anúncios.</p>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {admin && (
          <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-muted-foreground">
            <ShieldCheck className="size-4" /> Conta de administração
          </span>
        )}
        <AppButton
          variant="plain"
          onClick={() => {
            void sair().then(() => showNotice("Saíste da tua conta"));
          }}
        >
          <LogOut className="size-4" /> Sair da conta
        </AppButton>
      </div>

      {editar && (
        <EditarPerfil
          onClose={() => setEditar(false)}
          onDone={async () => {
            setEditar(false);
            await recarregarPerfil();
            showNotice("Perfil atualizado");
          }}
        />
      )}

      {verAvisos && (
        <ModalShell
          title="Notificações"
          onClose={() => {
            setVerAvisos(false);
            void marcarNotificacoesLidas(user.id).then(() =>
              queryClient.invalidateQueries({ queryKey: ["notificacoes", user.id] }),
            );
          }}
        >
          <div className="mt-4 space-y-2">
            {notificacoes.data?.length ? (
              notificacoes.data.map((aviso) => (
                <div key={aviso.id} className={`rounded-lg border p-3 ${aviso.lida ? "border-border" : "border-primary/40 bg-primary/5"}`}>
                  <strong className="block text-sm">{aviso.titulo}</strong>
                  {aviso.mensagem && <p className="text-xs text-muted-foreground">{aviso.mensagem}</p>}
                  <small className="mt-1 block text-[10px] text-muted-foreground">
                    {new Date(aviso.criado_em).toLocaleString("pt-PT")}
                  </small>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Ainda não tens avisos.</p>
            )}
          </div>
        </ModalShell>
      )}
    </section>
  );
}

function EditarPerfil({ onClose, onDone }: { onClose: () => void; onDone: () => Promise<void> }) {
  const { user, perfil } = useAuth();
  const [nome, setNome] = useState(perfil?.nome ?? "");
  const [telefone, setTelefone] = useState(perfil?.telefone ?? "");
  const [tipo, setTipo] = useState(perfil?.tipo ?? "agricultor");
  const [provincia, setProvincia] = useState(perfil?.provincia ?? "");
  const [distrito, setDistrito] = useState(perfil?.distrito ?? "");
  const [agronomo, setAgronomo] = useState(perfil?.sou_agronomo ?? false);

  const guardar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ nome, telefone: telefone || null, tipo, provincia: provincia || null, distrito: distrito || null, sou_agronomo: agronomo })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => void onDone(),
  });

  const distritos = citiesOf(provincia);

  return (
    <ModalShell title="Editar perfil" onClose={onClose}>
      <form
        className="mt-5 space-y-4"
        onSubmit={(evento) => {
          evento.preventDefault();
          guardar.mutate();
        }}
      >
        <label className="block text-sm font-semibold">
          Nome
          <input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal" />
        </label>
        <label className="block text-sm font-semibold">
          Telemóvel
          <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="84 123 4567" className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal" />
        </label>
        <label className="block text-sm font-semibold">
          Sou
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal">
            <option value="agricultor">Agricultor</option>
            <option value="comprador">Comprador</option>
            <option value="agronomo">Agrónomo</option>
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            Província
            <select
              value={provincia}
              onChange={(e) => {
                setProvincia(e.target.value);
                setDistrito("");
              }}
              className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal"
            >
              <option value="">Escolher</option>
              {provinceNames.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Cidade ou distrito
            <select
              value={distrito}
              disabled={!distritos.length}
              onChange={(e) => setDistrito(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-3 font-normal disabled:opacity-60"
            >
              <option value="">Escolher</option>
              {distritos.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={agronomo} onChange={(e) => setAgronomo(e.target.checked)} className="size-4" />
          Sou agrónomo e posso rever diagnósticos
        </label>
        <AppButton type="submit" className="w-full" disabled={guardar.isPending}>
          Guardar alterações
        </AppButton>
      </form>
    </ModalShell>
  );
}
