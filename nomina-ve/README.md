# Nómina VE

Mini aplicación de nómina para pequeñas y medianas empresas venezolanas
(LOTTT, IVSS, RPE, FAOV, INCES, contribución de pensiones, ISLR, cestaticket).

> ⚠️ **Los cálculos deben ser validados por un profesional colegiado y los
> parámetros verificados contra la Gaceta Oficial vigente.**

Proyecto independiente. Estado: **Fase 2 lista** (motor de cálculo y
pruebas). La interfaz y la base de datos llegan en la Fase 3.

```bash
npm install
npm test
npm run typecheck
```

## Documentación

- `docs/FASE-1-modelo-de-datos.md` — tablas, relaciones, catálogo de parámetros, reglas ambiguas
- `docs/FASE-2-motor.md` — motor de cálculo, pruebas y decisiones pendientes

## Cómo actualizar un parámetro cuando sale una nueva Gaceta

Nunca edites un valor existente. Agrega una vigencia nueva:

```ts
import { agregarVigencia } from './src/engine'

const tabla2 = agregarVigencia(tabla, {
  codigo: 'SALARIO_MINIMO_MENSUAL',
  empresaId: null,
  valor: '200',
  unidad: 'VES',
  vigenteDesde: '2026-06-16',
  vigenteHasta: null,
  fuente: 'Decreto N.º … (GO N.º … de fecha …)',
  verificado: true,
})
```

`agregarVigencia` cierra la vigencia anterior el día previo y rechaza
solapes o registros sin fuente. Los períodos anteriores siguen
calculándose con el valor que tenían. (En la Fase 3 esto será un formulario.)
