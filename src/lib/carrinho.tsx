import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ItemCarrinho = {
  produtoId: string;
  titulo: string;
  preco: number;
  imagem: string | null;
  vendedorId: string;
  vendedorNome: string;
  stock: number;
  quantidade: number;
  envioGratis: boolean;
  custoEnvio: number;
};

type CarrinhoValue = {
  itens: ItemCarrinho[];
  total: number;
  quantidadeTotal: number;
  adicionar: (item: Omit<ItemCarrinho, "quantidade">, quantidade?: number) => void;
  atualizar: (produtoId: string, quantidade: number) => void;
  remover: (produtoId: string) => void;
  limpar: () => void;
};

const CHAVE = "machamba.carrinho.v1";
const CarrinhoContext = createContext<CarrinhoValue | null>(null);

function ler(): ItemCarrinho[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    const lista = bruto ? (JSON.parse(bruto) as ItemCarrinho[]) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setItens(ler());
    setPronto(true);
  }, []);

  useEffect(() => {
    if (!pronto) return;
    window.localStorage.setItem(CHAVE, JSON.stringify(itens));
  }, [itens, pronto]);

  const adicionar = useCallback<CarrinhoValue["adicionar"]>((item, quantidade = 1) => {
    setItens((atual) => {
      const existente = atual.find((linha) => linha.produtoId === item.produtoId);
      if (existente) {
        const nova = Math.min(item.stock || 99, existente.quantidade + quantidade);
        return atual.map((linha) =>
          linha.produtoId === item.produtoId ? { ...linha, ...item, quantidade: nova } : linha,
        );
      }
      return [...atual, { ...item, quantidade: Math.min(item.stock || 99, quantidade) }];
    });
  }, []);

  const atualizar = useCallback((produtoId: string, quantidade: number) => {
    setItens((atual) =>
      quantidade <= 0
        ? atual.filter((linha) => linha.produtoId !== produtoId)
        : atual.map((linha) =>
            linha.produtoId === produtoId
              ? { ...linha, quantidade: Math.min(linha.stock || 99, quantidade) }
              : linha,
          ),
    );
  }, []);

  const remover = useCallback(
    (produtoId: string) =>
      setItens((atual) => atual.filter((linha) => linha.produtoId !== produtoId)),
    [],
  );
  const limpar = useCallback(() => setItens([]), []);

  const valor = useMemo<CarrinhoValue>(() => {
    const total = itens.reduce((soma, linha) => soma + linha.preco * linha.quantidade, 0);
    const quantidadeTotal = itens.reduce((soma, linha) => soma + linha.quantidade, 0);
    return { itens, total, quantidadeTotal, adicionar, atualizar, remover, limpar };
  }, [itens, adicionar, atualizar, remover, limpar]);

  return <CarrinhoContext.Provider value={valor}>{children}</CarrinhoContext.Provider>;
}

export function useCarrinho(): CarrinhoValue {
  const contexto = useContext(CarrinhoContext);
  if (!contexto) throw new Error("useCarrinho precisa do CarrinhoProvider");
  return contexto;
}
