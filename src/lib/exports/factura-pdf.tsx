// Genera el PDF de una factura de venta emitida (server-side, vía @react-pdf/renderer).
import React from 'react'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, borderBottom: '2 solid #0f766e', paddingBottom: 12 },
  empresaNombre: { fontSize: 16, fontWeight: 700 },
  facturaTitulo: { fontSize: 14, fontWeight: 700, textAlign: 'right' },
  section: { marginBottom: 12 },
  label: { color: '#64748b', fontSize: 8 },
  value: { fontSize: 10, marginBottom: 4 },
  table: { marginTop: 12, borderTop: '1 solid #cbd5e1', borderBottom: '1 solid #cbd5e1' },
  row: { flexDirection: 'row', paddingVertical: 6, borderBottom: '0.5 solid #e2e8f0' },
  cellLabel: { flex: 3 },
  cellValue: { flex: 1, textAlign: 'right' },
  totalRow: { flexDirection: 'row', paddingVertical: 8, marginTop: 4 },
  totalLabel: { flex: 3, fontSize: 12, fontWeight: 700 },
  totalValue: { flex: 1, fontSize: 12, fontWeight: 700, textAlign: 'right' },
  footer: { marginTop: 32, fontSize: 8, color: '#94a3b8', textAlign: 'center' },
})

function formatBsPdf(n: number) {
  return `Bs. ${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export interface FacturaPdfData {
  empresa: { nombre: string; rif: string; direccion: string | null; telefono: string | null; email: string | null }
  factura: {
    numeroFactura: string | null
    numeroControl: string | null
    fechaEmision: Date
    rifContraparte: string
    nombreContraparte: string
    descripcion: string | null
    baseImponible: number
    montoExento: number
    alicuotaIVA: number
    montoIVA: number
    total: number
  }
}

export function FacturaPdfDocument({ empresa, factura }: FacturaPdfData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.empresaNombre}>{empresa.nombre}</Text>
            <Text style={styles.value}>RIF: {empresa.rif}</Text>
            {empresa.direccion && <Text style={styles.value}>{empresa.direccion}</Text>}
            {empresa.telefono && <Text style={styles.value}>Tel: {empresa.telefono}</Text>}
          </View>
          <View>
            <Text style={styles.facturaTitulo}>FACTURA N° {factura.numeroFactura}</Text>
            <Text style={styles.value}>N° Control: {factura.numeroControl}</Text>
            <Text style={styles.value}>Fecha: {new Date(factura.fechaEmision).toLocaleDateString('es-VE')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>FACTURAR A</Text>
          <Text style={styles.value}>{factura.nombreContraparte}</Text>
          <Text style={styles.value}>RIF: {factura.rifContraparte}</Text>
        </View>

        {factura.descripcion && (
          <View style={styles.section}>
            <Text style={styles.label}>CONCEPTO</Text>
            <Text style={styles.value}>{factura.descripcion}</Text>
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={styles.cellLabel}>Base imponible</Text>
            <Text style={styles.cellValue}>{formatBsPdf(factura.baseImponible)}</Text>
          </View>
          {factura.montoExento > 0 && (
            <View style={styles.row}>
              <Text style={styles.cellLabel}>Monto exento</Text>
              <Text style={styles.cellValue}>{formatBsPdf(factura.montoExento)}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.cellLabel}>IVA ({factura.alicuotaIVA}%)</Text>
            <Text style={styles.cellValue}>{formatBsPdf(factura.montoIVA)}</Text>
          </View>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>{formatBsPdf(factura.total)}</Text>
        </View>

        <Text style={styles.footer}>Documento generado por ContaVE · Contabilidad venezolana</Text>
      </Page>
    </Document>
  )
}

export async function generarFacturaPdfBuffer(data: FacturaPdfData): Promise<Buffer> {
  return renderToBuffer(<FacturaPdfDocument {...data} />)
}
