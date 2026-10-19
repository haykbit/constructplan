drop policy if exists "published projects are public" on public.project_publications;
drop policy if exists "members read publications" on public.project_publications;

create policy "members read publications"
on public.project_publications
for select
to authenticated
using (public.can_read_project(project_id));
