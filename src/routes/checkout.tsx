import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft, Loader2, MapPin, ShoppingCart, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, Titulo } from "@/components/loja/layout";
import { PagamentoMovel } from "@/components/loja/pagamento";
import { AppButton, Empty } from "@/components/machamba/ui";
import { useAuth } from "@/lib/auth";
import { useCarrinho } from "@/lib/carrinho";
import { calcularEnvio } from "@/lib/envio";
import { mzn } from "@/lib/formato";
import { listarEnderecos } from "@/lib/loja";
import { criarPedido, type ResumoPedidoCriado } from "@/lib/loja.functions";
import { citiesOf, provinceNames } from "@/lib/mozambique";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Finalizar compra — Machamba Digital" }] }),
  component: PaginaCheckout,
});

type Passo = "endereco" | "pagamento";

function PaginaCheckout() {
  const { user, perfil, carregando } = useAuth();
  const { itens, total, limpar } = useCarrinho();
  const navigate = useNavigate();
  const [passo, setPasso] = useState<Passo>("endereco");
  const [pedido, setPedido] = useState<ResumoPedidoCriado | null>(null);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [provincia, setProvincia] = useState("");
  const [distrito, setDistrito] = useState("");
  const [bairro, setBairro] = useState("");
  const [referencia, setReferencia] = useState("");
  const [notas, setNotas] = useState("");
  const [guardar, setGuardar] = useState(true);

  const enderecos = useQuery({
    queryKey: ["enderecos", user?.id],
    queryFn: () => listarEnderecos(user!.id),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!perfil) return;
    setNome((atual) => atual || perfil.nome || "");
    setTelefone((atual) => atual || (perfil.telefone ?? "").replace(/^\+?258/, ""));
    setProvincia((atual) => atual || perfil.provincia || "");
    setDistrito((atual) => atual || perfil.distrito || "");
  }, [perfil]);

  useEffect(() => {
    const principal = enderecos.data?.[0];
    if (!principal) return;
    setNome(principal.nome);
    setTelefone(principal.telefone);
    setProvincia(principal.provincia);
    setDistrito(principal.distrito);
    setBairro(principal.bairro ?? "");
    setReferencia(principal.referencia ?? "");
    setGuardar(false);
  }, [enderecos.data]);

  const envio = calcularEnvio(itens);

  const criar = useMutation({
    mutationFn: () =>
      criarPedido({
        data: {
          itens: itens.map((item) => ({ produtoId: item.produtoId, quantidade: item.quantidade })),
          endereco: { nome, telefone, provincia, distrito, bairro, referencia },
          notas,
          guardarEndereco: guardar,
        },
      }),
    onSuccess: (resultado) => {
      setPedido(resultado);
      setPasso("pagamento");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (erro: Error) => toast.error(erro.message || "Não foi possível criar a encomenda."),
  });

  if (carregando) {
    return (
      <AppShell>
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <Empty
          icon={<Wallet className="size-7" />}
          title="Entra para finalizar a compra"
          text="Precisas de uma conta para acompanhar a encomenda e receber a confirmação do pagamento."
          action="Entrar ou criar conta"
          onAction={() => void navigate({ to: "/auth", search: { voltar: "/checkout" } })}
        />
      </AppShell>
    );
  }

  if (!itens.length && !pedido) {
    return (
      <AppShell>
        <Empty
          icon={<ShoppingCart className="size-7" />}
          title="Carrinho vazio"
          text="Adiciona produtos antes de finalizar a compra."
          action="Ir às compras"
          onAction={() => void navigate({ to: "/pesquisa" })}
        />
      </AppShell>
    );
  }

  const cidades = citiesOf(provincia);

  return (
    <AppShell>
      <Link
        to="/carrinho"
        className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground"
      >
        <ChevronLeft className="size-4" /> Carrinho
      </Link>
      <Titulo>Finalizar compra</Titulo>

      <ol className="mb-5 flex items-center gap-2 text-xs font-semibold">
        <li
          className={`flex items-center gap-1.5 ${passo === "endereco" ? "text-primary" : "text-muted-foreground"}`}
        >
          <span
            className={`grid size-6 place-items-center rounded-full ${passo === "endereco" ? "bg-primary text-primary-foreground" : "bg-success text-primary-foreground"}`}
          >
            {passo === "endereco" ? "1" : <Check className="size-3.5" />}
          </span>
          Entrega
        </li>
        <li className="h-px w-8 bg-border" />
        <li
          className={`flex items-center gap-1.5 ${passo === "pagamento" ? "text-primary" : "text-muted-foreground"}`}
        >
          <span
            className={`grid size-6 place-items-center rounded-full ${passo === "pagamento" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            2
          </span>
          Pagamento
        </li>
      </ol>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div>
          {passo === "endereco" && (
            <form
              className="space-y-4 rounded-xl border border-border bg-card p-4"
              onSubmit={(evento) => {
                evento.preventDefault();
                criar.mutate();
              }}
            >
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <MapPin className="size-5 text-primary" /> Dados de entrega
              </h2>
              {(enderecos.data?.length ?? 0) > 1 && (
                <label className="block text-sm font-semibold">
                  Endereços guardados
                  <select
                    onChange={(evento) => {
                      const escolhido = enderecos.data?.find(
                        (endereco) => endereco.id === evento.target.value,
                      );
                      if (!escolhido) return;
                      setNome(escolhido.nome);
                      setTelefone(escolhido.telefone);
                      setProvincia(escolhido.provincia);
                      setDistrito(escolhido.distrito);
                      setBairro(escolhido.bairro ?? "");
                      setReferencia(escolhido.referencia ?? "");
                      setGuardar(false);
                    }}
                    className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 font-normal"
                  >
                    {enderecos.data?.map((endereco) => (
                      <option key={endereco.id} value={endereco.id}>
                        {endereco.nome} · {endereco.distrito}, {endereco.provincia}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-semibold">
                  Nome de quem recebe
                  <input
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 font-normal"
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Telefone de contacto
                  <input
                    required
                    inputMode="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="84 000 0000"
                    className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 font-normal"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-semibold">
                  Província
                  <select
                    required
                    value={provincia}
                    onChange={(e) => {
                      setProvincia(e.target.value);
                      setDistrito("");
                    }}
                    className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 font-normal"
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
                    required
                    disabled={!cidades.length}
                    value={distrito}
                    onChange={(e) => setDistrito(e.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 font-normal disabled:opacity-60"
                  >
                    <option value="">Escolher</option>
                    {cidades.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm font-semibold">
                Bairro / rua
                <input
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Ex.: Bairro Central, Av. Eduardo Mondlane"
                  className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 font-normal"
                />
              </label>
              <label className="block text-sm font-semibold">
                Ponto de referência
                <input
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Ex.: perto do mercado, casa azul"
                  className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 font-normal"
                />
              </label>
              <label className="block text-sm font-semibold">
                Nota para o vendedor (opcional)
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  className="mt-2 w-full rounded-lg border border-border bg-background p-3 font-normal"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={guardar}
                  onChange={(e) => setGuardar(e.target.checked)}
                  className="size-4"
                />
                Guardar este endereço para a próxima compra
              </label>
              <AppButton
                type="submit"
                className="w-full bg-accent text-accent-foreground"
                disabled={criar.isPending}
              >
                {criar.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Wallet className="size-4" />
                )}
                Continuar para pagamento
              </AppButton>
            </form>
          )}

          {passo === "pagamento" && pedido && (
            <div className="space-y-4 rounded-xl border border-border bg-card p-4">
              <div>
                <h2 className="font-display text-lg font-bold">Pagar encomenda {pedido.numero}</h2>
                <p className="text-sm text-muted-foreground">
                  Escolhe a carteira móvel e confirma o PIN no telemóvel.
                </p>
              </div>
              <PagamentoMovel
                pedidoId={pedido.pedidoId}
                total={pedido.total}
                telefoneInicial={telefone}
                onPago={() => {
                  limpar();
                  toast.success("Pagamento confirmado! Obrigado pela compra.");
                  window.setTimeout(
                    () => void navigate({ to: "/pedidos/$id", params: { id: pedido.pedidoId } }),
                    1200,
                  );
                }}
              />
              <p className="text-center text-xs text-muted-foreground">
                Podes pagar mais tarde em{" "}
                <Link
                  to="/pedidos/$id"
                  params={{ id: pedido.pedidoId }}
                  className="font-semibold text-primary"
                  onClick={() => limpar()}
                >
                  As minhas encomendas
                </Link>
                .
              </p>
            </div>
          )}
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-4 lg:sticky lg:top-20">
          <h2 className="font-display text-lg font-bold">Resumo</h2>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
            {itens.map((item) => (
              <li key={item.produtoId} className="flex items-center gap-2">
                <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-secondary">
                  {item.imagem && (
                    <img src={item.imagem} alt="" className="size-full object-cover" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate">{item.titulo}</span>
                <span className="text-xs text-muted-foreground">×{item.quantidade}</span>
                <strong className="text-xs">{mzn(item.preco * item.quantidade)}</strong>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{mzn(pedido?.subtotal ?? total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Entrega</dt>
              <dd>{(pedido?.envio ?? envio) ? mzn(pedido?.envio ?? envio) : "Grátis"}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd className="text-destructive">{mzn(pedido?.total ?? total + envio)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </AppShell>
  );
}
