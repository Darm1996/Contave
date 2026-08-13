-- ═══════════════════════════════════════════════════════════════════════
-- Academia Contable VE — esquema inicial
--
-- Cubre: perfiles, contenido (módulos/lecciones/preguntas/flashcards
-- como catálogo compartido de solo lectura para el usuario), y progreso
-- por usuario (resultados de quiz + estado de repetición espaciada por
-- flashcard). Espeja exactamente la forma de
-- src/lib/aprendizaje/progreso-local.ts — migrar de localStorage a
-- Supabase debería ser un cambio mecánico de dónde se lee/escribe, no
-- de qué se guarda.
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre_completo text,
  created_at timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────────
-- CONTENIDO (catálogo compartido — mismo patrón que parametros_fiscales
-- en biblia-tributaria-ve: lectura para cualquier autenticado, escritura
-- solo para quien mantiene el contenido).
-- ───────────────────────────────────────────────────────────────────────

create table public.modulos (
  id text primary key, -- slug legible, p.ej. 'fundamentos'
  numero integer not null unique,
  nombre text not null,
  descripcion text not null
);

create table public.lecciones (
  id text primary key, -- slug legible, p.ej. 'fundamentos-partida-doble'
  modulo_id text not null references public.modulos (id) on delete cascade,
  orden integer not null default 0,
  titulo text not null,
  contenido_markdown text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_lecciones_modulo on public.lecciones (modulo_id, orden);

create table public.preguntas (
  id text primary key,
  leccion_id text not null references public.lecciones (id) on delete cascade,
  orden integer not null default 0,
  enunciado text not null,
  -- Opciones como jsonb: [{ id, texto }, ...]. Se mantiene simple en
  -- vez de una tabla aparte porque nunca se consultan sin su pregunta.
  opciones jsonb not null,
  opcion_correcta_id text not null,
  explicacion text not null
);

create index idx_preguntas_leccion on public.preguntas (leccion_id, orden);

create table public.flashcards (
  id text primary key,
  modulo_id text not null references public.modulos (id) on delete cascade,
  pregunta text not null,
  respuesta text not null
);

create index idx_flashcards_modulo on public.flashcards (modulo_id);

-- ───────────────────────────────────────────────────────────────────────
-- PROGRESO POR USUARIO
-- ───────────────────────────────────────────────────────────────────────

create table public.progreso_lecciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  leccion_id text not null references public.lecciones (id) on delete cascade,
  aprobado boolean not null default false,
  mejor_porcentaje integer not null default 0 check (mejor_porcentaje between 0 and 100),
  ultima_vez timestamptz not null default now(),
  unique (usuario_id, leccion_id)
);

-- Estado SM-2 de repetición espaciada por flashcard y usuario — mismos
-- campos que EstadoTarjeta en repeticion-espaciada.ts.
create table public.progreso_flashcards (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  flashcard_id text not null references public.flashcards (id) on delete cascade,
  repeticiones integer not null default 0,
  facilidad numeric not null default 2.5,
  intervalo_dias integer not null default 0,
  proxima_fecha_revision date,
  updated_at timestamptz not null default now(),
  unique (usuario_id, flashcard_id)
);

create index idx_progreso_flashcards_pendientes on public.progreso_flashcards (usuario_id, proxima_fecha_revision);

-- ───────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────────────────

alter table public.perfiles enable row level security;
alter table public.modulos enable row level security;
alter table public.lecciones enable row level security;
alter table public.preguntas enable row level security;
alter table public.flashcards enable row level security;
alter table public.progreso_lecciones enable row level security;
alter table public.progreso_flashcards enable row level security;

create policy perfiles_propio on public.perfiles
  for all using (id = auth.uid());

create policy modulos_select_autenticado on public.modulos
  for select using (auth.role() = 'authenticated');
create policy lecciones_select_autenticado on public.lecciones
  for select using (auth.role() = 'authenticated');
create policy preguntas_select_autenticado on public.preguntas
  for select using (auth.role() = 'authenticated');
create policy flashcards_select_autenticado on public.flashcards
  for select using (auth.role() = 'authenticated');

create policy progreso_lecciones_propio on public.progreso_lecciones
  for all using (usuario_id = auth.uid());
create policy progreso_flashcards_propio on public.progreso_flashcards
  for all using (usuario_id = auth.uid());

create function public.manejar_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre_completo)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre_completo', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.manejar_nuevo_usuario();
