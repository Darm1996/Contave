// Comprueba que el contenido del curso es coherente antes de publicarlo.
// Se ejecuta con:  npx tsx scripts/validar-contenido.ts

import { MESES, SEMANAS, ESTADISTICAS } from '../src/contenido/curriculo'

const errores: string[] = []
const avisos: string[] = []

function unicos(nombre: string, ids: string[]) {
  const vistos = new Set<string>()
  for (const id of ids) {
    if (vistos.has(id)) errores.push(`ID repetido en ${nombre}: ${id}`)
    vistos.add(id)
  }
}

// 1. Numeración correlativa y meses completos.
SEMANAS.forEach((s, i) => {
  if (s.numero !== i + 1) errores.push(`La semana en posición ${i + 1} dice ser la ${s.numero}`)
})
MESES.forEach((m) => {
  if (m.semanas.length !== 4) avisos.push(`El mes ${m.numero} tiene ${m.semanas.length} semanas`)
  m.semanas.forEach((s) => {
    if (s.mes !== m.numero) errores.push(`La semana ${s.numero} dice pertenecer al mes ${s.mes}`)
  })
})

// 2. IDs únicos en todo el curso.
unicos('vocabulario', SEMANAS.flatMap((s) => s.vocabulario.map((v) => v.id)))
unicos('ejercicios', SEMANAS.flatMap((s) => s.ejercicios.map((e) => e.id)))
unicos('gramática', SEMANAS.flatMap((s) => s.gramatica.map((g) => g.id)))
unicos('escritura', SEMANAS.flatMap((s) => s.escritura.map((t) => t.id)))

// 3. Cada ejercicio tiene lo que su tipo necesita.
for (const s of SEMANAS) {
  for (const e of s.ejercicios) {
    const donde = `S${s.numero}/${e.id}`
    switch (e.tipo) {
      case 'opcion':
        if (!e.opciones?.length) errores.push(`${donde}: sin opciones`)
        else if (!e.opciones.includes(e.respuesta ?? ''))
          errores.push(`${donde}: la respuesta "${e.respuesta}" no está entre las opciones`)
        break
      case 'completar':
      case 'traducir':
        if (!e.respuesta) errores.push(`${donde}: sin respuesta`)
        if (!e.texto) errores.push(`${donde}: sin enunciado`)
        break
      case 'ordenar': {
        if (!e.piezas?.length) errores.push(`${donde}: sin piezas`)
        if (!e.respuesta) errores.push(`${donde}: sin respuesta`)
        // Las piezas deben poder formar exactamente la respuesta.
        const limpia = (t: string) =>
          t.toLowerCase().replace(/[.,?!]/g, '').split(/\s+/).filter(Boolean).sort().join(' ')
        if (e.piezas && e.respuesta && limpia(e.piezas.join(' ')) !== limpia(e.respuesta))
          errores.push(
            `${donde}: las piezas no forman la respuesta\n    piezas: ${e.piezas.join(' | ')}\n    resp:   ${e.respuesta}`
          )
        break
      }
      case 'escuchar':
        if (!e.respuesta) errores.push(`${donde}: sin frase que reproducir`)
        break
      case 'hablar':
        if (!e.texto) errores.push(`${donde}: sin frase que decir`)
        break
      case 'emparejar':
        if (!e.pares?.length) errores.push(`${donde}: sin pares`)
        if (e.pares && new Set(e.pares.map((p) => p.es)).size !== e.pares.length)
          errores.push(`${donde}: dos pares comparten la misma traducción`)
        break
    }
  }

  // 4. Cada semana está completa.
  if (!s.gramatica.length) errores.push(`S${s.numero}: sin gramática`)
  if (s.vocabulario.length < 15) avisos.push(`S${s.numero}: solo ${s.vocabulario.length} palabras`)
  if (s.ejercicios.length < 10) avisos.push(`S${s.numero}: solo ${s.ejercicios.length} ejercicios`)
  if (!s.escritura.length) errores.push(`S${s.numero}: sin tarea de escritura`)
  if (s.dialogo.lineas.length < 6) avisos.push(`S${s.numero}: diálogo muy corto`)
  if (!s.pronunciacion.practica.length) errores.push(`S${s.numero}: sin práctica de pronunciación`)

  // 5. Los modelos de escritura deben cumplir su propio mínimo de palabras.
  for (const t of s.escritura) {
    const palabras = t.modelo.trim().split(/\s+/).length
    if (palabras < t.minPalabras)
      avisos.push(`S${s.numero}/${t.id}: el modelo tiene ${palabras} palabras y pide ${t.minPalabras}`)
  }

  // 6. Los tipos de ejercicio deberían estar variados.
  const tipos = new Set(s.ejercicios.map((e) => e.tipo))
  if (tipos.size < 4) avisos.push(`S${s.numero}: solo ${tipos.size} tipos de ejercicio distintos`)
}

console.log('Curso:', ESTADISTICAS)
console.log('')

if (avisos.length) {
  console.log(`⚠ ${avisos.length} avisos:`)
  avisos.forEach((a) => console.log('  ·', a))
  console.log('')
}

if (errores.length) {
  console.log(`✗ ${errores.length} errores:`)
  errores.forEach((e) => console.log('  ·', e))
  process.exit(1)
}

console.log('✓ Contenido válido.')
