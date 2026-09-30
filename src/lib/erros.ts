/**
 * Tradução dos erros do Supabase (PostgREST, Auth e Storage) para mensagens que
 * quem usa a loja percebe e para o que é preciso fazer a seguir.
 *
 * Sem isto, uma falha de base de dados ou de storage chegava ao ecrã como
 * "Não foi possível publicar o anúncio. Tenta de novo." — sem dizer que a causa
 * era um balde de fotografias em falta, uma sessão expirada ou um perfil de
 * vendedor inexistente.
 */

export const MENSAGEM_BALDE_EM_FALTA =
  "As fotografias não foram guardadas: falta criar os baldes «produtos» e «diagnosticos» no Supabase " +
  "(corre `drizzle/migrations/0004_storage_baldes.sql`). O anúncio foi criado na mesma.";

export const MENSAGEM_SESSAO_EXPIRADA = "A tua sessão expirou. Entra de novo e repete a operação.";

const FALLBACK = "Não foi possível concluir a operação. Tenta de novo.";

type Campos = {
  message: string;
  code: string | null;
  details: string;
  hint: string;
  statusCode: string | null;
  name: string;
};

function comoTexto(valor: unknown): string {
  if (typeof valor === "string") return valor;
  if (typeof valor === "number" && Number.isFinite(valor)) return String(valor);
  return "";
}

/** Os erros do Supabase vêm como `PostgrestError`, `StorageError`, `AuthError` ou `Error` simples. */
function lerCampos(erro: unknown): Campos {
  if (typeof erro === "string")
    return { message: erro, code: null, details: "", hint: "", statusCode: null, name: "" };
  if (!erro || typeof erro !== "object")
    return {
      message: comoTexto(erro),
      code: null,
      details: "",
      hint: "",
      statusCode: null,
      name: "",
    };

  const alvo = erro as Record<string, unknown>;
  return {
    message: comoTexto(alvo["message"]) || comoTexto(alvo["error"]) || comoTexto(alvo["msg"]),
    code: comoTexto(alvo["code"]) || null,
    details: comoTexto(alvo["details"]),
    hint: comoTexto(alvo["hint"]),
    statusCode: comoTexto(alvo["statusCode"]) || comoTexto(alvo["status"]) || null,
    name: comoTexto(alvo["name"]),
  };
}

/** Código estável do erro (SQLSTATE do Postgres ou código do PostgREST), se houver. */
export function codigoDoErro(erro: unknown): string | null {
  return lerCampos(erro).code;
}

/** Texto bruto do erro — para registar na consola, nunca para mostrar ao utilizador. */
export function textoDoErro(erro: unknown): string {
  const campos = lerCampos(erro);
  return [campos.name, campos.code, campos.message, campos.details, campos.hint]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Nome + mensagem do erro e dos erros que ele embrulha (`cause`, `originalError`):
 * o supabase-js esconde a falha de rede verdadeira um ou dois níveis abaixo.
 */
function cadeiaDoErro(erro: unknown): string {
  const partes: string[] = [];
  const vistos = new Set<unknown>();
  let atual: unknown = erro;

  while (atual && typeof atual === "object" && !vistos.has(atual)) {
    vistos.add(atual);
    const campos = lerCampos(atual);
    partes.push(`${campos.name} ${campos.code ?? ""} ${campos.message}`);
    const alvo = atual as Record<string, unknown>;
    atual = alvo["cause"] ?? alvo["originalError"];
  }

  return partes.join(" | ").toLowerCase();
}

/** Sessão expirada ou token inválido: a solução é sempre entrar de novo. */
export function ehSessaoInvalida(erro: unknown): boolean {
  const bruto = cadeiaDoErro(erro);
  return [
    "pgrst301",
    "pgrst300",
    "jwt expired",
    "jwstokenexpired",
    "jwt_expired",
    "token has expired",
    "invalid token",
    "auth session missing",
    "session missing",
    "session_not_found",
    "refresh token not found",
    "refresh_token_not_found",
  ].some((pista) => bruto.includes(pista));
}

/**
 * O balde de storage não existe — é o erro que partia a publicação de anúncios e o
 * diagnóstico de culturas quando a migração 0004 ainda não foi corrida.
 */
export function ehBaldeEmFalta(erro: unknown): boolean {
  const campos = lerCampos(erro);
  const bruto = `${campos.code} ${campos.message} ${campos.details}`.toLowerCase();
  return bruto.includes("bucket not found") || bruto.includes("bucket_id");
}

const PISTAS_DE_REDE = [
  "failed to fetch",
  "fetch failed",
  "load failed",
  "networkerror",
  "network request failed",
  "err_network",
  "err_internet_disconnected",
  "authretryablefetcherror",
  "enotfound",
  "eai_again",
  "econnrefused",
  "econnreset",
  "ehostunreach",
  "enetunreach",
  "etimedout",
  "und_err_connect_timeout",
  "und_err_socket",
  "timed out",
  "timeout",
  "the operation was aborted",
];

/** Falha de rede (offline, DNS, timeout): repetir resolve. */
export function ehFalhaDeRede(erro: unknown): boolean {
  const bruto = cadeiaDoErro(erro);
  return PISTAS_DE_REDE.some((pista) => bruto.includes(pista));
}

const CODIGOS_CONHECIDOS: Record<string, string> = {
  "22P02": "Um dos valores enviados não é um número válido.",
  "23502": "Falta preencher um campo obrigatório.",
  "23503": "Falta um registo relacionado na base de dados.",
  "23505": "Já existe um registo igual — não é preciso repetir.",
  "23514": "Um dos valores está fora dos limites aceites.",
  "42501": "Não tens permissão para fazer isto com a tua conta.",
  "42703": "Falta uma coluna na base de dados: corre as migrações de `drizzle/migrations`.",
  "42P01": "Falta uma tabela na base de dados: corre as migrações de `drizzle/migrations`.",
  PGRST116: "Não encontrámos esse registo — pode ter sido apagado entretanto.",
  PGRST204: "Falta uma coluna na base de dados: corre as migrações de `drizzle/migrations`.",
  PGRST202: "A consulta enviou um campo que a base de dados não conhece.",
  PGRST301: MENSAGEM_SESSAO_EXPIRADA,
  PGRST300: MENSAGEM_SESSAO_EXPIRADA,
};

/** Chave estrangeira partida: diz qual é o registo em falta. */
function mensagemDeChaveEstrangeira(campos: Campos): string | null {
  if (campos.code !== "23503") return null;
  const bruto = `${campos.details} ${campos.message} ${campos.hint}`.toLowerCase();
  const tabela = /table "?(?:public\.)?(\w+)"?/.exec(campos.details)?.[1]?.toLowerCase();
  if (tabela === "profiles" || bruto.includes("vendedor_id") || bruto.includes("profiles"))
    return "A tua conta ainda não tem perfil de vendedor na base de dados. Tenta publicar outra vez — o perfil é criado automaticamente.";
  if (tabela === "categorias")
    return "A categoria escolhida já não existe. Escolhe outra categoria.";
  if (tabela === "produtos") return "O anúncio relacionado já não existe.";
  return CODIGOS_CONHECIDOS["23503"] ?? null;
}

const PADROES_STORAGE: [RegExp, string][] = [
  [
    /exceeded the maximum upload size|maximum upload size|file too large|payload too large|entity too large/i,
    "A fotografia é demasiado grande. Escolhe uma imagem mais pequena (até 5 MB).",
  ],
  [
    /already exists|resourcealreadyexists|duplicate/i,
    "Já existe uma fotografia igual guardada. Tenta outra imagem.",
  ],
  [
    /access ?denied|not authorized|row-level security|new row violates|permission denied|policy/i,
    "Sem permissão para guardar fotografias nesta pasta — cada conta só pode escrever na pasta com o seu próprio ID.",
  ],
  [
    /unsupported mime|allowed mime types|mime type|invalid content type/i,
    "Este tipo de ficheiro não é aceite. Usa uma imagem JPEG, PNG ou WebP.",
  ],
  [/bucket/i, MENSAGEM_BALDE_EM_FALTA],
];

const PADROES_MIGRACOES: [RegExp, string][] = [
  [
    /relation "[^"]*" does not exist|could not find the table|does not exist in the database|schema "[^"]*" does not exist/i,
    "A base de dados ainda não tem todas as tabelas: corre as migrações em falta de `drizzle/migrations`.",
  ],
  [
    /column [^ ]+ does not exist|could not find the column/i,
    "A base de dados ainda não tem todas as colunas: corre as migrações em falta de `drizzle/migrations`.",
  ],
];

/**
 * Erros vindos da base de dados (PostgREST/Postgres) trazem código SQLSTATE
 * (`23505`) ou código do PostgREST (`PGRST301`). Servem para não aplicar os
 * padrões de storage — que falam de ficheiros — a um erro de tabelas.
 */
function ehErroDeBaseDeDados(campos: Campos): boolean {
  const codigo = campos.code ?? "";
  return (
    campos.name === "PostgrestError" || /^[0-9A-Z]{5}$/.test(codigo) || /^PGRST\d+$/i.test(codigo)
  );
}

/** Palavras que denunciam um erro técnico nunca traduzido. */
const TECNICO =
  /violates|constraint|relation "|duplicate key|syntax error|permission denied|row-level security|foreign key|primary key|invalid input|null value|schema |storage\.|public\.|pgrst|sqlstate|jwt|token|undefined|function |trigger /i;

/**
 * Devolve uma mensagem em português simples para mostrar no ecrã.
 * Mensagens já escritas para o utilizador (as que nós próprios lançamos) passam
 * tal e qual; erros técnicos sem tradução conhecida caem no `fallback`.
 */
export function mensagemDeErro(erro: unknown, fallback: string = FALLBACK): string {
  const campos = lerCampos(erro);

  if (ehFalhaDeRede(erro)) return "Sem ligação à internet. Verifica a rede e tenta de novo.";
  if (ehSessaoInvalida(erro)) return MENSAGEM_SESSAO_EXPIRADA;
  if (ehBaldeEmFalta(erro)) return MENSAGEM_BALDE_EM_FALTA;

  const chaveEstrangeira = mensagemDeChaveEstrangeira(campos);
  if (chaveEstrangeira) return chaveEstrangeira;

  const conhecida = campos.code ? CODIGOS_CONHECIDOS[campos.code] : undefined;
  if (conhecida) return conhecida;

  const bruto = `${campos.message} ${campos.details} ${campos.hint}`;

  for (const [padrao, mensagem] of PADROES_MIGRACOES) if (padrao.test(bruto)) return mensagem;
  if (!ehErroDeBaseDeDados(campos))
    for (const [padrao, mensagem] of PADROES_STORAGE) if (padrao.test(bruto)) return mensagem;

  if (!campos.message) return fallback;
  // Mensagem nossa, já em português: não a esconder atrás do fallback.
  if (!TECNICO.test(campos.message) && campos.message.length <= 160) return campos.message;
  return fallback;
}
