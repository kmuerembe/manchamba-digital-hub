import {
  AlertTriangle,
  BookOpen,
  PackageCheck,
  PackageSearch,
  ShieldAlert,
  Store,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AbaAdmin } from "@/components/admin/ui";
import { AcaoRapida, Bloco, Esqueleto, Kpi } from "@/components/admin/ui";
import type { ResumoAdmin } from "@/lib/admin.functions";
import { mzn } from "@/lib/formato";

const ROTULO_ABA: Record<string, string> = {
  produtos: "Ver anúncios",
  encomendas: "Ver encomendas",
  denuncias: "Ver denúncias",
  utilizadores: "Ver utilizadores",
  artigos: "Ver artigos",
};

function rotuloDia(dia: string): string {
  const [, mes, numero] = dia.split("-");
  return `${numero}/${mes}`;
}

function milhar(valor: unknown): string {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return "";
  return numero >= 1000 ? `${Math.round(numero / 1000)}k` : String(Math.round(numero));
}

/** Os gráficos só são montados no browser (o ResponsiveContainer mede o elemento). */
function useMontado() {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  return montado;
}

export function PainelResumo({
  dados,
  carregando,
  falhou,
  aoAbrirAba,
}: {
  dados?: ResumoAdmin | undefined;
  carregando: boolean;
  falhou: boolean;
  aoAbrirAba: (aba: AbaAdmin) => void;
}) {
  const montado = useMontado();

  if (falhou)
    return (
      <Bloco titulo="Resumo" descricao="Não foi possível carregar os números do painel.">
        <p className="text-sm text-muted-foreground">
          Recarrega a página ou confirma se a tua conta ainda tem o papel de administrador.
        </p>
      </Bloco>
    );
  if (carregando || !dados) return <Esqueleto linhas={4} />;

  const pagamentos = [
    { nome: "M-Pesa", valor: dados.pagamentos.mpesa, cor: "var(--color-destructive)" },
    { nome: "e-Mola", valor: dados.pagamentos.emola, cor: "var(--color-accent)" },
  ].filter((fatia) => fatia.valor > 0);

  const atencao = [
    {
      chave: "produtos" as AbaAdmin,
      Icone: PackageSearch,
      texto: `${dados.produtos.pendentes} anúncio(s) à espera de aprovação`,
      tom: "text-accent-foreground",
    },
    {
      chave: "denuncias" as AbaAdmin,
      Icone: ShieldAlert,
      texto: `${dados.denunciasAbertas} denúncia(s) por resolver`,
      tom: "text-destructive",
    },
    {
      chave: "encomendas" as AbaAdmin,
      Icone: Wallet,
      texto: `${dados.encomendas.aguardaPagamento} encomenda(s) a aguardar pagamento`,
      tom: "text-primary",
    },
  ].filter((item) => !item.texto.startsWith("0 "));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi
          rotulo="Receita paga"
          valor={mzn(dados.encomendas.receita)}
          nota={`${mzn(dados.encomendas.receita30)} nos últimos 30 dias`}
          Icone={Wallet}
        />
        <Kpi
          rotulo="Encomendas"
          valor={dados.encomendas.total}
          nota={`${dados.encomendas.pagas} pagas · ${dados.encomendas.emEntrega} em entrega`}
          Icone={TrendingUp}
          tom="text-accent"
        />
        <Kpi
          rotulo="Utilizadores"
          valor={dados.utilizadores}
          nota={`${dados.novosUtilizadores} novas contas em 30 dias`}
          Icone={Users}
          tom="text-chart-3"
        />
        <Kpi
          rotulo="Vendedores"
          valor={dados.vendedores}
          nota={`${dados.produtos.total} anúncios no total`}
          Icone={Store}
          tom="text-chart-2"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Bloco
            titulo="Encomendas e receita"
            descricao="Últimos 14 dias — barras: encomendas; linha: receita paga."
          >
            <div className="h-56 w-full">
              {montado ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={dados.serie}
                    margin={{ top: 4, right: 4, bottom: 0, left: -18 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--color-border)"
                    />
                    <XAxis
                      dataKey="dia"
                      tickFormatter={rotuloDia}
                      tick={{ fontSize: 10 }}
                      stroke="var(--color-muted-foreground)"
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      yAxisId="encomendas"
                      allowDecimals={false}
                      tick={{ fontSize: 10 }}
                      stroke="var(--color-muted-foreground)"
                    />
                    <YAxis
                      yAxisId="receita"
                      orientation="right"
                      tick={{ fontSize: 10 }}
                      tickFormatter={milhar}
                      stroke="var(--color-muted-foreground)"
                    />
                    <Tooltip
                      formatter={(valor, nome) =>
                        nome === "Receita" ? mzn(Number(valor)) : `${valor} encomenda(s)`
                      }
                      labelFormatter={(dia) => `Dia ${rotuloDia(String(dia))}`}
                      contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)" }}
                    />
                    <Bar
                      yAxisId="encomendas"
                      dataKey="encomendas"
                      name="Encomendas"
                      fill="var(--color-chart-3)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={22}
                    />
                    <Line
                      yAxisId="receita"
                      type="monotone"
                      dataKey="receita"
                      name="Receita"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full animate-pulse rounded-xl bg-muted" />
              )}
            </div>
          </Bloco>
        </div>

        <Bloco titulo="Pagamentos móveis" descricao="Tentativas por operadora.">
          {pagamentos.length ? (
            <div className="h-56 w-full">
              {montado && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pagamentos}
                      dataKey="valor"
                      nameKey="nome"
                      innerRadius={48}
                      outerRadius={76}
                      paddingAngle={3}
                    >
                      {pagamentos.map((fatia) => (
                        <Cell key={fatia.nome} fill={fatia.cor} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(valor) => `${valor} tentativa(s)`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Ainda não há pagamentos registados.
            </p>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <p className="rounded-lg bg-secondary/60 p-2">
              <span className="block text-muted-foreground">Confirmados</span>
              <strong className="font-display text-sm">{dados.pagamentos.pago}</strong>
            </p>
            <p className="rounded-lg bg-secondary/60 p-2">
              <span className="block text-muted-foreground">Falhados</span>
              <strong className="font-display text-sm">{dados.pagamentos.falhou}</strong>
            </p>
          </div>
        </Bloco>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Bloco
            titulo="Categorias com mais anúncios"
            descricao="Top 6 por número de produtos e vendas acumuladas."
          >
            <div className="h-56 w-full">
              {montado && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dados.categorias}
                    layout="vertical"
                    margin={{ top: 0, right: 12, bottom: 0, left: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="var(--color-border)"
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 10 }}
                      stroke="var(--color-muted-foreground)"
                    />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      width={104}
                      tick={{ fontSize: 11 }}
                      stroke="var(--color-muted-foreground)"
                    />
                    <Tooltip
                      formatter={(valor, nome) =>
                        nome === "Vendas" ? `${valor} unidade(s)` : `${valor} anúncio(s)`
                      }
                      contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)" }}
                    />
                    <Bar
                      dataKey="produtos"
                      name="Anúncios"
                      fill="var(--color-chart-1)"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={18}
                    />
                    <Bar
                      dataKey="vendas"
                      name="Vendas"
                      fill="var(--color-chart-2)"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Bloco>
        </div>

        <div className="space-y-3">
          <Bloco titulo="Precisa de atenção">
            {atencao.length ? (
              <ul className="space-y-2">
                {atencao.map(({ chave, Icone, texto, tom }) => (
                  <li
                    key={chave}
                    className="flex items-center gap-2 rounded-lg border border-border bg-background p-2.5"
                  >
                    <Icone className={`size-4 shrink-0 ${tom}`} />
                    <span className="min-w-0 flex-1 text-xs font-semibold">{texto}</span>
                    <AcaoRapida onClick={() => aoAbrirAba(chave)}>
                      {ROTULO_ABA[chave] ?? "Abrir"}
                    </AcaoRapida>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-primary">
                <PackageCheck className="size-4" /> Tudo em ordem por agora.
              </p>
            )}
          </Bloco>

          <Bloco titulo="Catálogo e conteúdos">
            <ul className="space-y-2 text-xs">
              <li className="flex items-center justify-between rounded-lg bg-secondary/60 p-2.5">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <PackageSearch className="size-4" /> Anúncios activos
                </span>
                <strong className="font-display text-sm">{dados.produtos.ativos}</strong>
              </li>
              <li className="flex items-center justify-between rounded-lg bg-secondary/60 p-2.5">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="size-4" /> Rejeitados
                </span>
                <strong className="font-display text-sm">{dados.produtos.rejeitados}</strong>
              </li>
              <li className="flex items-center justify-between rounded-lg bg-secondary/60 p-2.5">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="size-4" /> Artigos publicados
                </span>
                <strong className="font-display text-sm">
                  {dados.artigos.publicados}/{dados.artigos.total}
                </strong>
              </li>
            </ul>
          </Bloco>
        </div>
      </div>
    </div>
  );
}
