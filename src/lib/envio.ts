/** Uma taxa de entrega por vendedor; produtos com entrega grátis não contam. */
export function calcularEnvio(
  itens: { vendedorId: string; envioGratis: boolean; custoEnvio: number }[],
): number {
  const vistos = new Set<string>();
  let envio = 0;
  for (const item of itens) {
    if (item.envioGratis || vistos.has(item.vendedorId)) continue;
    vistos.add(item.vendedorId);
    envio += item.custoEnvio;
  }
  return envio;
}
