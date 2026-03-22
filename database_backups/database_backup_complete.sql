-- ============================================
-- BACKUP COMPLETO DA ESTRUTURA DO BANCO DE DADOS
-- Pão Caseiro - paocaseiro.co.mz
-- Project ID: odzzshgvgwiaeafyzqiv
-- Data: 2026-02-16
-- ============================================

-- NOTA: Execute este script no SQL Editor do Supabase para recriar toda a estrutura

-- ============================================
-- 1. TABELA: customers (Clientes)
-- ============================================
create table if not exists public.customers (
  id uuid default uuid_generate_v4() primary key,
  phone text unique not null,
  name text not null,
  address text,
  last_order_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists customers_phone_idx on public.customers(phone);

-- ============================================
-- 2. TABELA: orders (Pedidos)
-- ============================================
create table if not exists public.orders (
  id uuid default uuid_generate_v4() primary key,
  short_id text unique,
  payment_ref text,
  transaction_id text,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_name_snapshot text,
  customer_phone text,
  customer_phone_snapshot text,
  customer_address text,
  customer_address_snapshot text,
  delivery_type text check (delivery_type in ('delivery', 'pickup', 'dine_in')),
  delivery_address text,
  delivery_coordinates text,
  table_zone text,
  table_people integer,
  notes text,
  total_amount numeric(10,2) not null default 0,
  amount_paid numeric(10,2) default 0,
  balance numeric(10,2) default 0,
  payment_method text,
  payment_status text,
  status text check (status in ('pending', 'processing', 'ready', 'delivering', 'completed', 'cancelled')) default 'pending',
  estimated_ready_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists orders_short_id_idx on public.orders(short_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

-- ============================================
-- 3. TABELA: order_items (Itens do Pedido)
-- ============================================
create table if not exists public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  product_name text not null,
  quantity integer not null default 1,
  price numeric(10,2) not null,
  subtotal numeric(10,2) not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);

-- ============================================
-- 4. TABELA: products (Produtos)
-- ============================================
create table if not exists public.products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  name_en text,
  description text,
  price numeric(10,2) not null,
  category text,
  image text,
  is_available boolean default true,
  is_special boolean default false,
  prep_time text,
  delivery_time text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists products_category_idx on public.products(category);
create index if not exists products_is_available_idx on public.products(is_available);

-- ============================================
-- 5. TABELA: product_variations (Variações de Produtos)
-- ============================================
create table if not exists public.product_variations (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  name text not null,
  price_adjustment numeric(10,2) default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists product_variations_product_id_idx on public.product_variations(product_id);

-- ============================================
-- 6. TABELA: team_members (Equipe)
-- ============================================
create table if not exists public.team_members (
  id uuid default uuid_generate_v4() primary key,
  username text unique not null,
  password text not null,
  name text not null,
  role text check (role in ('admin', 'kitchen', 'delivery', 'support')) default 'support',
  phone text,
  email text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists team_members_username_idx on public.team_members(username);
create index if not exists team_members_role_idx on public.team_members(role);

-- ============================================
-- 7. TABELA: logistics_drivers (Motoristas de Entrega)
-- ============================================
create table if not exists public.logistics_drivers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  phone text not null,
  vehicle_type text,
  status text check (status in ('available', 'busy', 'offline')) default 'offline',
  base_location text,
  alternative_phone text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================
-- 8. TABELA: contact_messages (Mensagens de Contato)
-- ============================================
create table if not exists public.contact_messages (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text,
  phone text,
  message text not null,
  status text default 'new',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists contact_messages_created_at_idx on public.contact_messages(created_at desc);

-- ============================================
-- 9. TABELA: settings (Configurações do Sistema)
-- ============================================
create table if not exists public.settings (
  key text primary key,
  value text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================
-- 10. TABELA: ai_chat_sessions (Sessões de Chat AI)
-- ============================================
create table if not exists public.ai_chat_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id text not null,
  title text default 'Nova Conversa',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================
-- 11. TABELA: ai_chat_history (Histórico de Chat AI)
-- ============================================
create table if not exists public.ai_chat_history (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.ai_chat_sessions(id) on delete cascade,
  user_id text not null,
  role text check (role in ('user', 'assistant', 'system')) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================
-- STORAGE BUCKETS (Armazenamento de Arquivos)
-- ============================================
-- NOTA: Estes buckets devem ser criados manualmente no Supabase Storage:
-- 1. products (para imagens de produtos)
-- 2. support-tickets (para anexos de suporte)

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS em todas as tabelas
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.products enable row level security;
alter table public.product_variations enable row level security;
alter table public.team_members enable row level security;
alter table public.logistics_drivers enable row level security;
alter table public.contact_messages enable row level security;
alter table public.settings enable row level security;
alter table public.ai_chat_sessions enable row level security;
alter table public.ai_chat_history enable row level security;

-- Políticas permissivas (AJUSTE CONFORME NECESSÁRIO PARA PRODUÇÃO)
create policy "Enable all access" on public.customers for all using (true) with check (true);
create policy "Enable all access" on public.orders for all using (true) with check (true);
create policy "Enable all access" on public.order_items for all using (true) with check (true);
create policy "Enable all access" on public.products for all using (true) with check (true);
create policy "Enable all access" on public.product_variations for all using (true) with check (true);
create policy "Enable all access" on public.team_members for all using (true) with check (true);
create policy "Enable all access" on public.logistics_drivers for all using (true) with check (true);
create policy "Enable all access" on public.contact_messages for all using (true) with check (true);
create policy "Enable all access" on public.settings for all using (true) with check (true);
create policy "Enable all access" on public.ai_chat_sessions for all using (true) with check (true);
create policy "Enable all access" on public.ai_chat_history for all using (true) with check (true);

-- ============================================
-- FIM DO BACKUP
-- ============================================
