-- ═══════════════════════════════════════════════════════════════════════
-- Migración 0002: Módulo 2 — Multimoneda y Ajuste por Inflación
--
--   Contabilidad bimonetaria (NIC 21): partidas en moneda extranjera,
--   diferencial cambiario realizado y no realizado.
--   Ajuste por Inflación Financiero (BA VEN-NIF 2 / NIC 29): reexpresión
--   de partidas no monetarias, REPOMAN (resultado por posición
--   monetaria neta).
--
-- Depende de 0001_init.sql: empresas, empresa_usuarios, series_temporales
-- (aquí se usa como fuente de tasa BCV e INPC).
--
-- Nota de alcance: `cuentas_contables` aquí es una versión mínima del
-- plan de cuentas —solo lo que Módulo 2 necesita para saber si una
-- cuenta es monetaria/no monetaria y en qué moneda se lleva—. El plan de
-- cuentas completo (jerarquía VEN-NIF, tipos de estado financiero, etc.)
-- se diseña en el Módulo 6.
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- PLAN DE CUENTAS (versión mínima para Módulo 2)
-- ───────────────────────────────────────────────────────────────────────

create table public.cuentas_contables (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  codigo text not null,
  nombre text not null,
  naturaleza text not null check (naturaleza in ('DEUDORA', 'ACREEDORA')),
  -- Distinción central de NIC 29 / BA VEN-NIF 2: las partidas monetarias
  -- (efectivo, CxC, CxP, impuestos por pagar) NO se reexpresan por INPC
  -- —ya están expresadas en unidades monetarias de cierre— pero sí
  -- generan REPOMAN por la exposición a la inflación de mantenerlas.
  -- Las partidas no monetarias (inventario, activo fijo, capital) se
  -- reexpresan por INPC pero no entran en el cálculo de REPOMAN.
  clasificacion_monetaria text not null
    check (clasificacion_monetaria in ('MONETARIA', 'NO_MONETARIA')),
  -- Moneda en la que se lleva el saldo de esta cuenta. VES = moneda
  -- funcional; USD/OTRA = cuenta bimonetaria sujeta a diferencial
  -- cambiario (NIC 21).
  moneda text not null default 'VES' check (moneda in ('VES', 'USD', 'OTRA')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, codigo),
  -- Una cuenta en USD/OTRA por definición representa un derecho u
  -- obligación de cobrar/pagar una suma fija de dinero: es monetaria.
  constraint chk_moneda_extranjera_es_monetaria check (
    moneda = 'VES' or clasificacion_monetaria = 'MONETARIA'
  )
);

-- ───────────────────────────────────────────────────────────────────────
-- PARTIDAS EN MONEDA EXTRANJERA (NIC 21)
--
-- Una partida = un derecho de cobro o una obligación de pago
-- denominados en moneda extranjera, reconocidos a la tasa histórica del
-- día de la operación. Se liquida total o parcialmente con el tiempo
-- (tabla de liquidaciones) y, mientras esté abierta, se reexpresa a
-- cada cierre (tabla de cierres) generando diferencial no realizado que
-- se revierte en el siguiente cierre.
-- ───────────────────────────────────────────────────────────────────────

create table public.partidas_moneda_extranjera (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  cuenta_id uuid not null references public.cuentas_contables (id),
  descripcion text not null,
  -- ACTIVO (p.ej. cuenta por cobrar en USD) o PASIVO (cuenta por pagar
  -- en USD): determina el signo del diferencial cambiario — una
  -- depreciación del bolívar es ganancia para un activo en divisas y
  -- pérdida para un pasivo en divisas, y viceversa.
  naturaleza_partida text not null check (naturaleza_partida in ('ACTIVO', 'PASIVO')),
  moneda text not null default 'USD' check (moneda in ('USD', 'OTRA')),
  monto_divisa numeric not null check (monto_divisa > 0),
  fecha_origen date not null,
  -- Tasa BCV del día de origen. Se guarda el valor usado (snapshot) para
  -- que el asiento quede trazable aunque la fila de series_temporales se
  -- corrija después; referencia además la fila de origen para auditoría.
  tasa_origen numeric not null check (tasa_origen > 0),
  tasa_origen_serie_id uuid references public.series_temporales (id),
  monto_ves_historico numeric not null, -- monto_divisa * tasa_origen
  monto_divisa_pendiente numeric not null, -- decrece con cada liquidación parcial
  estado text not null default 'ABIERTA' check (estado in ('ABIERTA', 'LIQUIDADA')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_pendiente_no_excede check (monto_divisa_pendiente <= monto_divisa),
  constraint chk_pendiente_no_negativo check (monto_divisa_pendiente >= 0)
);

create index idx_partidas_me_empresa_estado on public.partidas_moneda_extranjera (empresa_id, estado);

-- Liquidación (total o parcial) de una partida: aquí se realiza el
-- diferencial cambiario, que deja de ser una estimación de cierre y pasa
-- a resultado del ejercicio de forma definitiva (NIC 21.28).
create table public.liquidaciones_partida_extranjera (
  id uuid primary key default gen_random_uuid(),
  partida_id uuid not null references public.partidas_moneda_extranjera (id) on delete cascade,
  fecha_liquidacion date not null,
  monto_divisa_liquidado numeric not null check (monto_divisa_liquidado > 0),
  tasa_liquidacion numeric not null check (tasa_liquidacion > 0),
  tasa_liquidacion_serie_id uuid references public.series_temporales (id),
  monto_ves_liquidado numeric not null, -- monto_divisa_liquidado * tasa_liquidacion
  -- Porción del monto_ves_historico de la partida que corresponde a la
  -- fracción liquidada (monto_divisa_liquidado / monto_divisa original).
  monto_ves_historico_proporcional numeric not null,
  diferencial_cambiario numeric not null, -- con signo: + ganancia, - pérdida
  tipo_diferencial text not null check (tipo_diferencial in ('GANANCIA', 'PERDIDA', 'NEUTRO')),
  -- Traza completa del cálculo (fórmula, insumos, parámetros con su
  -- vigencia y fuente): requisito de §1, para que un contador pueda
  -- auditar cómo se llegó al número sin adivinar.
  traza jsonb not null,
  created_at timestamptz not null default now()
);

create index idx_liquidaciones_me_partida on public.liquidaciones_partida_extranjera (partida_id);

-- Reexpresión de cierre para partidas que siguen abiertas (diferencial
-- NO realizado). Un registro por partida y período; el siguiente cierre
-- (o la liquidación) reemplaza/revierte este valor, nunca se acumula.
create table public.cierres_diferencial_no_realizado (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  partida_id uuid not null references public.partidas_moneda_extranjera (id) on delete cascade,
  periodo text not null, -- 'AAAA-MM'
  fecha_cierre date not null,
  tasa_cierre numeric not null check (tasa_cierre > 0),
  tasa_cierre_serie_id uuid references public.series_temporales (id),
  monto_ves_cierre numeric not null, -- monto_divisa_pendiente * tasa_cierre
  monto_ves_historico_pendiente numeric not null,
  diferencial_no_realizado numeric not null,
  tipo_diferencial text not null check (tipo_diferencial in ('GANANCIA', 'PERDIDA', 'NEUTRO')),
  traza jsonb not null,
  created_at timestamptz not null default now(),
  unique (partida_id, periodo)
);

create index idx_cierres_dnr_empresa_periodo on public.cierres_diferencial_no_realizado (empresa_id, periodo);

-- ───────────────────────────────────────────────────────────────────────
-- AJUSTE POR INFLACIÓN (BA VEN-NIF 2 / NIC 29, método de nivel general
-- de precios usando el INPC del BCV)
-- ───────────────────────────────────────────────────────────────────────

-- Partidas no monetarias sujetas a reexpresión: inventario, activo fijo,
-- capital social, etc. fecha_origen ancla el INPC de referencia (fecha
-- de adquisición/aporte).
create table public.partidas_no_monetarias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  cuenta_id uuid not null references public.cuentas_contables (id),
  descripcion text not null,
  valor_historico numeric not null check (valor_historico > 0),
  fecha_origen date not null,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_partidas_nm_empresa_activa on public.partidas_no_monetarias (empresa_id, activa);

-- Cabecera del ajuste por inflación de un período: guarda el factor de
-- reexpresión general y el resultado consolidado (REPOMAN + reexpresión
-- de no monetarias = resultado por exposición a la inflación).
create table public.ajustes_inflacion_periodo (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  periodo text not null, -- 'AAAA-MM' o 'AAAA' según periodicidad de reexpresión
  fecha_inicio date not null,
  fecha_cierre date not null,
  inpc_inicial numeric not null check (inpc_inicial > 0),
  inpc_inicial_serie_id uuid references public.series_temporales (id),
  inpc_final numeric not null check (inpc_final > 0),
  inpc_final_serie_id uuid references public.series_temporales (id),
  factor_reexpresion numeric not null, -- inpc_final / inpc_inicial
  total_reexpresado_no_monetarias numeric not null default 0,
  resultado_repoman numeric not null default 0, -- + ganancia monetaria, - pérdida monetaria
  estado text not null default 'BORRADOR' check (estado in ('BORRADOR', 'DEFINITIVO')),
  traza jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, periodo)
);

create table public.ajustes_inflacion_detalle (
  id uuid primary key default gen_random_uuid(),
  ajuste_id uuid not null references public.ajustes_inflacion_periodo (id) on delete cascade,
  partida_id uuid not null references public.partidas_no_monetarias (id),
  inpc_origen numeric not null,
  valor_historico numeric not null,
  valor_reexpresado numeric not null,
  ajuste_por_inflacion numeric not null, -- valor_reexpresado - valor_historico
  created_at timestamptz not null default now()
);

create index idx_ajustes_inflacion_detalle_ajuste on public.ajustes_inflacion_detalle (ajuste_id);

-- ───────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (mismo patrón que 0001: visible/editable a los
-- miembros de la empresa correspondiente).
-- ───────────────────────────────────────────────────────────────────────

alter table public.cuentas_contables enable row level security;
alter table public.partidas_moneda_extranjera enable row level security;
alter table public.liquidaciones_partida_extranjera enable row level security;
alter table public.cierres_diferencial_no_realizado enable row level security;
alter table public.partidas_no_monetarias enable row level security;
alter table public.ajustes_inflacion_periodo enable row level security;
alter table public.ajustes_inflacion_detalle enable row level security;

create policy cuentas_contables_miembros on public.cuentas_contables
  for all using (
    exists (
      select 1 from public.empresa_usuarios eu
      where eu.empresa_id = cuentas_contables.empresa_id and eu.usuario_id = auth.uid()
    )
  );

create policy partidas_me_miembros on public.partidas_moneda_extranjera
  for all using (
    exists (
      select 1 from public.empresa_usuarios eu
      where eu.empresa_id = partidas_moneda_extranjera.empresa_id and eu.usuario_id = auth.uid()
    )
  );

create policy liquidaciones_me_miembros on public.liquidaciones_partida_extranjera
  for all using (
    exists (
      select 1 from public.partidas_moneda_extranjera pme
      join public.empresa_usuarios eu on eu.empresa_id = pme.empresa_id
      where pme.id = liquidaciones_partida_extranjera.partida_id and eu.usuario_id = auth.uid()
    )
  );

create policy cierres_dnr_miembros on public.cierres_diferencial_no_realizado
  for all using (
    exists (
      select 1 from public.empresa_usuarios eu
      where eu.empresa_id = cierres_diferencial_no_realizado.empresa_id and eu.usuario_id = auth.uid()
    )
  );

create policy partidas_nm_miembros on public.partidas_no_monetarias
  for all using (
    exists (
      select 1 from public.empresa_usuarios eu
      where eu.empresa_id = partidas_no_monetarias.empresa_id and eu.usuario_id = auth.uid()
    )
  );

create policy ajustes_inflacion_periodo_miembros on public.ajustes_inflacion_periodo
  for all using (
    exists (
      select 1 from public.empresa_usuarios eu
      where eu.empresa_id = ajustes_inflacion_periodo.empresa_id and eu.usuario_id = auth.uid()
    )
  );

create policy ajustes_inflacion_detalle_miembros on public.ajustes_inflacion_detalle
  for all using (
    exists (
      select 1 from public.ajustes_inflacion_periodo aip
      join public.empresa_usuarios eu on eu.empresa_id = aip.empresa_id
      where aip.id = ajustes_inflacion_detalle.ajuste_id and eu.usuario_id = auth.uid()
    )
  );
