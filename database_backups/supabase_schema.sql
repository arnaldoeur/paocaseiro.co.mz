-- 1. Create or Update Logistics Drivers
create table if not exists logistics_drivers (
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

-- 2. Create AI Chat Sessions (New Table)
create table if not exists ai_chat_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id text not null,
  title text default 'Nova Conversa',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create AI Chat History (If not exists)
create table if not exists ai_chat_history (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references ai_chat_sessions(id) on delete cascade,
  user_id text not null,
  role text check (role in ('user', 'assistant', 'system')) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Safe Update: Add session_id to ai_chat_history if it was created previously without it
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'ai_chat_history' and column_name = 'session_id') then
        alter table ai_chat_history add column session_id uuid references ai_chat_sessions(id) on delete cascade;
    end if;
end $$;

-- 5. Safe Policies (Drop first to avoid conflicts)
drop policy if exists "Enable all access for all users" on logistics_drivers;
drop policy if exists "Enable all access for all users" on ai_chat_sessions;
drop policy if exists "Enable all access for all users" on ai_chat_history;

-- Enable RLS (Idempotent)
alter table logistics_drivers enable row level security;
alter table ai_chat_sessions enable row level security;
alter table ai_chat_history enable row level security;

-- Re-create Policies
create policy "Enable all access for all users" on logistics_drivers for all using (true) with check (true);
create policy "Enable all access for all users" on ai_chat_sessions for all using (true) with check (true);
create policy "Enable all access for all users" on ai_chat_history for all using (true) with check (true);
