-- ===== papéis =====
create type public.app_role as enum ('admin','moderador','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "ver os meus papeis" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

-- ===== perfis =====
create table public.profiles (
  id uuid primary key,
  nome text not null default '',
  telefone text,
  email text,
  tipo text not null default 'agricultor',
  provincia text,
  distrito text,
  foto_perfil text,
  sou_agronomo boolean not null default false,
  verificado boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
grant select on public.profiles to anon;
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "perfis publicos" on public.profiles for select using (true);
create policy "criar o meu perfil" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "editar o meu perfil" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "admin edita perfis" on public.profiles for update to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email, telefone, tipo, provincia, distrito)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome',''),
    new.email,
    coalesce(new.raw_user_meta_data->>'telefone', new.phone),
    coalesce(new.raw_user_meta_data->>'tipo','agricultor'),
    new.raw_user_meta_data->>'provincia',
    new.raw_user_meta_data->>'distrito'
  )
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ===== categorias =====
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  icone text,
  cor text,
  tipo text not null default 'produto',
  ativo boolean not null default true,
  ordem integer not null default 0
);
grant select on public.categorias to anon;
grant select on public.categorias to authenticated;
grant all on public.categorias to service_role;
alter table public.categorias enable row level security;
create policy "categorias publicas" on public.categorias for select using (true);
create policy "admin gere categorias" on public.categorias for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
grant insert, update, delete on public.categorias to authenticated;

insert into public.categorias (nome, slug, icone, cor, tipo, ordem) values
  ('Hortaliças','hortalicas','leaf','#2f6f3e','produto',1),
  ('Tubérculos','tuberculos','sprout','#8a5a2b','produto',2),
  ('Frutas','frutas','apple','#c86a1f','produto',3),
  ('Sementes','sementes','wheat','#a07c1f','produto',4),
  ('Equipamentos','equipamentos','wrench','#3f5f7f','produto',5),
  ('Fertilizantes','fertilizantes','flask-conical','#4b7a36','insumo',6),
  ('Pesticidas','pesticidas','spray-can','#7a3636','insumo',7);

-- ===== produtos =====
create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  preco numeric(12,2) not null,
  moeda text not null default 'MZN',
  quantidade numeric(12,2),
  unidade text not null default 'kg',
  negociavel boolean not null default false,
  categoria_id uuid references public.categorias(id) on delete set null,
  vendedor_id uuid not null,
  provincia text,
  distrito text,
  bairro text,
  latitude double precision,
  longitude double precision,
  estado text not null default 'pendente',
  destaque boolean not null default false,
  visualizacoes integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
grant select on public.produtos to anon;
grant select, insert, update, delete on public.produtos to authenticated;
grant all on public.produtos to service_role;
alter table public.produtos enable row level security;
create policy "produtos ativos publicos" on public.produtos for select using (estado in ('ativo','vendido'));
create policy "ver os meus produtos" on public.produtos for select to authenticated using (auth.uid() = vendedor_id or public.has_role(auth.uid(),'admin'));
create policy "criar produto" on public.produtos for insert to authenticated with check (auth.uid() = vendedor_id);
create policy "editar o meu produto" on public.produtos for update to authenticated using (auth.uid() = vendedor_id or public.has_role(auth.uid(),'admin')) with check (true);
create policy "apagar o meu produto" on public.produtos for delete to authenticated using (auth.uid() = vendedor_id or public.has_role(auth.uid(),'admin'));
create index produtos_estado_idx on public.produtos (estado, criado_em desc);

-- ===== fotos =====
create table public.produto_fotos (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  url text not null,
  ordem integer not null default 0
);
grant select on public.produto_fotos to anon;
grant select, insert, update, delete on public.produto_fotos to authenticated;
grant all on public.produto_fotos to service_role;
alter table public.produto_fotos enable row level security;
create policy "fotos publicas" on public.produto_fotos for select using (true);
create policy "dono gere fotos" on public.produto_fotos for all to authenticated
  using (exists (select 1 from public.produtos p where p.id = produto_id and (p.vendedor_id = auth.uid() or public.has_role(auth.uid(),'admin'))))
  with check (exists (select 1 from public.produtos p where p.id = produto_id and p.vendedor_id = auth.uid()));

-- ===== favoritos =====
create table public.favoritos (
  id uuid primary key default gen_random_uuid(),
  utilizador_id uuid not null,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (utilizador_id, produto_id)
);
grant select, insert, delete on public.favoritos to authenticated;
grant all on public.favoritos to service_role;
alter table public.favoritos enable row level security;
create policy "os meus favoritos" on public.favoritos for select to authenticated using (auth.uid() = utilizador_id);
create policy "guardar favorito" on public.favoritos for insert to authenticated with check (auth.uid() = utilizador_id);
create policy "remover favorito" on public.favoritos for delete to authenticated using (auth.uid() = utilizador_id);

-- ===== conversas e mensagens =====
create table public.conversas (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid references public.produtos(id) on delete cascade,
  participante1_id uuid not null,
  participante2_id uuid not null,
  ultima_mensagem text,
  ultima_mensagem_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (produto_id, participante1_id, participante2_id)
);
grant select, insert, update on public.conversas to authenticated;
grant all on public.conversas to service_role;
alter table public.conversas enable row level security;
create policy "as minhas conversas" on public.conversas for select to authenticated using (auth.uid() in (participante1_id, participante2_id));
create policy "criar conversa" on public.conversas for insert to authenticated with check (auth.uid() in (participante1_id, participante2_id));
create policy "atualizar conversa" on public.conversas for update to authenticated using (auth.uid() in (participante1_id, participante2_id)) with check (true);

create table public.mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  remetente_id uuid not null,
  destinatario_id uuid not null,
  conteudo text not null,
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);
grant select, insert, update on public.mensagens to authenticated;
grant all on public.mensagens to service_role;
alter table public.mensagens enable row level security;
create policy "as minhas mensagens" on public.mensagens for select to authenticated using (auth.uid() in (remetente_id, destinatario_id));
create policy "enviar mensagem" on public.mensagens for insert to authenticated with check (auth.uid() = remetente_id);
create policy "marcar lida" on public.mensagens for update to authenticated using (auth.uid() = destinatario_id) with check (true);
create index mensagens_conversa_idx on public.mensagens (conversa_id, criado_em);

-- ===== avaliacoes =====
create table public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  avaliador_id uuid not null,
  avaliado_id uuid not null,
  estrelas integer not null check (estrelas between 1 and 5),
  comentario text,
  criado_em timestamptz not null default now(),
  unique (avaliador_id, avaliado_id)
);
grant select on public.avaliacoes to anon;
grant select, insert, update, delete on public.avaliacoes to authenticated;
grant all on public.avaliacoes to service_role;
alter table public.avaliacoes enable row level security;
create policy "avaliacoes publicas" on public.avaliacoes for select using (true);
create policy "avaliar apos conversa" on public.avaliacoes for insert to authenticated with check (
  auth.uid() = avaliador_id and avaliado_id <> auth.uid() and exists (
    select 1 from public.conversas c
    where (c.participante1_id = auth.uid() and c.participante2_id = avaliado_id)
       or (c.participante2_id = auth.uid() and c.participante1_id = avaliado_id)
  )
);
create policy "editar a minha avaliacao" on public.avaliacoes for update to authenticated using (auth.uid() = avaliador_id) with check (auth.uid() = avaliador_id);
create policy "apagar a minha avaliacao" on public.avaliacoes for delete to authenticated using (auth.uid() = avaliador_id or public.has_role(auth.uid(),'admin'));

-- ===== analises de cultura =====
create table public.analises_cultura (
  id uuid primary key default gen_random_uuid(),
  utilizador_id uuid not null,
  foto_url text,
  cultura text,
  provincia text,
  latitude double precision,
  longitude double precision,
  diagnostico text,
  confianca numeric(4,3),
  descricao text,
  recomendacao text,
  gravidade text,
  produtos_sugeridos jsonb not null default '[]'::jsonb,
  revisado_por_id uuid,
  revisao_nota text,
  estado text not null default 'concluida',
  criado_em timestamptz not null default now()
);
grant select, insert, update on public.analises_cultura to authenticated;
grant all on public.analises_cultura to service_role;
alter table public.analises_cultura enable row level security;
create policy "as minhas analises" on public.analises_cultura for select to authenticated using (
  auth.uid() = utilizador_id or public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.sou_agronomo)
);
create policy "criar analise" on public.analises_cultura for insert to authenticated with check (auth.uid() = utilizador_id);
create policy "rever analise" on public.analises_cultura for update to authenticated using (
  auth.uid() = utilizador_id or public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.sou_agronomo)
) with check (true);

-- ===== notificacoes =====
create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  utilizador_id uuid not null,
  tipo text not null,
  titulo text not null,
  mensagem text,
  link text,
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);
grant select, insert, update, delete on public.notificacoes to authenticated;
grant all on public.notificacoes to service_role;
alter table public.notificacoes enable row level security;
create policy "as minhas notificacoes" on public.notificacoes for select to authenticated using (auth.uid() = utilizador_id);
create policy "criar notificacao" on public.notificacoes for insert to authenticated with check (true);
create policy "marcar notificacao" on public.notificacoes for update to authenticated using (auth.uid() = utilizador_id) with check (true);
create policy "apagar notificacao" on public.notificacoes for delete to authenticated using (auth.uid() = utilizador_id);

-- ===== denuncias =====
create table public.denuncias (
  id uuid primary key default gen_random_uuid(),
  denunciante_id uuid not null,
  produto_id uuid references public.produtos(id) on delete cascade,
  motivo text not null,
  descricao text,
  estado text not null default 'aberta',
  resolucao text,
  criado_em timestamptz not null default now()
);
grant select, insert, update on public.denuncias to authenticated;
grant all on public.denuncias to service_role;
alter table public.denuncias enable row level security;
create policy "ver denuncias" on public.denuncias for select to authenticated using (auth.uid() = denunciante_id or public.has_role(auth.uid(),'admin'));
create policy "denunciar" on public.denuncias for insert to authenticated with check (auth.uid() = denunciante_id);
create policy "admin resolve denuncia" on public.denuncias for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (true);

-- ===== artigos =====
create table public.artigos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  slug text not null unique,
  resumo text,
  conteudo text,
  imagem_url text,
  autor_id uuid,
  publicado boolean not null default false,
  criado_em timestamptz not null default now()
);
grant select on public.artigos to anon;
grant select, insert, update, delete on public.artigos to authenticated;
grant all on public.artigos to service_role;
alter table public.artigos enable row level security;
create policy "artigos publicados" on public.artigos for select using (publicado or public.has_role(auth.uid(),'admin'));
create policy "admin gere artigos" on public.artigos for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ===== notificacoes automaticas =====
create or replace function public.notificar_nova_mensagem()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notificacoes (utilizador_id, tipo, titulo, mensagem, link)
  values (new.destinatario_id, 'mensagem', 'Nova mensagem', left(new.conteudo, 120), new.conversa_id::text);
  update public.conversas set ultima_mensagem = left(new.conteudo,160), ultima_mensagem_em = new.criado_em where id = new.conversa_id;
  return new;
end;
$$;
create trigger trg_nova_mensagem after insert on public.mensagens for each row execute function public.notificar_nova_mensagem();

create or replace function public.notificar_avaliacao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notificacoes (utilizador_id, tipo, titulo, mensagem)
  values (new.avaliado_id, 'avaliacao', 'Recebeste uma avaliação', new.estrelas || ' estrelas');
  return new;
end;
$$;
create trigger trg_nova_avaliacao after insert on public.avaliacoes for each row execute function public.notificar_avaliacao();

create or replace function public.notificar_produto_estado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.atualizado_em := now();
  if new.estado is distinct from old.estado then
    insert into public.notificacoes (utilizador_id, tipo, titulo, mensagem, link)
    values (new.vendedor_id, 'produto',
      case new.estado when 'ativo' then 'Anúncio aprovado' when 'rejeitado' then 'Anúncio rejeitado' else 'Anúncio atualizado' end,
      new.titulo, new.id::text);
  end if;
  return new;
end;
$$;
create trigger trg_produto_estado before update on public.produtos for each row execute function public.notificar_produto_estado();

create or replace function public.notificar_analise()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notificacoes (utilizador_id, tipo, titulo, mensagem)
  values (new.utilizador_id, 'diagnostico', 'Diagnóstico pronto', coalesce(new.diagnostico,'Análise concluída'));
  return new;
end;
$$;
create trigger trg_nova_analise after insert on public.analises_cultura for each row execute function public.notificar_analise();

-- ===== tempo real =====
alter table public.mensagens replica identity full;
alter table public.conversas replica identity full;
alter table public.notificacoes replica identity full;
alter publication supabase_realtime add table public.mensagens;
alter publication supabase_realtime add table public.conversas;
alter publication supabase_realtime add table public.notificacoes;