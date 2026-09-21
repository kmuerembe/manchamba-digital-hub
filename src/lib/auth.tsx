import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

export type Perfil = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  tipo: string;
  provincia: string | null;
  distrito: string | null;
  foto_perfil: string | null;
  sou_agronomo: boolean;
  verificado: boolean;
  ativo: boolean;
  criado_em: string;
};

type AuthValue = {
  user: User | null;
  session: Session | null;
  perfil: Perfil | null;
  admin: boolean;
  carregando: boolean;
  recarregarPerfil: () => Promise<void>;
  sair: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

/** Permite entrar com número de telemóvel usando um endereço interno estável. */
export function emailDoTelefone(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "").replace(/^0+/, "");
  const completo = digitos.startsWith("258") ? digitos : `258${digitos}`;
  return `${completo}@telefone.machamba.mz`;
}

export function pareceTelefone(valor: string): boolean {
  return !valor.includes("@");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [admin, setAdmin] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const carregarPerfil = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setPerfil(null);
      setAdmin(false);
      return;
    }
    const [{ data: linha }, { data: papeis }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setPerfil((linha as Perfil | null) ?? null);
    setAdmin(Boolean(papeis?.some((papel) => papel.role === "admin")));
  }, []);

  useEffect(() => {
    let vivo = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      if (!vivo) return;
      setSession(novaSessao);
      void carregarPerfil(novaSessao?.user.id);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return;
      setSession(data.session);
      void carregarPerfil(data.session?.user.id).finally(() => setCarregando(false));
    });

    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, [carregarPerfil]);

  const valor = useMemo<AuthValue>(
    () => ({
      user: session?.user ?? null,
      session,
      perfil,
      admin,
      carregando,
      recarregarPerfil: async () => carregarPerfil(session?.user.id),
      sair: async () => {
        await supabase.auth.signOut();
        setPerfil(null);
        setAdmin(false);
      },
    }),
    [session, perfil, admin, carregando, carregarPerfil],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth precisa do AuthProvider");
  return contexto;
}
