import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { AppShell } from "@/components/loja/layout";
import { MessagesView } from "@/components/machamba/mensagens";

export const Route = createFileRoute("/mensagens")({
  validateSearch: (search: Record<string, unknown>) => ({
    conversa: typeof search["conversa"] === "string" ? search["conversa"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Mensagens — Machamba Digital" }] }),
  component: PaginaMensagens,
});

function PaginaMensagens() {
  const { conversa } = Route.useSearch();
  const navigate = useNavigate({ from: "/mensagens" });
  return (
    <AppShell>
      <MessagesView
        conversaAberta={conversa ?? null}
        abrirConversaId={(id) => void navigate({ search: { conversa: id ?? undefined } })}
        pedirEntrada={() => void navigate({ to: "/auth", search: { voltar: "/mensagens" } })}
      />
    </AppShell>
  );
}
