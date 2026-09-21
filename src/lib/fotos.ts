import imageCompression from "browser-image-compression";

import { supabase } from "@/integrations/supabase/client";

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

export async function enviarFoto(balde: Balde, utilizadorId: string, ficheiro: File): Promise<string> {
  const comprimida = await comprimirFoto(ficheiro);
  const caminho = `${utilizadorId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(balde).upload(caminho, comprimida, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return caminho;
}

export async function urlsDasFotos(balde: Balde, caminhos: string[]): Promise<Record<string, string>> {
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
