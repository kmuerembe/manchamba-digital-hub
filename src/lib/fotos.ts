import imageCompression from "browser-image-compression";

import { supabase } from "@/integrations/supabase/client";
import { MENSAGEM_BALDE_EM_FALTA, ehBaldeEmFalta, mensagemDeErro } from "@/lib/erros";

export type Balde = "produtos" | "diagnosticos";

export async function comprimirFoto(ficheiro: File): Promise<File | Blob> {
  try {
    return await imageCompression(ficheiro, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
      fileType: "image/jpeg",
    });
  } catch {
    return ficheiro;
  }
}

export async function enviarFoto(
  balde: Balde,
  utilizadorId: string,
  ficheiro: File,
): Promise<string> {
  const comprimida = await comprimirFoto(ficheiro);
  const caminho = `${utilizadorId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(balde).upload(caminho, comprimida, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return caminho;
}

export type FalhaDeFoto = { nome: string; motivo: string };

export type EnvioDeFotos = {
  /** Caminhos guardados no balde, pela ordem em que foram enviados. */
  enviadas: string[];
  /** Fotografias que não foram guardadas, com o motivo já traduzido. */
  falhas: FalhaDeFoto[];
  /** O balde não existe no Supabase — nenhuma fotografia foi guardada. */
  baldeEmFalta: boolean;
};

function nomeDaFoto(ficheiro: File, indice: number): string {
  return ficheiro.name.trim() || `Fotografia ${indice + 1}`;
}

/**
 * Envia várias fotografias sem desistir à primeira falha.
 *
 * Antes, um único upload falhado (balde em falta, imagem demasiado grande, rede
 * instável) rebentava com a publicação toda depois do anúncio já criado — e o
 * utilizador via "Não foi possível publicar o anúncio" e perdia o formulário.
 * Aqui cada fotografia é tentada de forma independente e as falhas voltam no
 * resultado para o ecrã poder explicá-las.
 */
export async function enviarFotos(
  balde: Balde,
  utilizadorId: string,
  ficheiros: File[],
): Promise<EnvioDeFotos> {
  const enviadas: string[] = [];
  const falhas: FalhaDeFoto[] = [];
  let baldeEmFalta = false;

  for (const [indice, ficheiro] of ficheiros.entries()) {
    // Sem o balde criado, todas as tentativas seguintes falham pelo mesmo motivo.
    if (baldeEmFalta) {
      falhas.push({ nome: nomeDaFoto(ficheiro, indice), motivo: MENSAGEM_BALDE_EM_FALTA });
      continue;
    }
    try {
      enviadas.push(await enviarFoto(balde, utilizadorId, ficheiro));
    } catch (erro) {
      if (ehBaldeEmFalta(erro)) baldeEmFalta = true;
      falhas.push({
        nome: nomeDaFoto(ficheiro, indice),
        motivo: mensagemDeErro(erro, "Não foi possível carregar esta fotografia."),
      });
    }
  }

  return { enviadas, falhas, baldeEmFalta };
}

export async function urlsDasFotos(
  balde: Balde,
  caminhos: string[],
): Promise<Record<string, string>> {
  const unicos = Array.from(new Set(caminhos.filter(Boolean)));
  if (!unicos.length) return {};
  const { data } = await supabase.storage.from(balde).createSignedUrls(unicos, 60 * 60);
  const mapa: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) mapa[item.path] = item.signedUrl;
  }
  return mapa;
}

export async function urlDaFoto(balde: Balde, caminho: string | null): Promise<string | null> {
  if (!caminho) return null;
  const mapa = await urlsDasFotos(balde, [caminho]);
  return mapa[caminho] ?? null;
}

export function ficheiroDeDataUrl(dataUrl: string, nome = "foto.jpg"): File {
  const [cabecalho, base64] = dataUrl.split(",");
  const tipo = /:(.*?);/.exec(cabecalho ?? "")?.[1] ?? "image/jpeg";
  const binario = atob(base64 ?? "");
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return new File([bytes], nome, { type: tipo });
}
