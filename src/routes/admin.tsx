import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  LayoutDashboard,
  Package,
  ShieldAlert,
  ShoppingBag,
  Tags,
  Users,
} from "lucide-react";
import { z } from "zod";

import { GestaoArtigos } from "@/components/admin/artigos";
import { GestaoCategorias } from "@/components/admin/categorias";
import { GestaoDenuncias } from "@/components/admin/denuncias";
import { GestaoEncomendas } from "@/components/admin/encomendas";
import { AprovacaoProdutos } from "@/components/admin/produtos";
import { PainelResumo } from "@/components/admin/resumo";
import { Abas, type AbaAdmin, type AbaDefinicao } from "@/components/admin/ui";
import { GestaoUtilizadores } from "@/components/admin/utilizadores";
import { AppShell, Titulo } from "@/components/loja/layout";
import { Empty } from "@/components/machamba/ui";
import { resumoAdmin } from "@/lib/admin.functions";
import { useAuth } from "@/lib/auth";

const ABAS = z.enum([
  "resumo",
  "produtos",
  "encomendas",
  "utilizadores",
  "categorias",
  "denuncias",
  "artigos",
]);

const Busca = z.object({ aba: ABAS.optional() });

export const Route = createFileRoute("/admin")({
  validateSearch: (search) => Busca.parse(search),
  head: () => ({ meta: [{ title: "Painel de administração — Machamba Digital" }] }),
  component: PaginaAdmin,
});

function PaginaAdmin() {
  const { user, admin, carregando } = useAuth();
  const navigate = useNavigate({ from: "/admin" });
  const { aba = "resumo" } = Route.useSearch();

  const resumo = useQuery({
    queryKey: ["admin-resumo"],
    queryFn: () => resumoAdmin(),
    enabled: Boolean(user && admin),
    refetchInterval: 120_000,
  });

  const abrirAba = (chave: AbaAdmin) => void navigate({ search: { aba: chave } });

  if (carregando)
    return (
      <AppShell>
        <Titulo>Painel de administração</Titulo>
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </AppShell>
    );

  if (!user)
    return (
      <AppShell>
        <Titulo>Painel de administração</Titulo>
        <Empty
          icon={<LayoutDashboard className="size-7" />}
          title="Entra para continuar"
          text="Esta área é reservada à equipa da Machamba Digital."
          action="Entrar"
          onAction={() => void navigate({ to: "/auth", search: { voltar: "/admin" } })}
        />
      </AppShell>
    );

  if (!admin)
    return (
      <AppShell>
        <Titulo>Painel de administração</Titulo>
        <Empty
          icon={<LayoutDashboard className="size-7" />}
          title="Sem permissão"
          text="A tua conta não tem acesso de administrador. Fala com a equipa se precisares de acesso."
          action="Voltar à loja"
          onAction={() => void navigate({ to: "/" })}
        />
      </AppShell>
    );

  const dados = resumo.data;
  const abas: AbaDefinicao[] = [
    { chave: "resumo", rotulo: "Resumo", Icone: LayoutDashboard },
    {
      chave: "produtos",
      rotulo: "Aprovações",
      Icone: Package,
      badge: dados?.produtos.pendentes,
    },
    {
      chave: "encomendas",
      rotulo: "Encomendas",
      Icone: ShoppingBag,
      badge: dados?.encomendas.aguardaPagamento,
    },
    { chave: "utilizadores", rotulo: "Utilizadores", Icone: Users },
    { chave: "categorias", rotulo: "Categorias", Icone: Tags },
    {
      chave: "denuncias",
      rotulo: "Denúncias",
      Icone: ShieldAlert,
      badge: dados?.denunciasAbertas,
    },
    {
      chave: "artigos",
      rotulo: "Artigos",
      Icone: BookOpen,
      badge: dados ? dados.artigos.total - dados.artigos.publicados : undefined,
    },
  ];

  return (
    <AppShell>
      <Titulo
        acao={
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Administração
          </span>
        }
      >
        Painel de administração
      </Titulo>

      <Abas abas={abas} ativa={aba} onMudar={abrirAba} />

      <div className="mt-4">
        {aba === "resumo" && (
          <PainelResumo
            dados={dados}
            carregando={resumo.isLoading}
            falhou={resumo.isError}
            aoAbrirAba={abrirAba}
          />
        )}
        {aba === "produtos" && <AprovacaoProdutos />}
        {aba === "encomendas" && <GestaoEncomendas />}
        {aba === "utilizadores" && <GestaoUtilizadores />}
        {aba === "categorias" && <GestaoCategorias />}
        {aba === "denuncias" && <GestaoDenuncias />}
        {aba === "artigos" && <GestaoArtigos />}
      </div>
    </AppShell>
  );
}
