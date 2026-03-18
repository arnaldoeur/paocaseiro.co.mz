-- Migration: Create customers table for Pão Caseiro
-- This table is required for the order management system

-- Create customers table
create table if not exists public.customers (
  id uuid default uuid_generate_v4() primary key,
  phone text unique not null,
  name text not null,
  address text,
  last_order_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.customers enable row level security;

-- Create policy for all access (adjust based on your auth requirements)
create policy "Enable all access for authenticated users" 
  on public.customers 
  for all 
  using (true) 
  with check (true);

-- Create index on phone for faster lookups
create index if not exists customers_phone_idx on public.customers(phone);
