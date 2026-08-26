-- ============================================================
-- Tapete Vital / PAT — usuarios del panel de gestión
-- Pegar en Supabase → SQL Editor → Run
--
-- Las contraseñas NUNCA se guardan en texto: se guarda el hash
-- PBKDF2-SHA256 (100k iteraciones) y su salt. Ni siquiera desde
-- la base se pueden leer las claves de la gente.
-- ============================================================

create table usuarios (
  usuario     text primary key,
  clave_hash  text not null,
  salt        text not null,
  es_admin    boolean not null default false,
  creado_en   timestamptz not null default now(),
  ultimo_acceso timestamptz,

  constraint usuario_valido check (usuario ~ '^[a-z0-9._-]{3,30}$')
);

alter table usuarios enable row level security;

-- Solo el servidor (service_role) toca esta tabla; anon/authenticated no.
grant select, insert, update, delete on public.usuarios to service_role;
