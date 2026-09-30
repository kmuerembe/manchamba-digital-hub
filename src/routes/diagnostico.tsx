import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppShell } from "@/components/loja/layout";
import { DiagnosisView } from "@/components/machamba/diagnostico";

export const Route = createFileRoute("/diagnostico")({
  head: () => ({ meta: [{ title: "Diagnóstico de culturas — Machamba Digital" }] }),
  component: PaginaDiagnostico,
});

function PaginaDiagnostico() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <DiagnosisView
        showNotice={(mensagem) => toast(mensagem)}
        pedirEntrada={() => void navigate({ to: "/auth", search: { voltar: "/diagnostico" } })}
      />
    </AppShell>
  );
}
