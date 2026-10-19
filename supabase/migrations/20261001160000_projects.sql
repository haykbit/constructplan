create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  draft_document jsonb not null,
  published_document jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  published_revision bigint not null default 1 check (published_revision > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.project_revisions (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  revision bigint not null,
  document jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, revision)
);

create table if not exists public.project_invitations (
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null,
  role text not null check (role in ('editor', 'viewer')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, email)
);

-- Public data lives in its own table. Anonymous visitors can never select the
-- private draft_document from projects, even when a presentation is public.
create table if not exists public.project_publications (
  project_id uuid primary key references public.projects(id) on delete cascade,
  slug text not null unique,
  name text not null,
  document jsonb not null,
  revision bigint not null,
  published_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_revisions enable row level security;
alter table public.project_invitations enable row level security;
alter table public.project_publications enable row level security;

create or replace function public.can_read_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = target_project_id and user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = target_project_id
      and user_id = auth.uid()
      and role in ('owner', 'editor')
  );
$$;

drop policy if exists "members read projects" on public.projects;
create policy "members read projects" on public.projects for select to authenticated
using (public.can_read_project(id));

drop policy if exists "editors update projects" on public.projects;
create policy "editors update projects" on public.projects for update to authenticated
using (public.can_edit_project(id)) with check (public.can_edit_project(id));

drop policy if exists "members read their membership" on public.project_members;
create policy "members read their membership" on public.project_members for select to authenticated
using (user_id = auth.uid());

drop policy if exists "members read revisions" on public.project_revisions;
create policy "members read revisions" on public.project_revisions for select to authenticated
using (public.can_read_project(project_id));

drop policy if exists "editors create revisions" on public.project_revisions;
create policy "editors create revisions" on public.project_revisions for insert to authenticated
with check (public.can_edit_project(project_id) and created_by = auth.uid());

drop policy if exists "owners read invitations" on public.project_invitations;
create policy "owners read invitations" on public.project_invitations for select to authenticated
using (exists (
  select 1 from public.project_members member
  where member.project_id = project_invitations.project_id
    and member.user_id = auth.uid()
    and member.role = 'owner'
));

drop policy if exists "published projects are public" on public.project_publications;
create policy "published projects are public" on public.project_publications for select to anon, authenticated
using (true);

create or replace function public.create_project(p_name text, p_slug text, p_document jsonb)
returns setof public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  new_project public.projects;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'invalid slug'; end if;
  insert into public.projects (slug, name, draft_document, published_document, created_by)
  values (p_slug, p_name, p_document, p_document, auth.uid())
  returning * into new_project;

  insert into public.project_members (project_id, user_id, role)
  values (new_project.id, auth.uid(), 'owner');

  insert into public.project_revisions (project_id, revision, document, created_by)
  values (new_project.id, 1, p_document, auth.uid());

  insert into public.project_publications (project_id, slug, name, document, revision)
  values (new_project.id, new_project.slug, new_project.name, p_document, 1);

  return next new_project;
end;
$$;

create or replace function public.save_project_draft(p_project_id uuid, p_expected_revision bigint, p_document jsonb)
returns table (new_revision bigint, saved_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_revision bigint;
  change_time timestamptz := now();
begin
  update public.projects
  set draft_document = p_document,
      revision = revision + 1,
      updated_at = change_time
  where id = p_project_id
    and revision = p_expected_revision
    and public.can_edit_project(id)
  returning revision into next_revision;

  if next_revision is null then return; end if;

  insert into public.project_revisions (project_id, revision, document, created_by)
  values (p_project_id, next_revision, p_document, auth.uid());

  return query select next_revision, change_time;
end;
$$;

create or replace function public.invite_project_member(p_project_id uuid, p_email text, p_role text default 'editor')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_role not in ('editor', 'viewer') then raise exception 'invalid role'; end if;
  if not exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = auth.uid() and role = 'owner'
  ) then raise exception 'only the owner can invite'; end if;

  insert into public.project_invitations (project_id, email, role, invited_by)
  values (p_project_id, lower(trim(p_email)), p_role, auth.uid())
  on conflict (project_id, email) do update set role = excluded.role, invited_by = excluded.invited_by, created_at = now();
end;
$$;

create or replace function public.claim_project_invitations()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  claimed integer := 0;
  user_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or user_email = '' then return 0; end if;

  insert into public.project_members (project_id, user_id, role)
  select invitation.project_id, auth.uid(), invitation.role
  from public.project_invitations invitation
  where invitation.email = user_email
  on conflict (project_id, user_id) do nothing;
  get diagnostics claimed = row_count;

  delete from public.project_invitations where email = user_email;
  return claimed;
end;
$$;

create or replace function public.publish_project(p_project_id uuid, p_expected_revision bigint)
returns table (published_revision bigint, published_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_project public.projects;
  publish_time timestamptz := now();
begin
  if not public.can_edit_project(p_project_id) then raise exception 'forbidden'; end if;
  select * into current_project from public.projects
  where id = p_project_id and revision = p_expected_revision
  for update;
  if current_project.id is null then return; end if;

  update public.projects
  set published_document = current_project.draft_document,
      published_revision = current_project.revision,
      updated_at = publish_time
  where id = p_project_id;

  insert into public.project_publications (project_id, slug, name, document, revision, published_at)
  values (current_project.id, current_project.slug, current_project.name, current_project.draft_document, current_project.revision, publish_time)
  on conflict (project_id) do update set
    slug = excluded.slug,
    name = excluded.name,
    document = excluded.document,
    revision = excluded.revision,
    published_at = excluded.published_at;

  return query select current_project.revision, publish_time;
end;
$$;

revoke all on function public.create_project(text, text, jsonb) from public;
revoke all on function public.save_project_draft(uuid, bigint, jsonb) from public;
revoke all on function public.publish_project(uuid, bigint) from public;
revoke all on function public.invite_project_member(uuid, text, text) from public;
revoke all on function public.claim_project_invitations() from public;
grant execute on function public.create_project(text, text, jsonb) to authenticated;
grant execute on function public.save_project_draft(uuid, bigint, jsonb) to authenticated;
grant execute on function public.publish_project(uuid, bigint) to authenticated;
grant execute on function public.invite_project_member(uuid, text, text) to authenticated;
grant execute on function public.claim_project_invitations() to authenticated;
grant select, update on public.projects to authenticated;
grant select on public.project_members to authenticated;
grant select, insert on public.project_revisions to authenticated;
grant usage, select on sequence public.project_revisions_id_seq to authenticated;
grant select on public.project_publications to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'projects'
    ) then
    alter publication supabase_realtime add table public.projects;
  end if;
end $$;
