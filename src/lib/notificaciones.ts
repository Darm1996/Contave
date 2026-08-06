// Notificaciones por email: vencimientos fiscales próximos y facturas por
// cobrar vencidas. Este sandbox no tiene credenciales de ningún proveedor
// de correo, así que el envío real está detrás de RESEND_API_KEY — sin esa
// variable de entorno, las notificaciones quedan generadas y visibles en la
// app, pero marcadas como ERROR con un mensaje explicando qué falta
// configurar. En cuanto se agregue la API key en Vercel, "Enviar" empieza a
// funcionar sin tocar código.

import { db } from '@/lib/db'
import { calcularProximosVencimientos } from './contabilidad/vencimientos-fiscales'
import { listarCxC } from './contabilidad/cuentas-por-cobrar-pagar'

const DIAS_ALERTA_VENCIMIENTO = 5

export async function generarNotificacionesPendientes(empresaId: string) {
  const empresa = await db.empresa.findUnique({ where: { id: empresaId } })
  if (!empresa) throw new Error('Empresa no encontrada')
  if (!empresa.email) return { creadas: 0, motivo: 'La empresa no tiene un email de contacto configurado (Configuración → Email)' }

  let creadas = 0

  const ejercicioAbierto = await db.ejercicio.findFirst({ where: { empresaId, estado: 'ABIERTO' } })
  const vencimientos = calcularProximosVencimientos(empresa, ejercicioAbierto || undefined, new Date())
  for (const v of vencimientos) {
    if (v.diasRestantes < 0 || v.diasRestantes > DIAS_ALERTA_VENCIMIENTO) continue
    const entidadId = `${v.tipo}-${v.fecha.toISOString().slice(0, 10)}`
    const yaExiste = await db.notificacion.findFirst({ where: { empresaId, tipo: 'VENCIMIENTO_FISCAL', entidadId } })
    if (yaExiste) continue
    await db.notificacion.create({
      data: {
        empresaId,
        tipo: 'VENCIMIENTO_FISCAL',
        destinatario: empresa.email,
        entidadId,
        asunto: `Recordatorio ContaVE: ${v.descripcion} — ${v.diasRestantes === 0 ? 'vence hoy' : `vence en ${v.diasRestantes} día(s)`}`,
        cuerpo: `El vencimiento "${v.descripcion}" es el ${v.fecha.toLocaleDateString('es-VE')}. Ingresa a ContaVE para revisar el detalle en el Calendario Fiscal.`,
      },
    })
    creadas++
  }

  const cxc = await listarCxC(empresaId)
  for (const p of cxc.filter((p) => p.diasVencido > 0)) {
    const yaExiste = await db.notificacion.findFirst({
      where: { empresaId, tipo: 'CXC_VENCIDA', entidadId: p.id, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    })
    if (yaExiste) continue
    await db.notificacion.create({
      data: {
        empresaId,
        tipo: 'CXC_VENCIDA',
        destinatario: empresa.email,
        entidadId: p.id,
        asunto: `Factura vencida: ${p.nombreContraparte} (${p.diasVencido} día(s))`,
        cuerpo: `La factura de ${p.nombreContraparte} (${p.numeroFactura || p.ncf || 'sin número'}) por Bs. ${p.saldo.toFixed(2)} está vencida hace ${p.diasVencido} día(s). Ingresa a ContaVE → Cuentas por Cobrar para registrar el cobro.`,
      },
    })
    creadas++
  }

  return { creadas }
}

export async function enviarNotificacion(empresaId: string, id: string) {
  const notif = await db.notificacion.findUnique({ where: { id } })
  if (!notif || notif.empresaId !== empresaId) throw new Error('Notificación no encontrada')
  if (notif.estado === 'ENVIADA') return notif

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return db.notificacion.update({
      where: { id },
      data: { estado: 'ERROR', errorMensaje: 'No hay proveedor de email configurado. Agrega RESEND_API_KEY (y opcionalmente RESEND_FROM_EMAIL) en las variables de entorno de Vercel.' },
    })
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'ContaVE <notificaciones@contave.app>',
        to: notif.destinatario,
        subject: notif.asunto,
        text: notif.cuerpo,
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      return db.notificacion.update({ where: { id }, data: { estado: 'ERROR', errorMensaje: errText.slice(0, 500) } })
    }
    return db.notificacion.update({ where: { id }, data: { estado: 'ENVIADA', enviadaAt: new Date(), errorMensaje: null } })
  } catch (e: any) {
    return db.notificacion.update({ where: { id }, data: { estado: 'ERROR', errorMensaje: e.message } })
  }
}

export async function listarNotificaciones(empresaId: string) {
  return db.notificacion.findMany({ where: { empresaId }, orderBy: { createdAt: 'desc' }, take: 200 })
}
