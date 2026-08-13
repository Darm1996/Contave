-- ═══════════════════════════════════════════════════════════════════════
-- Migración 0004: Módulo 3 — Ecosistema Tributario Nacional (SENIAT) ·
-- ISLR e IGTF (cierra el Módulo 3, junto con 0003_modulo3_iva.sql)
--
-- ISLR: tarifas 1/2/3 (tabla de tramos progresivos, no valores sueltos),
-- retenciones (Decreto 1808), conciliación fiscal, declaración estimada
-- y definitiva, rebajas por nuevas inversiones.
-- IGTF: operaciones sujetas (divisas/cripto, o efectivo de un SPE),
-- declaración quincenal.
--
-- Depende de 0001_init.sql (empresas, tipo_contribuyente).
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- ISLR · TARIFAS PROGRESIVAS (1, 2 y 3)
--
-- Cada tarifa es una tabla de tramos en Unidades Tributarias, no un
-- valor único — por eso es una tabla propia y no una fila de
-- parametros_fiscales. El motor de cálculo (calcularISLRTarifaProgresiva)
-- es genérico: recibe los tramos vigentes a la fecha del ejercicio como
-- argumento, nunca los tiene hardcodeados.
-- ───────────────────────────────────────────────────────────────────────

create table public.tramos_islr (
  id uuid primary key default gen_random_uuid(),
  tarifa integer not null check (tarifa in (1, 2, 3)),
  numero_tramo integer not null check (numero_tramo > 0),
  limite_inferior_ut numeric not null check (limite_inferior_ut >= 0),
  limite_superior_ut numeric, -- null = sin límite superior (el último tramo)
  porcentaje numeric not null check (porcentaje >= 0 and porcentaje <= 100),
  sustraendo_ut numeric not null default 0,
  vigencia_desde date not null,
  vigencia_hasta date,
  fuente_oficial text not null,
  verificado boolean not null default false,
  created_at timestamptz not null default now(),
  constraint chk_tramos_islr_limites check (
    limite_superior_ut is null or limite_superior_ut > limite_inferior_ut
  ),
  unique (tarifa, numero_tramo, vigencia_desde)
);

create index idx_tramos_islr_tarifa_vigencia on public.tramos_islr (tarifa, vigencia_desde);

-- ───────────────────────────────────────────────────────────────────────
-- ISLR · RETENCIONES (Decreto 1808)
--
-- El Decreto 1808 tiene decenas de conceptos, cada uno con su propio
-- porcentaje y sustraendo (para personas naturales residentes). Esa
-- tabla de conceptos vive en parametros_fiscales (categoria
-- TRIBUTARIO_NACIONAL, codigo con prefijo ISLR_RETENCION_) — aquí solo
-- se registra el hecho de la retención practicada, referenciando qué
-- parámetro se usó.
-- ───────────────────────────────────────────────────────────────────────

create table public.retenciones_islr (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  concepto text not null, -- descripción libre del concepto (p.ej. "Honorarios profesionales")
  parametro_id uuid references public.parametros_fiscales (id), -- de dónde salió el % y el sustraendo
  rif_beneficiario text not null,
  nombre_beneficiario text not null,
  beneficiario_persona_natural boolean not null default false,
  domiciliado boolean not null default true,
  fecha_pago date not null,
  monto_sujeto_a_retencion numeric not null check (monto_sujeto_a_retencion >= 0),
  porcentaje_retencion numeric not null check (porcentaje_retencion >= 0 and porcentaje_retencion <= 100),
  -- Sustraendo en UT, solo aplica cuando beneficiario_persona_natural y
  -- domiciliado. Se convierte a VES con el valor de la UT vigente a
  -- fecha_pago (referencia, no valor hardcodeado).
  sustraendo_ut numeric not null default 0,
  valor_ut_aplicado numeric, -- snapshot del valor de la UT usado para convertir el sustraendo
  valor_ut_parametro_id uuid references public.parametros_fiscales (id),
  monto_retenido numeric not null default 0,
  numero_comprobante text,
  periodo text not null, -- 'AAAA-MM', para el resumen de retenciones del período
  traza jsonb not null,
  created_at timestamptz not null default now()
);

create index idx_retenciones_islr_empresa_periodo on public.retenciones_islr (empresa_id, periodo);

-- ───────────────────────────────────────────────────────────────────────
-- ISLR · CONCILIACIÓN FISCAL Y DECLARACIONES (estimada / definitiva)
-- ───────────────────────────────────────────────────────────────────────

create table public.conciliaciones_fiscales_islr (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  ejercicio_fiscal integer not null, -- año
  utilidad_contable_antes_islr numeric not null,
  total_partidas_no_deducibles numeric not null default 0, -- suman a la renta gravable
  total_partidas_no_gravables numeric not null default 0, -- restan de la renta gravable
  enriquecimiento_neto_fiscal numeric not null,
  traza jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, ejercicio_fiscal)
);

create table public.declaraciones_islr (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  ejercicio_fiscal integer not null,
  tipo text not null check (tipo in ('ESTIMADA', 'DEFINITIVA')),
  -- Para DEFINITIVA: viene de conciliaciones_fiscales_islr.
  -- Para ESTIMADA: es la base sobre la que se calcula el anticipo
  -- (normalmente el enriquecimiento neto gravable del ejercicio anterior).
  base_calculo numeric not null,
  tarifa_aplicada integer not null check (tarifa_aplicada in (1, 2, 3)),
  impuesto_determinado numeric not null default 0,
  rebajas_por_inversiones numeric not null default 0,
  retenciones_soportadas_periodo numeric not null default 0,
  impuesto_a_pagar numeric not null default 0,
  estado text not null default 'BORRADOR' check (estado in ('BORRADOR', 'DEFINITIVA')),
  traza jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, ejercicio_fiscal, tipo)
);

-- ───────────────────────────────────────────────────────────────────────
-- IGTF
-- ───────────────────────────────────────────────────────────────────────

create table public.operaciones_igtf (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  fecha date not null,
  descripcion text,
  monto_operacion numeric not null check (monto_operacion >= 0),
  -- Los dos hechos que activan el IGTF (ver motor igtf.ts para la regla
  -- completa): pago en divisas/criptoactivo (cualquier contribuyente), o
  -- pago en efectivo/moneda nacional por un Sujeto Pasivo Especial.
  pago_en_divisas_o_cripto boolean not null default false,
  pago_en_efectivo_nacional boolean not null default false,
  sujeta_a_igtf boolean not null,
  alicuota_aplicada numeric,
  alicuota_parametro_id uuid references public.parametros_fiscales (id),
  monto_igtf numeric not null default 0,
  periodo_quincena text not null, -- 'AAAA-MM-Q1' o 'AAAA-MM-Q2'
  traza jsonb not null,
  created_at timestamptz not null default now()
);

create index idx_operaciones_igtf_empresa_periodo on public.operaciones_igtf (empresa_id, periodo_quincena);

create table public.declaraciones_igtf_quincenales (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  periodo text not null, -- 'AAAA-MM-Q1' o 'AAAA-MM-Q2'
  fecha_inicio date not null,
  fecha_fin date not null,
  total_igtf numeric not null default 0,
  estado text not null default 'BORRADOR' check (estado in ('BORRADOR', 'DEFINITIVA')),
  traza jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, periodo)
);

-- ───────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────────────────

alter table public.tramos_islr enable row level security;
alter table public.retenciones_islr enable row level security;
alter table public.conciliaciones_fiscales_islr enable row level security;
alter table public.declaraciones_islr enable row level security;
alter table public.operaciones_igtf enable row level security;
alter table public.declaraciones_igtf_quincenales enable row level security;

-- tramos_islr es catálogo compartido (como parametros_fiscales): lectura
-- para cualquier autenticado, escritura solo SUPER_ADMIN.
create policy tramos_islr_select_autenticado on public.tramos_islr
  for select using (auth.role() = 'authenticated');
create policy tramos_islr_write_super_admin on public.tramos_islr
  for all using (
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol_global = 'SUPER_ADMIN')
  );

create policy retenciones_islr_miembros on public.retenciones_islr
  for all using (
    exists (
      select 1 from public.empresa_usuarios eu
      where eu.empresa_id = retenciones_islr.empresa_id and eu.usuario_id = auth.uid()
    )
  );

create policy conciliaciones_fiscales_islr_miembros on public.conciliaciones_fiscales_islr
  for all using (
    exists (
      select 1 from public.empresa_usuarios eu
      where eu.empresa_id = conciliaciones_fiscales_islr.empresa_id and eu.usuario_id = auth.uid()
    )
  );

create policy declaraciones_islr_miembros on public.declaraciones_islr
  for all using (
    exists (
      select 1 from public.empresa_usuarios eu
      where eu.empresa_id = declaraciones_islr.empresa_id and eu.usuario_id = auth.uid()
    )
  );

create policy operaciones_igtf_miembros on public.operaciones_igtf
  for all using (
    exists (
      select 1 from public.empresa_usuarios eu
      where eu.empresa_id = operaciones_igtf.empresa_id and eu.usuario_id = auth.uid()
    )
  );

create policy declaraciones_igtf_quincenales_miembros on public.declaraciones_igtf_quincenales
  for all using (
    exists (
      select 1 from public.empresa_usuarios eu
      where eu.empresa_id = declaraciones_igtf_quincenales.empresa_id and eu.usuario_id = auth.uid()
    )
  );
