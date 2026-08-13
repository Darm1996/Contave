-- ═══════════════════════════════════════════════════════════════════════
-- Biblia y Simulador de Contabilidad y Tributos de Venezuela
-- Migración 0001: esquema base
--
-- Cubre (según el prompt maestro):
--   §3  Parámetros fiscales/laborales versionados por vigencia
--       + series temporales (tipo de cambio BCV, INPC)
--   §4  Credenciales de portales cifradas (SENIAT, Alcaldía, IVSS, FAOV,
--       INCES, MINPPTRASS)
--   Módulo 1: empresas, diferenciación Contribuyente Ordinario vs. SPE,
--       calendario de obligaciones
--
-- Todo lo demás (asientos, facturas, nómina, etc.) se diseña en
-- iteraciones posteriores, módulo por módulo, tal como indica §1
-- ("Entregas incrementales").
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";
-- btree_gist permite el EXCLUDE constraint que evita vigencias solapadas
-- en parametros_fiscales (ver más abajo).
create extension if not exists "btree_gist";

-- ───────────────────────────────────────────────────────────────────────
-- PERFILES (extiende auth.users de Supabase)
-- ───────────────────────────────────────────────────────────────────────

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre_completo text not null,
  -- rol_global habilita funciones de plataforma (p.ej. editar el catálogo
  -- de parámetros fiscales compartido). No sustituye al rol por empresa,
  -- que vive en empresa_usuarios.
  rol_global text not null default 'CONTADOR'
    check (rol_global in ('SUPER_ADMIN', 'CONTADOR')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.perfiles is
  'Extiende auth.users con datos de perfil. rol_global solo habilita '
  'edición del catálogo de parámetros fiscales compartido, no acceso a '
  'empresas de otros usuarios (eso lo controla empresa_usuarios + RLS).';

-- ───────────────────────────────────────────────────────────────────────
-- EMPRESAS (contribuyentes/clientes de la firma)
-- ───────────────────────────────────────────────────────────────────────

create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  rif text not null unique,
  domicilio_fiscal text,
  actividad_economica text,
  -- Distinción central del Módulo 3: cambia el flujo de retenciones de
  -- IVA/ISLR, la periodicidad de declaración y el calendario de
  -- obligaciones aplicable.
  tipo_contribuyente text not null default 'ORDINARIO'
    check (tipo_contribuyente in ('ORDINARIO', 'ESPECIAL')),
  -- Solo aplica si tipo_contribuyente = 'ESPECIAL'. Es el dato que
  -- referencia la Providencia SENIAT de calificación como SPE.
  fecha_calificacion_especial date,
  numero_providencia_calificacion text,
  moneda_funcional text not null default 'VES',
  created_by uuid references public.perfiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_fecha_calificacion_solo_spe check (
    (tipo_contribuyente = 'ESPECIAL') or (fecha_calificacion_especial is null)
  )
);

comment on column public.empresas.tipo_contribuyente is
  'ORDINARIO u ESPECIAL (Sujeto Pasivo Especial). Determina qué filas de '
  'calendario_obligaciones y qué reglas de retención aplican.';

-- Membresía: qué usuarios pueden ver/editar cada empresa, y con qué rol.
create table public.empresa_usuarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  rol text not null default 'CONTADOR'
    check (rol in ('PROPIETARIO', 'CONTADOR', 'AUXILIAR', 'SOLO_LECTURA')),
  created_at timestamptz not null default now(),
  unique (empresa_id, usuario_id)
);

create index idx_empresa_usuarios_usuario on public.empresa_usuarios (usuario_id);

-- ───────────────────────────────────────────────────────────────────────
-- §3 · PARÁMETROS FISCALES/LABORALES VERSIONADOS POR VIGENCIA
--
-- Regla de oro: NINGÚN motor de cálculo lee un número "actual" fijo en
-- código. Siempre se busca el parámetro vigente a la fecha de la
-- operación:
--
--   select valor from parametros_fiscales
--   where codigo = 'UT'
--     and vigencia_desde <= :fecha_operacion
--     and (vigencia_hasta is null or vigencia_hasta >= :fecha_operacion)
--
-- Si no hay verificado = true para esa fecha, la UI debe mostrar
-- ⚠️ verificar en fuente oficial y bloquear (o marcar como borrador) el
-- resultado que dependa de ese parámetro.
-- ───────────────────────────────────────────────────────────────────────

create table public.parametros_fiscales (
  id uuid primary key default gen_random_uuid(),
  -- Código estable usado por el motor de cálculo, p.ej.:
  -- 'UT', 'IVA_ALICUOTA_GENERAL', 'IGTF_ALICUOTA', 'ISLR_RETENCION_75',
  -- 'SALARIO_MINIMO', 'CESTATICKET_VALOR', 'IVSS_PATRONAL_PORCENTAJE'.
  codigo text not null,
  nombre text not null,
  categoria text not null
    check (categoria in (
      'TRIBUTARIO_NACIONAL', 'TRIBUTARIO_MUNICIPAL', 'LABORAL',
      'PARAFISCAL', 'CONTABLE'
    )),
  valor numeric not null,
  unidad text not null, -- 'VES', 'USD', 'PORCENTAJE', 'UT', 'ADIMENSIONAL'
  -- Ámbito geográfico: null = nacional. Si es municipal, referencia el
  -- municipio/ordenanza (texto libre en esta iteración; se puede
  -- normalizar a tabla de municipios en una iteración posterior si el
  -- Módulo 4 lo requiere).
  ambito text not null default 'NACIONAL'
    check (ambito in ('NACIONAL', 'MUNICIPAL', 'ESTADAL')),
  municipio_u_ordenanza text,
  vigencia_desde date not null,
  vigencia_hasta date, -- null = vigente hasta que se cargue el siguiente valor
  fuente_oficial text not null, -- URL o referencia de la fuente
  gaceta_o_providencia text not null, -- p.ej. 'Gaceta Oficial N° 6.XXX' o 'Providencia SENIAT N° SNAT/...'
  -- Mientras verificado = false, el valor es un PLACEHOLDER y la UI debe
  -- marcarlo con ⚠️ verificar en fuente oficial. Ningún cálculo con
  -- verificado = false debe presentarse como definitivo.
  verificado boolean not null default false,
  notas text,
  created_by uuid references public.perfiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_vigencia_orden check (
    vigencia_hasta is null or vigencia_hasta >= vigencia_desde
  ),
  -- Evita que dos vigencias del mismo parámetro (mismo código+ámbito) se
  -- solapen en el tiempo. Requiere btree_gist (habilitado arriba).
  exclude using gist (
    codigo with =,
    ambito with =,
    coalesce(municipio_u_ordenanza, '') with =,
    daterange(vigencia_desde, coalesce(vigencia_hasta, 'infinity'::date), '[]') with &&
  )
);

create index idx_parametros_fiscales_codigo on public.parametros_fiscales (codigo, vigencia_desde);

comment on table public.parametros_fiscales is
  'Catálogo único de fuente de verdad para toda cifra legal usada por los '
  'motores de cálculo. Nunca hardcodear una alícuota/tarifa/UT en código.';

-- Series temporales de alta frecuencia (diaria/mensual) que no encajan en
-- el modelo de "vigencia hasta el próximo cambio": tipo de cambio BCV e
-- INPC. Necesarias para diferencial cambiario y ajuste por inflación
-- (Módulo 2), donde se requiere la serie completa, no solo el valor
-- vigente hoy.
create table public.series_temporales (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('TASA_CAMBIO_BCV_USD', 'INPC_MENSUAL')),
  fecha date not null,
  valor numeric not null,
  fuente_oficial text not null,
  verificado boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tipo, fecha)
);

create index idx_series_temporales_tipo_fecha on public.series_temporales (tipo, fecha desc);

-- ───────────────────────────────────────────────────────────────────────
-- CALENDARIO DE OBLIGACIONES
--
-- Se separa en (a) la definición de la obligación -catálogo compartido,
-- editable solo por SUPER_ADMIN- y (b) la instancia por empresa y
-- período, que sí es específica de cada cliente.
-- ───────────────────────────────────────────────────────────────────────

create table public.calendario_obligaciones_catalogo (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique, -- p.ej. 'IVA_DECLARACION_MENSUAL', 'ISLR_ANTICIPO_SPE_QUINCENAL'
  nombre text not null,
  ente text not null
    check (ente in ('SENIAT', 'ALCALDIA', 'IVSS', 'FAOV', 'INCES', 'MINPPTRASS')),
  -- A qué tipo de contribuyente aplica esta obligación.
  aplica_a text not null default 'AMBOS'
    check (aplica_a in ('ORDINARIO', 'ESPECIAL', 'AMBOS')),
  periodicidad text not null
    check (periodicidad in ('MENSUAL', 'QUINCENAL', 'ANUAL', 'TRIMESTRAL')),
  -- Descripción en texto de la regla de vencimiento oficial (p.ej. "según
  -- el último dígito del RIF, ver calendario SENIAT del ejercicio fiscal
  -- vigente"). La fecha exacta por empresa se calcula/registra en
  -- vencimientos_empresa, no aquí.
  regla_vencimiento_descripcion text not null,
  fuente_oficial text not null,
  created_at timestamptz not null default now()
);

create table public.vencimientos_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  obligacion_id uuid not null references public.calendario_obligaciones_catalogo (id),
  periodo text not null, -- p.ej. '2026-08', '2026-Q3', '2026'
  fecha_vencimiento date not null,
  estado text not null default 'PENDIENTE'
    check (estado in ('PENDIENTE', 'CUMPLIDO', 'VENCIDO')),
  created_at timestamptz not null default now(),
  unique (empresa_id, obligacion_id, periodo)
);

create index idx_vencimientos_empresa_fecha on public.vencimientos_empresa (empresa_id, fecha_vencimiento);

-- ───────────────────────────────────────────────────────────────────────
-- §4 · CREDENCIALES DE PORTALES — CIFRADAS
--
-- Esquema de cifrado propuesto: Supabase Vault (extensión pgsodium),
-- NO texto plano ni cifrado a nivel de aplicación con una clave en env.
-- Motivo: Vault gestiona la clave de cifrado maestra fuera del alcance de
-- Postgres/Prisma-equivalente, con rotación soportada, y la fila de esta
-- tabla nunca contiene el secreto en claro ni siquiera para el rol
-- `service_role` fuera de las funciones `vault.*`.
--
-- Flujo:
--   1. Al guardar una credencial, el backend llama a
--      `select vault.create_secret(:password, :nombre_descriptivo)`
--      que devuelve un `id` (uuid).
--   2. Ese `id` se guarda en `secreto_vault_id` — la tabla NUNCA guarda el
--      password en una columna propia.
--   3. Para leer el secreto (solo el dueño autorizado, y solo en un
--      contexto server-side controlado), se hace
--      `select decrypted_secret from vault.decrypted_secrets
--       where id = :secreto_vault_id`.
--
-- RLS: esta tabla es visible/editable solo por usuarios con rol
-- PROPIETARIO o CONTADOR en `empresa_usuarios` para esa empresa (ver
-- políticas más abajo). AUXILIAR y SOLO_LECTURA no tienen acceso, ni
-- siquiera para ver qué portales tienen credencial guardada.
-- ───────────────────────────────────────────────────────────────────────

create table public.credenciales_portales (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  portal text not null
    check (portal in ('SENIAT', 'ALCALDIA', 'IVSS', 'FAOV', 'INCES', 'MINPPTRASS')),
  usuario_portal text not null,
  -- Referencia al secreto en Supabase Vault (pgsodium). Ver nota arriba:
  -- el valor cifrado NUNCA vive directamente en esta tabla.
  secreto_vault_id uuid not null,
  notas text,
  created_by uuid not null references public.perfiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_accessed_at timestamptz,
  unique (empresa_id, portal)
);

comment on table public.credenciales_portales is
  'Solo guarda la referencia (secreto_vault_id) al secreto cifrado en '
  'Supabase Vault. Nunca se persiste la contraseña del portal en esta '
  'tabla ni en texto plano en ningún lugar de la base de datos.';

-- ───────────────────────────────────────────────────────────────────────
-- CONTENIDO NORMATIVO (base de conocimiento, capa 1 de la arquitectura §3)
-- ───────────────────────────────────────────────────────────────────────

create table public.contenido_normativo (
  id uuid primary key default gen_random_uuid(),
  modulo text not null, -- 'SETUP_CORPORATIVO','MULTIMONEDA','SENIAT','MUNICIPAL','NOMINA','ESTADOS_FINANCIEROS','AUDITORIA'
  slug text not null unique,
  titulo text not null,
  cuerpo_markdown text not null,
  fuente_oficial text,
  gaceta_o_providencia text,
  vigente_desde date,
  vigente_hasta date,
  verificado boolean not null default false,
  created_by uuid references public.perfiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_contenido_normativo_modulo on public.contenido_normativo (modulo);

-- ───────────────────────────────────────────────────────────────────────
-- AUDITORÍA DE CAMBIOS A PARÁMETROS (trazabilidad, §1)
-- ───────────────────────────────────────────────────────────────────────

create table public.auditoria_parametros (
  id uuid primary key default gen_random_uuid(),
  parametro_id uuid not null references public.parametros_fiscales (id) on delete cascade,
  accion text not null check (accion in ('CREADO', 'MODIFICADO', 'VERIFICADO')),
  valor_anterior numeric,
  valor_nuevo numeric,
  usuario_id uuid references public.perfiles (id),
  created_at timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────────────────

alter table public.perfiles enable row level security;
alter table public.empresas enable row level security;
alter table public.empresa_usuarios enable row level security;
alter table public.parametros_fiscales enable row level security;
alter table public.series_temporales enable row level security;
alter table public.calendario_obligaciones_catalogo enable row level security;
alter table public.vencimientos_empresa enable row level security;
alter table public.credenciales_portales enable row level security;
alter table public.contenido_normativo enable row level security;
alter table public.auditoria_parametros enable row level security;

-- perfiles: cada quien ve y edita solo su propio perfil.
create policy perfiles_select_propio on public.perfiles
  for select using (id = auth.uid());
create policy perfiles_update_propio on public.perfiles
  for update using (id = auth.uid());

-- empresas: visible solo si el usuario tiene membresía en empresa_usuarios.
create policy empresas_select_miembros on public.empresas
  for select using (
    exists (
      select 1 from public.empresa_usuarios eu
      where eu.empresa_id = empresas.id and eu.usuario_id = auth.uid()
    )
  );
create policy empresas_insert_autenticado on public.empresas
  for insert with check (created_by = auth.uid());
create policy empresas_update_propietario on public.empresas
  for update using (
    exists (
      select 1 from public.empresa_usuarios eu
      where eu.empresa_id = empresas.id and eu.usuario_id = auth.uid()
        and eu.rol = 'PROPIETARIO'
    )
  );

-- empresa_usuarios: un miembro ve la lista de miembros de sus propias empresas.
create policy empresa_usuarios_select_miembros on public.empresa_usuarios
  for select using (
    exists (
      select 1 from public.empresa_usuarios eu2
      where eu2.empresa_id = empresa_usuarios.empresa_id and eu2.usuario_id = auth.uid()
    )
  );
create policy empresa_usuarios_insert_propietario on public.empresa_usuarios
  for insert with check (
    exists (
      select 1 from public.empresa_usuarios eu2
      where eu2.empresa_id = empresa_usuarios.empresa_id and eu2.usuario_id = auth.uid()
        and eu2.rol = 'PROPIETARIO'
    )
  );

-- parametros_fiscales / series_temporales / calendario_obligaciones_catalogo /
-- contenido_normativo: catálogo compartido, lectura para cualquier
-- usuario autenticado; escritura solo SUPER_ADMIN.
create policy parametros_fiscales_select_autenticado on public.parametros_fiscales
  for select using (auth.role() = 'authenticated');
create policy parametros_fiscales_write_super_admin on public.parametros_fiscales
  for all using (
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol_global = 'SUPER_ADMIN')
  );

create policy series_temporales_select_autenticado on public.series_temporales
  for select using (auth.role() = 'authenticated');
create policy series_temporales_write_super_admin on public.series_temporales
  for all using (
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol_global = 'SUPER_ADMIN')
  );

create policy calendario_catalogo_select_autenticado on public.calendario_obligaciones_catalogo
  for select using (auth.role() = 'authenticated');
create policy calendario_catalogo_write_super_admin on public.calendario_obligaciones_catalogo
  for all using (
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol_global = 'SUPER_ADMIN')
  );

create policy contenido_normativo_select_autenticado on public.contenido_normativo
  for select using (auth.role() = 'authenticated');
create policy contenido_normativo_write_super_admin on public.contenido_normativo
  for all using (
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol_global = 'SUPER_ADMIN')
  );

-- vencimientos_empresa: específico de cada empresa, visible a sus miembros.
create policy vencimientos_empresa_select_miembros on public.vencimientos_empresa
  for select using (
    exists (
      select 1 from public.empresa_usuarios eu
      where eu.empresa_id = vencimientos_empresa.empresa_id and eu.usuario_id = auth.uid()
    )
  );
create policy vencimientos_empresa_write_miembros on public.vencimientos_empresa
  for all using (
    exists (
      select 1 from public.empresa_usuarios eu
      where eu.empresa_id = vencimientos_empresa.empresa_id and eu.usuario_id = auth.uid()
        and eu.rol in ('PROPIETARIO', 'CONTADOR')
    )
  );

-- credenciales_portales: solo PROPIETARIO/CONTADOR de la empresa (ver
-- nota de §4: AUXILIAR y SOLO_LECTURA no tienen ningún acceso).
create policy credenciales_portales_acceso on public.credenciales_portales
  for all using (
    exists (
      select 1 from public.empresa_usuarios eu
      where eu.empresa_id = credenciales_portales.empresa_id and eu.usuario_id = auth.uid()
        and eu.rol in ('PROPIETARIO', 'CONTADOR')
    )
  );

-- auditoria_parametros: solo lectura para SUPER_ADMIN (integridad del log).
create policy auditoria_parametros_select_super_admin on public.auditoria_parametros
  for select using (
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol_global = 'SUPER_ADMIN')
  );

-- ───────────────────────────────────────────────────────────────────────
-- TRIGGER: crear fila en perfiles automáticamente al registrarse
-- ───────────────────────────────────────────────────────────────────────

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
