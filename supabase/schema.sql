-- Banbu CQSR collaborative review schema
-- Run this in Supabase SQL Editor after creating a private project.

create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('annotator','reviewer','admin')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  source_name text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','annotated','review','approved','archived')),
  standard_version text not null default 'cqsr-v1',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.segments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  position integer not null,
  paragraph_key text,
  text text not null,
  created_at timestamptz not null default now(),
  unique (document_id, position)
);

create table if not exists public.annotations (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references public.segments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (label in ('C','Q','S','R','X')),
  subtype text,
  priority text,
  note text,
  confidence numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (segment_id, user_id)
);

create table if not exists public.review_decisions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  segment_id uuid not null references public.segments(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  final_label text not null check (final_label in ('C','Q','S','R','X')),
  final_subtype text,
  status text not null check (status in ('approved','rejected','needs_revision')),
  note text,
  standard_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.document_revisions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  version integer not null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

create table if not exists public.corpus_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  segment_id uuid references public.segments(id) on delete set null,
  text text not null,
  label text not null check (label in ('C','Q','S','R','X')),
  subtype text,
  source_meta jsonb not null default '{}'::jsonb,
  standard_version text not null,
  approved_by uuid not null references auth.users(id) on delete restrict,
  approved_at timestamptz not null default now(),
  is_boundary_case boolean not null default false,
  unique (workspace_id, segment_id, standard_version)
);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.documents enable row level security;
alter table public.segments enable row level security;
alter table public.annotations enable row level security;
alter table public.review_decisions enable row level security;
alter table public.document_revisions enable row level security;
alter table public.corpus_entries enable row level security;

create or replace function public.is_workspace_member(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.workspace_members m where m.workspace_id = target and m.user_id = auth.uid());
$$;

create or replace function public.is_workspace_reviewer(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.workspace_members m where m.workspace_id = target and m.user_id = auth.uid() and m.role in ('reviewer','admin'));
$$;

-- Workspace bootstrap and member management. The first signed-in user creates
-- the workspace and is automatically allowed to add the review team.
create policy "authenticated users can create own workspace" on public.workspaces
  for insert to authenticated with check (created_by = auth.uid());
create policy "workspace creators can update own workspace" on public.workspaces
  for update using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "members can read workspace members" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));
create policy "workspace creators can add members" on public.workspace_members
  for insert with check (
    exists(select 1 from public.workspaces w where w.id = workspace_id and w.created_by = auth.uid())
    or (user_id = auth.uid() and public.is_workspace_member(workspace_id))
  );
create policy "workspace admins can manage members" on public.workspace_members
  for update using (exists(select 1 from public.workspace_members m where m.workspace_id = workspace_id and m.user_id = auth.uid() and m.role = 'admin'))
  with check (exists(select 1 from public.workspace_members m where m.workspace_id = workspace_id and m.user_id = auth.uid() and m.role = 'admin'));

create policy "members can read workspaces" on public.workspaces for select using (public.is_workspace_member(id));
create policy "members can read documents" on public.documents for select using (public.is_workspace_member(workspace_id));
create policy "members can write documents" on public.documents for insert with check (public.is_workspace_member(workspace_id));
create policy "members can update documents" on public.documents for update using (public.is_workspace_member(workspace_id));
create policy "members can read segments" on public.segments for select using (exists(select 1 from public.documents d where d.id=document_id and public.is_workspace_member(d.workspace_id)));
create policy "members can write segments" on public.segments for all using (exists(select 1 from public.documents d where d.id=document_id and public.is_workspace_member(d.workspace_id))) with check (exists(select 1 from public.documents d where d.id=document_id and public.is_workspace_member(d.workspace_id)));
create policy "members can read annotations" on public.annotations for select using (exists(select 1 from public.segments s join public.documents d on d.id=s.document_id where s.id=segment_id and public.is_workspace_member(d.workspace_id)));
create policy "users can write own annotations" on public.annotations for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "members can read decisions" on public.review_decisions for select using (exists(select 1 from public.documents d where d.id=document_id and public.is_workspace_member(d.workspace_id)));
create policy "reviewers can write decisions" on public.review_decisions for all using (public.is_workspace_reviewer((select workspace_id from public.documents where id=document_id))) with check (public.is_workspace_reviewer((select workspace_id from public.documents where id=document_id)));
create policy "members can read revisions" on public.document_revisions for select using (exists(select 1 from public.documents d where d.id=document_id and public.is_workspace_member(d.workspace_id)));
create policy "reviewers can write revisions" on public.document_revisions for insert with check (public.is_workspace_reviewer((select workspace_id from public.documents where id=document_id)));
create policy "members can read corpus" on public.corpus_entries for select using (public.is_workspace_member(workspace_id));
create policy "reviewers can write corpus" on public.corpus_entries for all using (public.is_workspace_reviewer(workspace_id)) with check (public.is_workspace_reviewer(workspace_id));
