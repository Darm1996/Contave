# Nómina Venezuela — Fase 2: Motor de cálculo

> **Aviso:** los cálculos deben ser validados por un contador público
> colegiado y los parámetros verificados contra la Gaceta Oficial vigente.

## Qué se entregó

Un módulo puro en `src/engine/` (sin base de datos, sin UI, sin red), con
una función por regla legal y el artículo citado en el código. Cada función
recibe datos + `ParametrosVigentes` y devuelve `{ valor, desglose, baseLegal,
alertas }`, para mostrar en pantalla "cómo se calculó".

| Archivo | Reglas |
|---|---|
| `decimal.ts` | Aritmética con `decimal.js` (40 dígitos), redondeo `r2` solo al final de cada concepto |
| `fechas.ts` | Antigüedad (años/meses/días), lunes de un rango, Pascua |
| `parametros.ts` | Tabla con vigencia, preferencia empresa > nacional, prorrateo por días, validación de solapes, `agregarVigencia` (Gaceta nueva) |
| `catalogo-parametros.ts` | Códigos, semilla de referencia (sin verificar) y lista de pendientes |
| `criterios.ts` | Opciones configurables A1–A14 con su defecto |
| `conceptos.ts` | Conceptos predefinidos con las 8 banderas |
| `salario.ts` | Salario diario, alícuotas y salario integral (Art. 104), días de utilidades (Art. 131) |
| `jornada.ts` | Hora ordinaria, horas extra con límites (Arts. 118 y 178), bono nocturno (Art. 117), feriado/descanso trabajado (Arts. 119 y 120) |
| `vacaciones.ts` | Días de disfrute y bono (Arts. 190 y 192), fecha de reintegro sin feriados ni descansos, fraccionados (Art. 196) |
| `parafiscales.ts` | IVSS y RPE por lunes con tope, FAOV, INCES patronal e INCES sobre utilidades, pensiones con base mínima y RNE, LOPCYMAT |
| `prestaciones.ts` | Garantía trimestral, días adicionales, libro auxiliar con intereses y anticipos, retroactivo, literal e, regla de oro, plazo y mora |
| `utilidades.ts` | Utilidades anuales o fraccionadas con retención INCES |
| `islr.ts` | AR-I vigente y retención sobre sueldos |
| `proteccion-familia.ts` | Pre/postnatal, paternidad, inamovilidad y bloqueo de despido |
| `recibo.ts` | Recibo completo de un trabajador (semanal, quincenal o mensual), doble moneda, snapshot de banderas |
| `liquidacion.ts` | Finiquito: comparación a+b vs. c, Art. 92, vacaciones vencidas y fraccionadas, utilidades, mora |
| `declaraciones.ts` | Consolidación mensual IVSS/RPE/FAOV/ISLR, pensiones por trabajador, INCES trimestral |
| `feriados.ts` | Lista semilla de feriados del año (Art. 184 y Ley de Fiestas Nacionales) |

## Pruebas (59, todas pasan)

```bash
npm install
npm test          # vitest
npm run typecheck # tsc estricto
```

Casos límite que pediste, todos cubiertos:

| Caso | Prueba |
|---|---|
| Trabajador con menos de 3 meses | `prestaciones.test.ts` — literal e (1 mes y 24 días = 2 meses × 5 días) |
| Egreso con 6 meses y 1 día | `prestaciones.test.ts` — cuenta 1 año (30 días); 6 meses exactos no |
| Mes con 5 lunes | `parafiscales.test.ts` y `recibo-liquidacion.test.ts` — junio 2026 |
| Salario sobre el tope del IVSS | `parafiscales.test.ts` — IVSS sobre 5 SM, RPE sobre 10 SM |
| Despido injustificado | `recibo-liquidacion.test.ts` — indemnización Art. 92 en línea separada |
| Trabajadora inamovible | `recibo-liquidacion.test.ts` — despido bloqueado; renuncia solo advierte |
| Cambio de parámetro a mitad de mes | IVSS: cada lunes usa su tope; cestaticket: prorrateo por días |

Los valores pendientes (días de utilidades, tasas de interés) aparecen en las
pruebas con la fuente "VALOR DE PRUEBA — no oficial". No son datos reales.

## Decisiones de implementación que debes revisar

1. **Sueldo por frecuencia:** mensual = salario × 1; quincenal = × 1/2;
   semanal = × 12/52. Si el trabajador ingresa o egresa dentro del período:
   salario ÷ 30 × días activos.
2. **Base IVSS/RPE de un período:** se suman los conceptos `base_ivss_rpe`
   del período y se llevan a su equivalente mensual antes de aplicar
   `× 12 ÷ 52 × lunes`. El tope y los porcentajes se resuelven en cada lunes.
3. **FAOV (A3):** conceptos `base_faov` del período + alícuotas de bono
   vacacional y utilidades del período.
4. **Feriado o descanso trabajado:** se paga salario diario × (1 + 50 %)
   además del sueldo del período, que ya incluye ese día.
5. **Días adicionales (lit. b):** se depositan al cumplir cada año n ≥ 2
   (2 días al cumplir el segundo año, 4 al tercero…), con el salario integral
   de ese mes.
6. **Intereses (Art. 143):** saldo al cierre de mes × tasa anual ÷ 12.
7. **Literal e:** usa el salario integral (configurable a normal).
8. **Utilidades (A7):** salario diario = devengado del ejercicio ÷ (meses
   completos × 30). Si el último salario da más, se avisa.
9. **Inamovilidad por maternidad:** el motor la registra desde el inicio del
   prenatal; si se conoce el embarazo antes, la app debe permitir registrarla
   desde esa fecha.
10. **Reposos IVSS:** por ahora se pagan como días normales y no reducen el
    sueldo. Falta modelar qué paga el patrono y qué paga el IVSS.

## Sigue pendiente de tu parte

- **A8:** base del INCES patronal. Hoy usa la bandera `base_inces` de cada
  concepto (sueldo y conceptos salariales; el bono vacacional aún no se paga
  por nómina ordinaria).
- **A11:** la indemnización del Art. 92 incluye los intereses (defecto
  conservador). ¿Confirmas?
- **A14:** salario variable (comisiones) para vacaciones y utilidades.
- **Valores oficiales:** tasa BCV de intereses de prestaciones de cada mes,
  tasa de mora, Unidad Tributaria, umbral de ISLR en UT, alícuota LOPCYMAT,
  días de utilidades de cada empresa.
- **Retiro justificado del trabajador (LOTTT Art. 80):** en la práctica
  también da derecho a la indemnización del Art. 92. ¿Lo agrego como motivo
  de egreso?
