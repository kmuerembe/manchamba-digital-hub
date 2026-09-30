const formatador = new Intl.NumberFormat("pt-MZ", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

/** 1500 -> "1 500 MT" */
export function mzn(valor: number | string | null | undefined): string {
  const numero = Number(valor ?? 0);
  return `${formatador.format(Number.isFinite(numero) ? numero : 0)} MT`;
}

export function percentagemDesconto(preco: number, antigo: number | null): number | null {
  if (!antigo || antigo <= preco) return null;
  return Math.round(((antigo - preco) / antigo) * 100);
}

export function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const ESTADOS_PEDIDO: Record<string, { rotulo: string; cor: string }> = {
  aguarda_pagamento: { rotulo: "Aguarda pagamento", cor: "bg-warning/20 text-accent-foreground" },
  pago: { rotulo: "Pago", cor: "bg-success/15 text-primary" },
  em_preparacao: { rotulo: "Em preparação", cor: "bg-secondary text-secondary-foreground" },
  enviado: { rotulo: "Enviado", cor: "bg-primary/10 text-primary" },
  entregue: { rotulo: "Entregue", cor: "bg-success/20 text-primary" },
  cancelado: { rotulo: "Cancelado", cor: "bg-muted text-muted-foreground" },
  falhou: { rotulo: "Pagamento falhou", cor: "bg-destructive/10 text-destructive" },
};

export const ESTADOS_ITEM: Record<string, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};
