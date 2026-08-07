// Store global para autenticación y navegación
import { create } from 'zustand'

export type TabKey =
  | 'dashboard'
  | 'escaner'
  | 'diario'
  | 'mayor'
  | 'balance'
  | 'libro-compras'
  | 'libro-ventas'
  | 'declaracion-iva'
  | 'estados-financieros'
  | 'ejercicios'
  | 'conciliacion'
  | 'cuentas'
  | 'islr'
  | 'reporte-islr'
  | 'empresas'
  | 'configuracion'
  | 'tasa'
  | 'exportar'
  | 'facturar'
  | 'clientes'
  | 'declaracion-igtf'
  | 'ajuste-inflacion'
  | 'empleados'
  | 'nomina'
  | 'activos-fijos'
  | 'vencimientos-fiscales'
  | 'productos'
  | 'inventario'
  | 'cuentas-por-cobrar'
  | 'cuentas-por-pagar'
  | 'vacaciones'
  | 'liquidaciones'
  | 'equipo'
  | 'accionistas'
  | 'actas-asamblea'
  | 'declaracion-islr-anual'
  | 'auditoria'
  | 'notificaciones'

interface UserState {
  id: string
  email: string
  name: string
  role: string
}

interface EmpresaState {
  id: string
  nombre: string
  rif: string
  esAgenteRetencionIVA: boolean
  esContribuyenteEspecial: boolean
  alicuotaIVA: number
  monedaFuncional: string
  rol?: string
}

interface AppState {
  user: UserState | null
  empresaActiva: EmpresaState | null
  empresas: EmpresaState[]
  tab: TabKey
  setUser: (u: UserState | null) => void
  setEmpresaActiva: (e: EmpresaState | null) => void
  setEmpresas: (es: EmpresaState[]) => void
  setTab: (t: TabKey) => void
  logout: () => void
}

export const useApp = create<AppState>((set) => ({
  user: null,
  empresaActiva: null,
  empresas: [],
  tab: 'dashboard',
  setUser: (u) => set({ user: u }),
  setEmpresaActiva: (e) => set({ empresaActiva: e }),
  setEmpresas: (es) => set({ empresas: es }),
  setTab: (t) => set({ tab: t }),
  logout: () => set({ user: null, empresaActiva: null, empresas: [], tab: 'dashboard' }),
}))

// Helper para fetch con cookies (auth)
export async function apiFetch<T = any>(
  url: string,
  options: RequestInit = {},
): Promise<{ ok: boolean; data?: T; error?: string; status: number }> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    })
    const isExcel = res.headers.get('content-type')?.includes('spreadsheet')
    if (isExcel) {
      const blob = await res.blob()
      return { ok: true, data: blob as any, status: res.status }
    }
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: data.error || 'Error', status: res.status }
    return { ok: true, data, status: res.status }
  } catch (e: any) {
    return { ok: false, error: e.message, status: 0 }
  }
}
