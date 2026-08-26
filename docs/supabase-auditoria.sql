-- ============================================================
-- Tapete Vital / PAT — registro de actividad del panel
-- Pegar en Supabase → SQL Editor → Run
--
-- Deja rastro de quién hizo qué: sirve para investigar cuando algo
-- no cuadra ("¿quién descartó este pedido?", "¿quién cambió esta
-- dirección?").
-- ============================================================

create table auditoria (
  id         bigserial primary key,
  usuario    text not null,
  accion     text not null,   -- estado | editar | crear_pedido | usuario_crear | ...
  objetivo   text,            -- la orden o el usuario afectado
  detalle    jsonb,           -- qué cambió exactamente
  creado_en  timestamptz not null default now()
);

-- Se consulta casi siempre por fecha reciente, y a veces por pedido
create index auditoria_fecha_idx    on auditoria (creado_en desc);
create index auditoria_objetivo_idx on auditoria (objetivo);

alter table auditoria enable row level security;

-- Solo el servidor escribe y lee este registro
grant select, insert on public.auditoria to service_role;
grant usage, select on sequence auditoria_id_seq to service_role;
