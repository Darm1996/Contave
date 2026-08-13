-- ═══════════════════════════════════════════════════════════════════════
-- Migración 0003: Módulo 3 — Ecosistema Tributario Nacional (SENIAT) · IVA
--
-- Cubre la porción de IVA del Módulo 3: libros de compra/venta,
-- prorrateo de crédito fiscal, retenciones (75%/100%), retención
-- quincenal (Contribuyente Especial), declaración mensual definitiva,
-- exentas/exoneradas.
--
-- ISLR e IGTF quedan para una migración posterior (0004+), siguiendo la
-- misma disciplina de entregas incrementales de §1.
--
-- Depende de 0001_init.sql (empresas, tipo_contribuyente,
-- parametros_fiscales) y 0002 (cuentas_contables).
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- LIBRO DE COMPRAS / LIBRO DE VENTAS
--
-- Una fila = un documento fiscal (factura, nota de crédito o nota de
-- débito) que entra al libro de compras o de ventas del período. El
-- "libro" en sí (el reporte que exige el SENIAT) se genera a partir de
-- estas filas filtradas por empresa_id + periodo + tipo — no hace falta
-- una tabla separada para el libro.
-- ───────────────────────────────────────────────────────────────────────

create table public.documentos_iva (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  tipo text not null check (tipo in (
    'COMPRA', 'VENTA', 'NOTA_CREDITO_COMPRA', 'NOTA_CREDITO_VENTA',
    'NOTA_DEBITO_COMPRA', 'NOTA_DEBITO_VENTA'
  )),
  rif_contraparte text not null,
  nombre_contraparte text not null,
  numero_factura text,
  numero_control text,
  fecha_emision date not null,
  -- Período del libro al que pertenece (no siempre coincide con
  -- fecha_emision — una factura de fin de mes puede registrarse en el
  -- período siguiente si llega tarde; el contador decide el período).
  periodo text not null, -- 'AAAA-MM'

  base_imponible_gravada numeric not null default 0 check (base_imponible_gravada >= 0),
  monto_exento numeric not null default 0 check (monto_exento >= 0),
  monto_exonerado numeric not null default 0 check (monto_exonerado >= 0),

  -- Snapshot del parámetro usado (nunca hardcodeado) — ver §3.
  alicuota_aplicada numeric not null check (alicuota_aplicada >= 0),
  alicuota_parametro_id uuid references public.parametros_fiscales (id),
  monto_iva numeric not null default 0, -- base_imponible_gravada × alicuota_aplicada / 100

  -- Para compras de uso mixto (gravado + exento/exonerado): si el
  -- crédito fiscal de este documento no es 100% atribuible a ventas
  -- gravadas, se marca PRORRATEABLE y entra al cálculo de
  -- prorrateo_credito_fiscal del período. NO_DEDUCIBLE es para crédito
  -- fiscal que la ley no permite deducir (p.ej. sin comprobante válido).
  destino_credito_fiscal text check (destino_credito_fiscal in ('TOTAL', 'PRORRATEABLE', 'NO_DEDUCIBLE')),

  porcentaje_retencion_iva numeric check (porcentaje_retencion_iva in (75, 100)),
  porcentaje_retencion_parametro_id uuid references public.parametros_fiscales (id),
  monto_retencion_iva numeric default 0,
  numero_comprobante_retencion text,

  created_by uuid references public.perfiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_retencion_solo_compras check (
    porcentaje_retencion_iva is null or tipo in ('COMPRA', 'NOTA_DEBITO_COMPRA')
  ),
  constraint chk_destino_solo_compras check (
    destino_credito_fiscal is null or tipo in ('COMPRA', 'NOTA_DEBITO_COMPRA', 'NOTA_CREDITO_COMPRA')
  )
);

create index idx_documentos_iva_empresa_periodo on public.documentos_iva (empresa_id, periodo, tipo);

comment on column public.documentos_iva.destino_credito_fiscal is
  'Solo aplica a documentos de COMPRA. TOTAL = 100% deducible (uso '
  'exclusivo en ventas gravadas). PRORRATEABLE = uso mixto, entra al '
  'cálculo de prorrateo_credito_fiscal. NO_DEDUCIBLE = crédito fiscal '
  'que la ley no permite deducir.';

-- ───────────────────────────────────────────────────────────────────────
-- PRORRATEO DE CRÉDITO FISCAL (Art. 34 LIVA)
--
-- Cuando una empresa realiza ventas gravadas y ventas exentas/exoneradas
-- en el mismo período, el crédito fiscal de compras de uso mixto
-- (destino_credito_fiscal = 'PRORRATEABLE') no es 100% deducible: se
-- prorratea según la proporción de ventas gravadas sobre ventas totales.
-- ───────────────────────────────────────────────────────────────────────

create table public.prorrateo_credito_fiscal (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  periodo text not null,
  ventas_gravadas numeric not null check (ventas_gravadas >= 0),
  ventas_exentas numeric not null default 0 check (ventas_exentas >= 0),
  ventas_exoneradas numeric not null default 0 check (ventas_exoneradas >= 0),
  prorrata numeric not null, -- ventas_gravadas / (ventas_gravadas + ventas_exentas + ventas_exoneradas)
  credito_fiscal_prorrateable numeric not null default 0, -- Σ monto_iva de documentos_iva con destino PRORRATEABLE del período
  credito_fiscal_deducible numeric not null default 0, -- credito_fiscal_prorrateable × prorrata
  credito_fiscal_no_deducible numeric not null default 0,
  traza jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, periodo)
);

-- ───────────────────────────────────────────────────────────────────────
-- DECLARACIÓN MENSUAL DE IVA (definitiva)
-- ───────────────────────────────────────────────────────────────────────

create table public.declaraciones_iva (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  periodo text not null, -- 'AAAA-MM'
  debito_fiscal numeric not null default 0, -- Σ monto_iva de documentos VENTA del período
  credito_fiscal_total numeric not null default 0, -- crédito fiscal deducible total (directo + prorrateado)
  retenciones_iva_soportadas numeric not null default 0, -- retenciones que le practicaron a la empresa como vendedor
  excedente_credito_periodo_anterior numeric not null default 0,
  impuesto_a_pagar numeric not null default 0,
  excedente_credito_siguiente numeric not null default 0,
  estado text not null default 'BORRADOR' check (estado in ('BORRADOR', 'DEFINITIVA')),
  traza jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, periodo)
);

-- ───────────────────────────────────────────────────────────────────────
-- RETENCIÓN DE IVA QUINCENAL (solo Sujeto Pasivo Especial actuando como
-- agente de retención — Providencia SENIAT sobre retenciones de IVA)
--
-- El SPE debe enterar lo retenido a sus proveedores en dos quincenas del
-- mes, no una vez al mes. Esta tabla agrupa las retenciones practicadas
-- (documentos_iva de tipo COMPRA con porcentaje_retencion_iva) por
-- quincena.
-- ───────────────────────────────────────────────────────────────────────

create table public.retenciones_iva_quincenales (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  periodo text not null, -- 'AAAA-MM-Q1' o 'AAAA-MM-Q2'
  fecha_inicio date not null,
  fecha_fin date not null,
  total_retenido numeric not null default 0,
  estado text not null default 'BORRADOR' check (estado in ('BORRADOR', 'ENTERADA')),
  traza jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, periodo)
);

comment on table public.retenciones_iva_quincenales is
  'Solo relevante si empresas.tipo_contribuyente = ESPECIAL. La '
  'aplicación debe impedir crear filas aquí para un contribuyente '
  'ordinario (regla de negocio en la capa de servicio, no en el '
  'esquema, para no acoplar esta tabla a un trigger frágil).';

-- ───────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────────────────

alter table public.documentos_iva enable row level security;
alter table public.prorrateo_credito_fiscal enable row level security;
alter table public.declaraciones_iva enable row level security;
alter table public.retenciones_iva_quincenales enable row level security;

create policy documentos_iva_miembros on public.documentos_iva
  for all using (
    exists (
      select 1 from public.empresa_usuarios eu
      where eu.empresa_id = documentos_iva.empresa_id and eu.usuario_id = auth.uid()
    )
  );

create policy prorrateo_credito_fiscal_miembros on public.prorrateo_credito_fiscal
  for all using (
    exists (
      select 1 from public.empresa_usuarios eu
      where eu.empresa_id = prorrateo_credito_fiscal.empresa_id and eu.usuario_id = auth.uid()
    )
  );

create policy declaraciones_iva_miembros on public.declaraciones_iva
  for all using (
    exists (
      select 1 from public.empresa_usuarios eu
      where eu.empresa_id = declaraciones_iva.empresa_id and eu.usuario_id = auth.uid()
    )
  );

create policy retenciones_iva_quincenales_miembros on public.retenciones_iva_quincenales
  for all using (
    exists (
      select 1 from public.empresa_usuarios eu
      where eu.empresa_id = retenciones_iva_quincenales.empresa_id and eu.usuario_id = auth.uid()
    )
  );
