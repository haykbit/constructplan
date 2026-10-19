# ADR-0001: One multi-project application with document persistence

- Status: Accepted
- Date: 2026-10-01

## Context

Casa Gemma began as a single hard-coded prototype. Future houses need stable URLs, client editing, durable saves and published views without copying the complete application for every commission.

## Decision

Deploy one React application. Every Project is addressed by a slug and stores a versioned Project Document. The Project Repository is a deep module whose interface covers loading, saving, publishing, membership and live updates. It has a local browser adapter for development and a Supabase adapter for production.

Keep Draft and Publication in separate database tables. Use PostgreSQL row-level security for private data and optimistic Revision checks for writes. Select the project-specific Plan and Model through a Template registry.

## Consequences

- Improvements to the platform reach every Project through one deployment.
- A new house adds a Template and Project Document rather than another application.
- Local development remains possible without cloud credentials.
- Supabase and Vercel can initially run on free plans and can later be replaced behind the Project Repository seam.
- Production requires a Supabase project, environment variables and the committed database migration.
