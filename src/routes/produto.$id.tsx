import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  Heart,
  ImageOff,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, Badge } from "@/components/loja/layout";
import { GrelhaProdutos } from "@/components/loja/produto-card";
import { AppButton, Estrelas } from "@/components/machamba/ui";
import { useAuth } from "@/lib/auth";
import { useCarrinho } from "@/lib/carrinho";
import { mzn, percentagemDesconto } from "@/lib/formato";
import {
  abrirConversa,
  avaliacaoDoVendedor,
  alternarFavorito,
  listarFavoritos,
  listarProdutosDoVendedor,
  obterProduto,
} from "@/lib/machamba";

export const Route = createFileRoute("/produto/$id")({
  head: () => ({ meta: [{ title: "Produto — Machamba Digital" }] }),
  component: PaginaProduto,
});

function PaginaProduto() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { adicionar } = useCarrinho();
  const navigate = useNavigate();
  const [quantidade, setQuantidade] = useState(1);
  const [fotoAtiva, setFotoAtiva] = useState(0);

  const produto = useQuery({ queryKey: ["produto", id], queryFn: () => obterProduto(id) });
  const nota = useQuery({
    queryKey: ["avaliacao", produto.data?.vendedorId],
    queryFn: () => avaliacaoDoVendedor(produto.data!.vendedorId),
    enabled: Boolean(produto.data),
  });
  const doVendedor = useQuery({
    queryKey: ["produtos-vendedor", produto.data?.vendedorId, id],
    queryFn: () => listarProdutosDoVendedor(produto.data!.vendedorId, id),
    enabled: Boolean(produto.data),
  });
  const favoritos = useQuery({
    queryKey: ["favoritos", user?.id],
    queryFn: () => listarFavoritos(user!.id),
    enabled: Boolean(user),
  });
  const favorito = favoritos.data?.ids.includes(id) ?? false;
  const alternar = useMutation({
    mutationFn: () => alternarFavorito(user!.id, id, favorito),
    onSuccess: () => void favoritos.refetch(),
  });
  const contactar = useMutation({
    mutationFn: () => abrirConversa(user!.id, produto.data!.vendedorId, id),
    onSuccess: (conversaId) =>
      void navigate({ to: "/mensagens", search: { conversa: conversaId } }),
    onError: () => toast.error("Não foi possível abrir a conversa"),
  });

  if (produto.isLoading) {
    return (
      <AppShell>
        <div className="grid animate-pulse gap-5 md:grid-cols-2">
          <div className="aspect-square rounded-2xl bg-muted" />
          <div className="space-y-3">
            <div className="h-6 w-3/4 rounded bg-muted" />
            <div className="h-8 w-1/3 rounded bg-muted" />
            <div className="h-24 rounded bg-muted" />
          </div>
        </div>
      </AppShell>
    );
  }

  const item = produto.data;
  if (!item) {
    return (
      <AppShell>
        <div className="py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Produto não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">Pode ter sido vendido ou removido.</p>
          <Link
            to="/"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Voltar à loja
          </Link>
        </div>
      </AppShell>
    );
  }

  const desconto = percentagemDesconto(item.preco, item.precoAntigo);
  const esgotado = item.stock <= 0;
  const meu = user?.id === item.vendedorId;
  const imagens = item.imagens.length ? item.imagens : item.imagem ? [item.imagem] : [];

  const paraCarrinho = () => ({
    produtoId: item.id,
    titulo: item.titulo,
    preco: item.preco,
    imagem: item.imagem,
    vendedorId: item.vendedorId,
    vendedorNome: item.vendedorNome,
    stock: item.stock,
    envioGratis: item.envioGratis,
    custoEnvio: item.custoEnvio,
  });

  const adicionarAoCarrinho = () => {
    if (meu) {
      toast.info("Este produto é teu.");
      return;
    }
    adicionar(paraCarrinho(), quantidade);
    toast.success("Adicionado ao carrinho", {
      action: { label: "Ver carrinho", onClick: () => void navigate({ to: "/carrinho" }) },
    });
  };

  const comprarAgora = () => {
    if (meu) {
      toast.info("Este produto é teu.");
      return;
    }
    adicionar(paraCarrinho(), quantidade);
    void navigate({ to: "/checkout" });
  };

  return (
    <AppShell>
      <button
        onClick={() => window.history.back()}
        className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground"
      >
        <ChevronLeft className="size-4" /> Voltar
      </button>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-secondary">
            {imagens[fotoAtiva] ? (
              <img src={imagens[fotoAtiva]} alt={item.titulo} className="size-full object-cover" />
            ) : (
              <span className="grid size-full place-items-center text-muted-foreground">
                <ImageOff className="size-8" />
              </span>
            )}
            {desconto && (
              <Badge className="absolute left-3 top-3 bg-destructive text-base text-destructive-foreground">
                -{desconto}%
              </Badge>
            )}
          </div>
          {imagens.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {imagens.map((url, indice) => (
                <button
                  key={url}
                  onClick={() => setFotoAtiva(indice)}
                  className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 ${indice === fotoAtiva ? "border-primary" : "border-transparent"}`}
                >
                  <img src={url} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-bold text-primary">
            {item.categoria}
            {item.marca ? ` · ${item.marca}` : ""}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold leading-tight">{item.titulo}</h1>

          <div className="mt-3 flex flex-wrap items-baseline gap-2">
            <strong className="font-display text-3xl text-destructive">{mzn(item.preco)}</strong>
            {item.precoAntigo && (
              <s className="text-sm text-muted-foreground">{mzn(item.precoAntigo)}</s>
            )}
            <span className="text-xs text-muted-foreground">por {item.unidade}</span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {item.vendas > 0 && <Badge className="bg-secondary">{item.vendas} vendidos</Badge>}
            {item.envioGratis ? (
              <Badge className="bg-success/15 text-primary">
                <Truck className="mr-1 size-3" /> Entrega grátis
              </Badge>
            ) : (
              <Badge className="bg-secondary">
                <Truck className="mr-1 size-3" /> Entrega {mzn(item.custoEnvio)}
              </Badge>
            )}
            <Badge className={esgotado ? "bg-destructive/10 text-destructive" : "bg-secondary"}>
              {esgotado ? "Esgotado" : `${item.stock} em stock`}
            </Badge>
            {item.negociavel && (
              <Badge className="bg-accent/20 text-accent-foreground">Negociável</Badge>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div className="min-w-0">
              <strong className="flex items-center gap-1 text-sm">
                {item.vendedorNome}
                {item.vendedorVerificado && <ShieldCheck className="size-4 text-primary" />}
              </strong>
              <p className="text-xs text-muted-foreground">
                <MapPin className="mr-1 inline size-3" />
                {item.distrito ?? "—"} · {item.provincia ?? "Moçambique"}
              </p>
            </div>
            <Estrelas valor={nota.data?.media ?? null} />
          </div>

          {!esgotado && !meu && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm font-semibold">Quantidade</span>
              <div className="inline-flex items-center rounded-lg border border-border">
                <button
                  onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                  className="grid size-10 place-items-center"
                  aria-label="Menos"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-10 text-center text-sm font-bold">{quantidade}</span>
                <button
                  onClick={() => setQuantidade((q) => Math.min(item.stock, q + 1))}
                  className="grid size-10 place-items-center"
                  aria-label="Mais"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 grid grid-cols-[1fr_1fr_auto] gap-2">
            <AppButton variant="outline" disabled={esgotado || meu} onClick={adicionarAoCarrinho}>
              <ShoppingCart className="size-4" /> Carrinho
            </AppButton>
            <AppButton
              className="bg-accent text-accent-foreground"
              disabled={esgotado || meu}
              onClick={comprarAgora}
            >
              <Zap className="size-4" /> Comprar agora
            </AppButton>
            <AppButton
              variant="outline"
              className="px-3"
              ariaLabel="Guardar favorito"
              onClick={() =>
                user ? alternar.mutate() : toast.info("Entra na tua conta para guardar favoritos")
              }
            >
              <Heart className={`size-5 ${favorito ? "fill-primary text-primary" : ""}`} />
            </AppButton>
          </div>
          <button
            onClick={() =>
              user
                ? contactar.mutate()
                : void navigate({ to: "/auth", search: { voltar: `/produto/${id}` } })
            }
            disabled={meu}
            className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 text-sm font-semibold text-primary disabled:opacity-50"
          >
            <MessageCircle className="size-4" /> Falar com o vendedor
          </button>

          <div className="mt-4 rounded-xl bg-secondary/60 p-3 text-xs text-secondary-foreground">
            <strong className="block">Pagamento seguro no telemóvel</strong>
            Paga com <b>M-Pesa</b> (84/85) ou <b>e-Mola</b> (86/87). Recebes um pedido de PIN no
            telemóvel e o vendedor só é notificado quando o pagamento é confirmado.
          </div>

          {item.descricao && (
            <section className="mt-5">
              <h2 className="font-display text-lg font-bold">Descrição</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {item.descricao}
              </p>
            </section>
          )}
        </div>
      </div>

      {(doVendedor.data?.length ?? 0) > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg font-bold">Mais deste vendedor</h2>
          <GrelhaProdutos produtos={doVendedor.data ?? []} />
        </section>
      )}
    </AppShell>
  );
}
