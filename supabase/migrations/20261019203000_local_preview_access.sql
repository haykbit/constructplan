do $migration$
declare
  preview_user_id uuid;
  casa_gemma_id uuid;
begin
  select id into preview_user_id
  from auth.users
  where lower(email) = 'constructplan-local-preview@haykbit.dev'
  limit 1;

  if preview_user_id is null then
    preview_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      preview_user_id,
      'authenticated',
      'authenticated',
      'constructplan-local-preview@haykbit.dev',
      '$2a$12$akjofHBmfo4ch0f6haGsQuINKL9s7NJq63v04ZfMLnyOqjzP9ITOK',
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      preview_user_id::text,
      preview_user_id,
      jsonb_build_object('sub', preview_user_id::text, 'email', 'constructplan-local-preview@haykbit.dev', 'email_verified', true),
      'email',
      now(),
      now(),
      now()
    );
  end if;

  select id into casa_gemma_id
  from public.projects
  where slug = 'casa-gemma';

  if casa_gemma_id is null then
    raise exception 'Casa Gemma no existe';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (casa_gemma_id, preview_user_id, 'viewer')
  on conflict (project_id, user_id) do update set role = 'viewer';
end
$migration$;
