do $migration$
declare
  owner_id uuid;
  target_project_id uuid;
  next_revision bigint;
  casa_gemma_document jsonb := $document$
{"schemaVersion":1,"templateId":"casa-gemma-v1","design":{"layoutRevision":13,"livingStart":7.5,"roofPitch":11,"roofVisible":true,"exteriorWallsVisible":true,"interiorWallsVisible":true,"furnitureVisible":true,"landscapeVisible":true,"wallFinish":"cal","furniture":[{"id":"master-bed","kind":"bed","label":"Cama principal","x":0.66,"y":0.58,"w":1.45,"h":1.85,"height":0.64,"elevation":0,"rotation":0},{"id":"master-wardrobe","kind":"wardrobe","label":"Armario principal","x":2.73,"y":0.52,"w":0.46,"h":1.4,"height":2.18,"elevation":0,"rotation":0},{"id":"bedroom-2-bed","kind":"bed","label":"Cama dormitorio 2","x":5.35,"y":0.72,"w":1.65,"h":0.82,"height":0.64,"elevation":0,"rotation":0},{"id":"bedroom-2-wardrobe","kind":"wardrobe","label":"Armario dormitorio 2","x":7.5,"y":2.2,"w":0.38,"h":1,"height":2.18,"elevation":0,"rotation":0},{"id":"bath-shower","kind":"shower","label":"Ducha","x":0.42,"y":4.34,"w":0.68,"h":0.68,"height":2.02,"elevation":0,"rotation":0},{"id":"bath-sink","kind":"sink","label":"Lavabo baño","x":1.33,"y":4.54,"w":0.5,"h":0.36,"height":0.94,"elevation":0,"rotation":0},{"id":"bath-toilet","kind":"toilet","label":"Inodoro baño","x":2.14,"y":4.71,"w":0.42,"h":0.62,"height":0.44,"elevation":0,"rotation":0},{"id":"office-desk","kind":"desk","label":"Escritorio","x":0.72,"y":6.12,"w":1.42,"h":0.64,"height":0.76,"elevation":0,"rotation":0},{"id":"office-storage","kind":"wardrobe","label":"Almacenaje oficina","x":0.45,"y":6.96,"w":1.2,"h":0.34,"height":2.05,"elevation":0,"rotation":0},{"id":"wardrobe-room-upper","kind":"wardrobe","label":"Ropero superior","x":5.22,"y":4.22,"w":1.5,"h":0.42,"height":2.18,"elevation":0,"rotation":0},{"id":"wardrobe-room-lower","kind":"wardrobe","label":"Ropero inferior","x":5.22,"y":4.94,"w":1.5,"h":0.42,"height":2.18,"elevation":0,"rotation":0},{"id":"bath-2-shower","kind":"shower","label":"Ducha baño 2","x":5.18,"y":5.84,"w":0.72,"h":0.72,"height":2.02,"elevation":0,"rotation":0},{"id":"bath-2-sink","kind":"sink","label":"Lavabo baño 2","x":6.2,"y":5.9,"w":0.5,"h":0.36,"height":0.94,"elevation":0,"rotation":0},{"id":"bath-2-toilet","kind":"toilet","label":"Inodoro baño 2","x":7.24,"y":6.470000000000001,"w":0.42,"h":0.62,"height":0.44,"elevation":0,"rotation":0},{"id":"kitchen-run","kind":"kitchen-base","label":"Frente de cocina","x":0.42,"y":7.86,"w":0.52,"h":2.78,"height":0.94,"elevation":0,"rotation":0},{"id":"kitchen-top-run","kind":"kitchen-base","label":"Módulos de cocina","x":0.94,"y":10.72,"w":1.92,"h":0.52,"height":0.94,"elevation":0,"rotation":0},{"id":"kitchen-island","kind":"kitchen-island","label":"Isla de cocina","x":1.92,"y":8.34,"w":0.78,"h":1.18,"height":0.97,"elevation":0,"rotation":0},{"id":"living-sofa","kind":"sofa","label":"Sofá","x":4,"y":8,"w":0.66,"h":1.55,"height":0.86,"elevation":0,"rotation":0},{"id":"living-coffee","kind":"coffee-table","label":"Mesa de centro","x":4.98,"y":8.3,"w":0.62,"h":0.9,"height":0.34,"elevation":0,"rotation":0},{"id":"living-tv","kind":"tv-unit","label":"Mueble de televisión","x":7.78,"y":8.18,"w":0.2,"h":1.02,"height":0.58,"elevation":0,"rotation":0},{"id":"living-table","kind":"dining-table","label":"Mesa de comedor","x":5.8,"y":10.18,"w":1.24,"h":0.6,"height":0.78,"elevation":0,"rotation":0}]}}$document$::jsonb;
begin
  select id into owner_id
  from auth.users
  where lower(email) = lower('hpetrosyan.projects@gmail.com')
  order by created_at
  limit 1;

  if owner_id is null then
    raise exception 'Primero inicia sesión con hpetrosyan.projects@gmail.com para crear el usuario propietario';
  end if;

  select id, revision + 1
  into target_project_id, next_revision
  from public.projects
  where slug = 'casa-gemma'
  for update;

  if target_project_id is null then
    insert into public.projects (
      slug,
      name,
      draft_document,
      published_document,
      revision,
      published_revision,
      created_by
    )
    values (
      'casa-gemma',
      'Casa Gemma',
      casa_gemma_document,
      casa_gemma_document,
      1,
      1,
      owner_id
    )
    returning id, revision into target_project_id, next_revision;
  else
    update public.projects
    set name = 'Casa Gemma',
        draft_document = casa_gemma_document,
        published_document = casa_gemma_document,
        revision = next_revision,
        published_revision = next_revision,
        created_by = owner_id,
        updated_at = now()
    where id = target_project_id;
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (target_project_id, owner_id, 'owner')
  on conflict (project_id, user_id) do update set role = 'owner';

  insert into public.project_revisions (project_id, revision, document, created_by)
  values (target_project_id, next_revision, casa_gemma_document, owner_id)
  on conflict (project_id, revision) do update
  set document = excluded.document,
      created_by = excluded.created_by;

  insert into public.project_publications (project_id, slug, name, document, revision, published_at)
  values (target_project_id, 'casa-gemma', 'Casa Gemma', casa_gemma_document, next_revision, now())
  on conflict (project_id) do update
  set slug = excluded.slug,
      name = excluded.name,
      document = excluded.document,
      revision = excluded.revision,
      published_at = excluded.published_at;
end
$migration$;

