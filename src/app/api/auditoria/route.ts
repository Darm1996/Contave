import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresaRole } from '@/lib/auth'
import { listarAuditoria } from '@/lib/auditoria'

// GET /api/auditoria?accion=&limit= - solo ADMIN
export async function GET(req: NextRequest) {
  try {
    const { empresaId } = await requireEmpresaRole('ADMIN')
    const { searchParams } = new URL(req.url)
    const accion = searchParams.get('accion') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const registros = await listarAuditoria(empresaId, { accion, limit })
    return NextResponse.json({ registros })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
