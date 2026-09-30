import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Camera,
  ChevronRight,
  Heart,
  MessageCircle,
  Package,
  ShieldCheck,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/loja/layout";
import { ProfileView } from "@/components/machamba/perfil";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/conta")({
  head: () => ({ meta: [{ title: "A minha conta — Machamba Digital" }] }),
  component: PaginaConta,
});

const ATALHOS = [
  { to: "/pedidos", rotulo: "As minhas encomendas", Icone: Package },
  { to: "/vender", rotulo: "Vender e gerir a minha loja", Icone: Store },
  { to: "/favoritos", rotulo: "Favoritos", Icone: Heart },
  { to: "/mensagens", rotulo: "Mensagens", Icone: MessageCircle },
  { to: "/diagnostico", rotulo: "Diagnóstico de culturas", Icone: Camera },
  { to: "/aprender", rotulo: "Aprender", Icone: BookOpen },
] as const;

function PaginaConta() {
  const navigate = useNavigate();
  const { user, admin } = useAuth();
  const atalhos = admin
    ? [...ATALHOS, { to: "/admin" as const, rotulo: "Painel de administração", Icone: ShieldCheck }]
    : ATALHOS;
  return (
    <AppShell>
      {user && (
        <nav className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {atalhos.map(({ to, rotulo, Icone }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-semibold hover:border-primary"
            >
              <Icone className="size-4 text-primary" />
              <span className="min-w-0 flex-1 truncate">{rotulo}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </nav>
      )}
      <ProfileView
        showNotice={(mensagem) => toast(mensagem)}
        pedirEntrada={() => void navigate({ to: "/auth", search: { voltar: "/conta" } })}
      />
    </AppShell>
  );
}
