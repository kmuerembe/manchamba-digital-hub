import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Leaf, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { emailDoTelefone, pareceTelefone, useAuth } from "@/lib/auth";
import { citiesOf, provinceNames } from "@/lib/mozambique";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    voltar:
      typeof search["voltar"] === "string" && search["voltar"].startsWith("/")
        ? search["voltar"]
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar na Machamba Digital" },
      {
        name: "description",
        content:
          "Cria a tua conta ou entra para comprar e vender em Moçambique com M-Pesa e e-Mola.",
      },
      { property: "og:title", content: "Entrar na Machamba Digital" },
      {
        property: "og:description",
        content: "Conta gratuita para agricultores e compradores em Moçambique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { voltar } = Route.useSearch();
  const destino = voltar ?? "/";
  const { user, carregando } = useAuth();
  const [modo, setModo] = useState<"entrar" | "registar">("entrar");
  const [contacto, setContacto] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("comprador");
  const [provincia, setProvincia] = useState("");
  const [distrito, setDistrito] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!carregando && user) void navigate({ to: destino });
  }, [user, carregando, navigate, destino]);

  const submeter = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setErro("");
    setOcupado(true);
    const telefone = pareceTelefone(contacto) ? contacto.trim() : null;
    const email = telefone ? emailDoTelefone(telefone) : contacto.trim().toLowerCase();

    try {
      if (modo === "registar") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { nome, telefone, tipo, provincia, distrito },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await navigate({ to: destino });
    } catch (falha) {
      const mensagem = falha instanceof Error ? falha.message : "";
      setErro(
        mensagem.includes("Invalid login")
          ? "Contacto ou palavra-passe errados."
          : mensagem.includes("already registered")
            ? "Já existe uma conta com este contacto. Tenta entrar."
            : mensagem.includes("at least")
              ? "A palavra-passe precisa de pelo menos 6 caracteres."
              : "Não foi possível concluir. Verifica a tua ligação e tenta de novo.",
      );
    } finally {
      setOcupado(false);
    }
  };

  const distritos = citiesOf(provincia);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md animate-enter">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-lg bg-primary font-display text-lg font-bold text-primary-foreground">
            M
          </span>
          <span>
            <strong className="block font-display text-base leading-none">Machamba</strong>
            <span className="text-xs text-muted-foreground">Digital</span>
          </span>
        </Link>

        <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <h1 className="font-display text-2xl font-bold">
            {modo === "entrar" ? "Entrar na tua conta" : "Criar conta"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Podes usar o teu email ou o número de telemóvel (+258).
          </p>

          <form className="mt-5 space-y-4" onSubmit={(evento) => void submeter(evento)}>
            {modo === "registar" && (
              <label className="block text-sm font-semibold">
                Nome
                <input
                  required
                  value={nome}
                  onChange={(evento) => setNome(evento.target.value)}
                  placeholder="Ex.: Ana Sitoe"
                  className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 font-normal"
                />
              </label>
            )}

            <label className="block text-sm font-semibold">
              Email ou telemóvel
              <input
                required
                value={contacto}
                onChange={(evento) => setContacto(evento.target.value)}
                placeholder="84 123 4567 ou nome@email.com"
                className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 font-normal"
              />
            </label>

            <label className="block text-sm font-semibold">
              Palavra-passe
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 font-normal"
              />
            </label>

            {modo === "registar" && (
              <>
                <label className="block text-sm font-semibold">
                  Sou
                  <select
                    value={tipo}
                    onChange={(evento) => setTipo(evento.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 font-normal"
                  >
                    <option value="comprador">Comprador</option>
                    <option value="vendedor">Vendedor / Loja</option>
                    <option value="agricultor">Agricultor</option>
                    <option value="agronomo">Agrónomo</option>
                  </select>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-semibold">
                    Província
                    <select
                      value={provincia}
                      onChange={(evento) => {
                        setProvincia(evento.target.value);
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
                      value={distrito}
                      disabled={!distritos.length}
                      onChange={(evento) => setDistrito(evento.target.value)}
                      className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 font-normal disabled:opacity-60"
                    >
                      <option value="">Escolher</option>
                      {distritos.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            )}

            {erro && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={ocupado}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
            >
              {ocupado ? <Loader2 className="size-4 animate-spin" /> : <Leaf className="size-4" />}
              {modo === "entrar" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setModo(modo === "entrar" ? "registar" : "entrar");
              setErro("");
            }}
            className="mt-4 w-full text-sm font-semibold text-primary"
          >
            {modo === "entrar" ? "Ainda não tenho conta — criar agora" : "Já tenho conta — entrar"}
          </button>
        </div>

        <Link to="/" className="mt-5 block text-center text-sm text-muted-foreground">
          Voltar à loja
        </Link>
      </div>
    </div>
  );
}
