# Despliegue de Forma

La aplicación tiene dos adaptadores de proyecto:

- **Local**: se activa cuando no existen variables de Supabase. Guarda los proyectos en `localStorage` y permite desarrollar sin servicios externos.
- **Supabase**: se activa al definir `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Usa PostgreSQL, autenticación por enlace, RLS, revisiones y sincronización en tiempo real.

## 1. Crear la base de datos gratuita

1. Crear un proyecto en Supabase.
2. Instalar o ejecutar la CLI de Supabase.
3. Enlazar este repositorio y aplicar la migración:

```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push
```

La migración está en `supabase/migrations/20261001160000_projects.sql`.

En **Authentication → URL configuration**, configurar:

- Site URL: el dominio de producción.
- Redirect URLs: el dominio de producción y las URLs de preview de Vercel.

## 2. Variables del frontend

Copiar `.env.example` a `.env.local` durante el desarrollo:

```bash
cp .env.example .env.local
```

Completar únicamente la URL y la clave pública `anon`. La clave `service_role` no debe colocarse nunca en Vite ni enviarse al navegador.

## 3. Desplegar en Vercel

1. Subir el repositorio a GitHub.
2. Importarlo en Vercel como proyecto Vite.
3. Añadir `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Preview y Production.
4. Desplegar.

`vercel.json` hace que las rutas `/proyectos/:slug` y `/presentacion/:slug` funcionen al abrirlas directamente.

Cada pull request recibe una URL de preview. Al integrar en `main`, Vercel actualiza producción sin modificar las URLs de los proyectos.

## 4. Primer uso

1. Abrir `/proyectos`.
2. Acceder mediante el enlace mágico enviado por Supabase.
3. Crear el proyecto desde la plantilla base.
4. Autorizar el correo del cliente desde **Acceso**.
5. Compartir `/proyectos/:slug` para editar o `/presentacion/:slug` para consultar la versión publicada.

Los cambios del editor se guardan después de terminar cada interacción. El botón **Publicar** copia el borrador validado a la presentación pública.

## Seguridad y copias

- Los borradores sólo se consultan mediante usuarios miembros del proyecto.
- Las presentaciones públicas se leen desde una tabla separada y nunca exponen el borrador.
- Cada guardado usa una revisión esperada para evitar sobrescrituras entre pestañas.
- Cada guardado crea una entrada en `project_revisions`.
- Conviene activar las copias de seguridad disponibles en el proveedor antes de usar proyectos reales.
