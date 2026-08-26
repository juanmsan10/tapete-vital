-- ============================================================
-- Tapete Vital / PAT — esquema de pedidos
-- Pegar en Supabase → SQL Editor → Run
-- ============================================================

-- Estados cerrados: el dashboard no puede escribir nada fuera de esta lista
create type estado_pedido as enum (
  'Iniciado',
  'Rechazado',
  'Aprobado',
  'Empacado',
  'Enviado',
  'Entregado',
  'Descartado'
);

create table pedidos (
  orden         text primary key,                -- TV-XXXXXX, único por constraint
  fecha         timestamptz not null,             -- antes era texto es-CO
  estado        estado_pedido not null,
  cantidad      int  not null default 1 check (cantidad >= 1),
  total         int  not null default 0 check (total >= 0),
  nombre        text not null default '',
  cedula        text default '',
  telefono      text default '',
  email         text default '',
  ciudad        text default '',
  direccion     text default '',
  notas         text default '',
  guia          text default '',
  productos     text default '',
  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  -- La cédula, si viene, solo dígitos/puntos/guiones (se validó en el
  -- checkout tras encontrar que ~10% escribía su correo aquí)
  constraint cedula_numerica check (cedula = '' or cedula ~ '^[0-9][0-9.\-]{4,}$')
);

-- El dashboard filtra por estado y ordena por fecha
create index pedidos_estado_idx on pedidos (estado);
create index pedidos_fecha_idx  on pedidos (fecha desc);

-- Rastro de cuándo cambió cada pedido (hoy no existe)
create or replace function tocar_actualizado_en()
returns trigger as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$ language plpgsql;

create trigger pedidos_actualizado_en
  before update on pedidos
  for each row execute function tocar_actualizado_en();

-- ============================================================
-- Seguridad: RLS activo y SIN políticas públicas.
-- Todo el acceso pasa por las API routes del servidor con la
-- service_role key. El navegador nunca habla con Supabase, así que
-- los datos de clientes (cédula, teléfono, dirección) no quedan
-- expuestos con una llave pública.
-- ============================================================
alter table pedidos enable row level security;

-- Con "Automatically expose new tables" desactivado (recomendado), la tabla
-- nace sin permisos para nadie: hay que dárselos explícitamente al rol que
-- usa el servidor. anon/authenticated siguen SIN acceso, que es lo buscado.
grant select, insert, update, delete on public.pedidos to service_role;
