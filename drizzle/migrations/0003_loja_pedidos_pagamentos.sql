-- ===== Marketplace: produtos com stock, encomendas e pagamentos móveis =====

-- produtos: campos de loja
alter table public.produtos add column if not exists stock integer not null default 0;
alter table public.produtos add column if not exists preco_antigo numeric(12,2);
alter table public.produtos add column if not exists envio_gratis boolean not null default false;
alter table public.produtos add column if not exists custo_envio numeric(12,2) not null default 0;
alter table public.produtos add column if not exists vendas integer not null default 0;
alter table public.produtos add column if not exists marca text;
create index if not exists produtos_categoria_idx on public.produtos (categoria_id, estado);
create index if not exists produtos_vendas_idx on public.produtos (vendas desc);

-- categorias gerais (estilo marketplace)
insert into public.categorias (nome, slug, icone, cor, tipo, ordem) values
  ('Telemóveis','telemoveis','smartphone','#1d4ed8','produto',10),
  ('Electrónica','electronica','plug','#0f766e','produto',11),
  ('Moda','moda','shirt','#be185d','produto',12),
  ('Casa e Cozinha','casa-cozinha','sofa','#b45309','produto',13),
  ('Beleza e Saúde','beleza-saude','sparkles','#9d174d','produto',14),
  ('Bebé e Criança','bebe-crianca','baby','#7c3aed','produto',15),
  ('Desporto','desporto','dumbbell','#15803d','produto',16),
  ('Automóvel','automovel','car','#374151','produto',17),
  ('Alimentação','alimentacao','shopping-basket','#c2410c','produto',18),
  ('Informática','informatica','laptop','#1e3a8a','produto',19)
on conflict (slug) do nothing;

-- ===== enderecos =====
create table if not exists public.enderecos (
  id uuid primary key default gen_random_uuid(),
  utilizador_id uuid not null references public.profiles(id) on delete cascade,
  nome text not null,
  telefone text not null,
  provincia text not null,
  distrito text not null,
  bairro text,
  referencia text,
  principal boolean not null default false,
  criado_em timestamptz not null default now()
);
grant select, insert, update, delete on public.enderecos to authenticated;
grant all on public.enderecos to service_role;
alter table public.enderecos enable row level security;
create policy "os meus enderecos" on public.enderecos for select to authenticated using (auth.uid() = utilizador_id);
create policy "criar endereco" on public.enderecos for insert to authenticated with check (auth.uid() = utilizador_id);
create policy "editar endereco" on public.enderecos for update to authenticated using (auth.uid() = utilizador_id) with check (auth.uid() = utilizador_id);
create policy "apagar endereco" on public.enderecos for delete to authenticated using (auth.uid() = utilizador_id);

-- ===== pedidos =====
create sequence if not exists public.pedidos_numero_seq start 1001;
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique default ('MD-' || nextval('public.pedidos_numero_seq')::text),
  comprador_id uuid not null references public.profiles(id) on delete cascade,
  estado text not null default 'aguarda_pagamento'
    check (estado in ('aguarda_pagamento','pago','em_preparacao','enviado','entregue','cancelado','falhou')),
  subtotal numeric(12,2) not null,
  envio numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  moeda text not null default 'MZN',
  metodo_pagamento text check (metodo_pagamento in ('mpesa','emola')),
  telefone_pagamento text,
  endereco jsonb not null,
  notas text,
  pago_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
grant select, update on public.pedidos to authenticated;
grant all on public.pedidos to service_role;
alter table public.pedidos enable row level security;
create index pedidos_comprador_idx on public.pedidos (comprador_id, criado_em desc);

create table if not exists public.pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  vendedor_id uuid not null references public.profiles(id) on delete cascade,
  titulo text not null,
  preco numeric(12,2) not null,
  quantidade integer not null check (quantidade > 0),
  imagem_url text,
  estado text not null default 'pendente'
    check (estado in ('pendente','confirmado','enviado','entregue','cancelado')),
  criado_em timestamptz not null default now()
);
grant select, update on public.pedido_itens to authenticated;
grant all on public.pedido_itens to service_role;
alter table public.pedido_itens enable row level security;
create index pedido_itens_vendedor_idx on public.pedido_itens (vendedor_id, criado_em desc);
create index pedido_itens_pedido_idx on public.pedido_itens (pedido_id);

-- Só o servidor (service_role) cria pedidos; comprador e vendedores leem.
create policy "comprador ve pedido" on public.pedidos for select to authenticated using (
  auth.uid() = comprador_id or public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.pedido_itens i where i.pedido_id = id and i.vendedor_id = auth.uid())
);
create policy "vendedor atualiza estado" on public.pedidos for update to authenticated using (
  public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.pedido_itens i where i.pedido_id = id and i.vendedor_id = auth.uid())
) with check (true);
create policy "ver itens do pedido" on public.pedido_itens for select to authenticated using (
  auth.uid() = vendedor_id or public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.pedidos p where p.id = pedido_id and p.comprador_id = auth.uid())
);
create policy "vendedor atualiza item" on public.pedido_itens for update to authenticated using (
  auth.uid() = vendedor_id or public.has_role(auth.uid(),'admin')
) with check (true);

-- ===== pagamentos =====
create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  metodo text not null check (metodo in ('mpesa','emola')),
  telefone text not null,
  valor numeric(12,2) not null,
  referencia text not null unique,
  estado text not null default 'pendente' check (estado in ('pendente','pago','falhou','expirado')),
  ambiente text not null default 'producao' check (ambiente in ('producao','sandbox','simulacao')),
  codigo_resposta text,
  mensagem text,
  transacao_id text,
  conversa_id text,
  resposta jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
grant select on public.pagamentos to authenticated;
grant all on public.pagamentos to service_role;
alter table public.pagamentos enable row level security;
create policy "ver os meus pagamentos" on public.pagamentos for select to authenticated using (
  public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.pedidos p where p.id = pedido_id and p.comprador_id = auth.uid())
);
create index pagamentos_pedido_idx on public.pagamentos (pedido_id, criado_em desc);

-- ===== automatismos =====
create or replace function public.pedido_atualizado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.atualizado_em := now();
  if new.estado is distinct from old.estado then
    if new.estado = 'pago' and new.pago_em is null then new.pago_em := now(); end if;
    insert into public.notificacoes (utilizador_id, tipo, titulo, mensagem, link)
    values (new.comprador_id, 'pedido',
      case new.estado
        when 'pago' then 'Pagamento confirmado'
        when 'em_preparacao' then 'Encomenda em preparação'
        when 'enviado' then 'Encomenda enviada'
        when 'entregue' then 'Encomenda entregue'
        when 'cancelado' then 'Encomenda cancelada'
        when 'falhou' then 'Pagamento falhou'
        else 'Encomenda atualizada' end,
      'Encomenda ' || new.numero, new.id::text);
  end if;
  return new;
end;
$$;
create trigger trg_pedido_atualizado before update on public.pedidos for each row execute function public.pedido_atualizado();

-- Quando o pagamento fica pago: marca pedido, baixa stock, conta vendas e avisa vendedores.
create or replace function public.pagamento_confirmado()
returns trigger language plpgsql security definer set search_path = public as $$
declare item record;
begin
  new.atualizado_em := now();
  if new.estado = 'pago' and old.estado is distinct from 'pago' then
    update public.pedidos set estado = 'pago', metodo_pagamento = new.metodo, telefone_pagamento = new.telefone
      where id = new.pedido_id and estado in ('aguarda_pagamento','falhou');
    for item in select * from public.pedido_itens where pedido_id = new.pedido_id loop
      update public.produtos set
        stock = greatest(0, stock - item.quantidade),
        vendas = vendas + item.quantidade
      where id = item.produto_id;
      update public.pedido_itens set estado = 'confirmado' where id = item.id;
      insert into public.notificacoes (utilizador_id, tipo, titulo, mensagem, link)
      values (item.vendedor_id, 'venda', 'Nova venda paga', item.quantidade || ' × ' || item.titulo, new.pedido_id::text);
    end loop;
  elsif new.estado in ('falhou','expirado') and old.estado = 'pendente' then
    update public.pedidos set estado = 'falhou' where id = new.pedido_id and estado = 'aguarda_pagamento';
  end if;
  return new;
end;
$$;
create trigger trg_pagamento_confirmado before update on public.pagamentos for each row execute function public.pagamento_confirmado();

alter table public.pedidos replica identity full;
alter table public.pagamentos replica identity full;
alter publication supabase_realtime add table public.pedidos;
alter publication supabase_realtime add table public.pagamentos;
