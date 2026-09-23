import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, MessageCircle, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AppButton, Empty } from "@/components/machamba/ui";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { enviarMensagem, listarConversas, listarMensagens } from "@/lib/machamba";

export function MessagesView({
  conversaAberta,
  abrirConversaId,
  pedirEntrada,
}: {
  conversaAberta: string | null;
  abrirConversaId: (id: string | null) => void;
  pedirEntrada: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const conversas = useQuery({
    queryKey: ["conversas", user?.id],
    queryFn: () => listarConversas(user!.id),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!user) return;
    const canal = supabase
      .channel("conversas-lista")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversas" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["conversas", user.id] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [user, queryClient]);

  if (!user) {
    return (
      <section className="mx-auto max-w-2xl animate-enter">
        <h1 className="font-display text-3xl font-bold">Mensagens</h1>
        <Empty
          icon={<MessageCircle className="size-7" />}
          title="Entra para conversar"
          text="Precisas de conta para falar com compradores e vendedores."
          action="Entrar ou criar conta"
          onAction={pedirEntrada}
        />
      </section>
    );
  }

  const conversa = conversas.data?.find((item) => item.id === conversaAberta) ?? null;
  if (conversa) {
    return <Chat conversa={conversa} onVoltar={() => abrirConversaId(null)} />;
  }

  return (
    <section className="mx-auto max-w-2xl animate-enter">
      <h1 className="font-display text-3xl font-bold">Mensagens</h1>
      <p className="mt-1 text-sm text-muted-foreground">Conversa diretamente com compradores e vendedores.</p>
      {conversas.data?.length ? (
        <div className="mt-6 space-y-2">
          {conversas.data.map((item) => (
            <button
              key={item.id}
              onClick={() => abrirConversaId(item.id)}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary font-display font-bold text-primary">
                {item.outroNome.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm">{item.outroNome}</strong>
                <span className="block truncate text-xs text-muted-foreground">
                  {item.ultimaMensagem ?? item.produtoTitulo ?? "Nova conversa"}
                </span>
              </span>
              {item.ultimaMensagemEm && (
                <small className="shrink-0 text-muted-foreground">
                  {new Date(item.ultimaMensagemEm).toLocaleDateString("pt-PT")}
                </small>
              )}
            </button>
          ))}
        </div>
      ) : (
        <Empty
          icon={<MessageCircle className="size-7" />}
          title="Ainda não tens conversas"
          text="Abre um anúncio e toca em contactar vendedor para começar."
        />
      )}
    </section>
  );
}

function Chat({
  conversa,
  onVoltar,
}: {
  conversa: { id: string; outroId: string; outroNome: string; produtoTitulo: string | null };
  onVoltar: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const fim = useRef<HTMLDivElement>(null);

  const mensagens = useQuery({
    queryKey: ["mensagens", conversa.id],
    queryFn: () => listarMensagens(conversa.id),
  });

  useEffect(() => {
    const canal = supabase
      .channel(`mensagens-${conversa.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens", filter: `conversa_id=eq.${conversa.id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["mensagens", conversa.id] });
          void queryClient.invalidateQueries({ queryKey: ["conversas", user?.id] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [conversa.id, queryClient, user?.id]);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [mensagens.data]);

  const enviar = useMutation({
    mutationFn: async (conteudo: string) => enviarMensagem(conversa.id, user!.id, conversa.outroId, conteudo),
    onSuccess: () => {
      setTexto("");
      void queryClient.invalidateQueries({ queryKey: ["mensagens", conversa.id] });
    },
  });

  return (
    <section className="mx-auto flex max-w-2xl animate-enter flex-col">
      <div className="flex items-center gap-2">
        <AppButton variant="plain" className="px-2" onClick={onVoltar} ariaLabel="Voltar às conversas">
          <ChevronLeft className="size-5" />
        </AppButton>
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-bold">{conversa.outroNome}</h1>
          {conversa.produtoTitulo && <p className="truncate text-xs text-muted-foreground">{conversa.produtoTitulo}</p>}
        </div>
      </div>

      <div className="mt-4 space-y-2 rounded-lg border border-border bg-card p-4">
        {mensagens.data?.length ? (
          mensagens.data.map((mensagem) => {
            const minha = mensagem.remetenteId === user?.id;
            return (
              <div key={mensagem.id} className={`flex ${minha ? "justify-end" : "justify-start"}`}>
                <p
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${minha ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
                >
                  {mensagem.conteudo}
                </p>
              </div>
            );
          })
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">Escreve a primeira mensagem.</p>
        )}
        <div ref={fim} />
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(evento) => {
          evento.preventDefault();
          const conteudo = texto.trim();
          if (conteudo) enviar.mutate(conteudo);
        }}
      >
        <input
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          placeholder="Escrever mensagem"
          className="h-11 flex-1 rounded-lg border border-border bg-card px-3 text-sm"
        />
        <AppButton type="submit" disabled={enviar.isPending} ariaLabel="Enviar mensagem">
          <Send className="size-4" />
        </AppButton>
      </form>
    </section>
  );
}
