import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";

import { AppShell, Titulo } from "@/components/loja/layout";
import { GrelhaProdutos } from "@/components/loja/produto-card";
import { Empty } from "@/components/machamba/ui";
import { useAuth } from "@/lib/auth";
import { listarFavoritos } from "@/lib/machamba";

export const Route = createFileRoute("/favoritos")({
  head: () => ({ meta: [{ title: "Favoritos — Machamba Digital" }] }),
  component: PaginaFavoritos,
});

function PaginaFavoritos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const favoritos = useQuery({
    queryKey: ["favoritos", user?.id],
    queryFn: () => listarFavoritos(user!.id),
    enabled: Boolean(user),
  });
  return (
    <AppShell>
      <Titulo>Favoritos</Titulo>
      {!user ? (
        <Empty
          icon={<Heart className="size-7" />}
          title="Entra para guardar produtos"
          text="Com conta, os teus favoritos ficam guardados em qualquer telemóvel."
          action="Entrar"
          onAction={() => void navigate({ to: "/auth", search: { voltar: "/favoritos" } })}
        />
      ) : favoritos.isLoading ? (
        <GrelhaProdutos produtos={[]} carregando />
      ) : favoritos.data?.produtos.length ? (
        <GrelhaProdutos produtos={favoritos.data.produtos} />
      ) : (
        <Empty
          icon={<Heart className="size-7" />}
          title="Ainda não guardaste produtos"
          text="Toca no coração de um produto para o encontrares aqui."
          action="Explorar loja"
          onAction={() => void navigate({ to: "/pesquisa" })}
        />
      )}
    </AppShell>
  );
}
