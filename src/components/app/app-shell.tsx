'use client'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { useApp, apiFetch } from '@/lib/store'
import { Login } from './login'
import { Dashboard } from './dashboard'
import { EscanerFacturas } from './escaner-facturas'
import { LibroDiario } from './libro-diario'
import { LibroMayor } from './libro-mayor'
import { Balance } from './balance'
import { LibroCompras } from './libro-compras'
import { LibroVentas } from './libro-ventas'
import { DeclaracionIVA } from './declaracion-iva'
import { EstadosFinancieros } from './estados-financieros'
import { Ejercicios } from './ejercicios'
import { ReporteISLR } from './reporte-islr'
import { Conciliacion } from './conciliacion'
import { PlanCuentas } from './plan-cuentas'
import { ISLRPanel } from './islr-panel'
import { Empresas } from './empresas'
import { TasaCambio } from './tasa-cambio'
import { Exportar } from './exportar'
import { Configuracion } from './configuracion'
import { ActivosFijos } from './activos-fijos'
import { DeclaracionIGTF } from './declaracion-igtf'
import { FacturarVenta } from './facturar-venta'
import { Clientes } from './clientes'
import { Empleados } from './empleados'
import { Nomina } from './nomina'
import { AjusteInflacion } from './ajuste-inflacion'
import { VencimientosFiscales } from './vencimientos-fiscales'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LayoutDashboard, ScanLine, BookOpen, BookText, Scale,
  ListTree, Building2, DollarSign, Download, LogOut, BookOpenCheck,
  ShoppingCart, FileText, Receipt, Crown, FileBarChart, PieChart,
  Calendar, Landmark, FileSpreadsheet, Settings, Sun, Moon, Menu, X,
  Package, Users, TrendingUp, FilePlus, Contact, CalendarClock,
} from 'lucide-react'
import { toast } from 'sonner'

const NAV: Array<{ key: any; label: string; icon: any; section?: string }> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Principal' },
  { key: 'vencimientos-fiscales', label: 'Calendario Fiscal', icon: CalendarClock },
  { key: 'escaner', label: 'Escanear Factura', icon: ScanLine, section: 'Operación' },
  { key: 'facturar', label: 'Facturar Venta', icon: FilePlus },
  { key: 'clientes', label: 'Clientes', icon: Contact },
  { key: 'diario', label: 'Libro Diario', icon: BookText, section: 'Contabilidad' },
  { key: 'mayor', label: 'Libro Mayor', icon: BookOpen },
  { key: 'balance', label: 'Balance Comprobación', icon: Scale },
  { key: 'conciliacion', label: 'Conciliación Bancaria', icon: Landmark },
  { key: 'declaracion-iva', label: 'Declaración IVA', icon: FileBarChart, section: 'Declaraciones' },
  { key: 'declaracion-igtf', label: 'Declaración IGTF', icon: FileBarChart },
  { key: 'estados-financieros', label: 'Estados Financieros', icon: PieChart },
  { key: 'ejercicios', label: 'Ejercicios Fiscales', icon: Calendar, section: 'Cierre Anual' },
  { key: 'ajuste-inflacion', label: 'Ajuste por Inflación', icon: TrendingUp },
  { key: 'libro-compras', label: 'Libro de Compras', icon: ShoppingCart, section: 'Libros SENIAT' },
  { key: 'libro-ventas', label: 'Libro de Ventas', icon: FileText },
  { key: 'islr', label: 'Retenciones ISLR', icon: Receipt, section: 'Reportes ISLR' },
  { key: 'reporte-islr', label: 'Reporte Mensual ISLR', icon: FileSpreadsheet },
  { key: 'activos-fijos', label: 'Activos Fijos', icon: Package, section: 'Activos Fijos' },
  { key: 'empleados', label: 'Empleados', icon: Users, section: 'Nómina' },
  { key: 'nomina', label: 'Procesar Nómina', icon: FileSpreadsheet },
  { key: 'cuentas', label: 'Plan de Cuentas', icon: ListTree, section: 'Configuración' },
  { key: 'empresas', label: 'Empresas', icon: Building2 },
  { key: 'configuracion', label: 'Configuración', icon: Settings },
  { key: 'tasa', label: 'Tasa de Cambio', icon: DollarSign },
  { key: 'exportar', label: 'Exportar', icon: Download },
]

export function AppShell() {
  const {
    user, empresaActiva, empresas, tab, setTab, setUser, setEmpresaActiva, setEmpresas, logout,
  } = useApp()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Verificar sesión al montar
  useEffect(() => {
    apiFetch('/api/auth/me').then((r) => {
      if (r.ok && r.data?.user) {
        setUser(r.data.user)
        setEmpresaActiva(r.data.empresaActiva)
        setEmpresas(r.data.empresas || [])
      }
    })
  }, [])

  async function handleLogout() {
    await apiFetch('/api/auth/logout', { method: 'POST' })
    logout()
    toast.success('Sesión cerrada')
  }

  if (!user) return <Login />

  // Agrupar por sección: un item sin "section" propia hereda la del item
  // anterior que sí la definió (así se arman los grupos del NAV de arriba).
  const sections: Record<string, typeof NAV> = {}
  let seccionActual = ''
  NAV.forEach((item) => {
    if (item.section) seccionActual = item.section
    const s = seccionActual
    if (!sections[s]) sections[s] = []
    sections[s].push(item)
  })

  const initials = user.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || user.email.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      {/* Barra superior móvil/tablet */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <Button variant="ghost" size="sm" className="p-2" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú">
          <Menu className="w-5 h-5" />
        </Button>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow flex-shrink-0">
          <BookOpenCheck className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-slate-800 dark:text-slate-100 leading-tight text-sm truncate">
            {empresaActiva ? empresaActiva.nombre : 'ContaVE'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight">Contabilidad VE</div>
        </div>
      </header>

      {/* Backdrop del drawer en móvil/tablet */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col flex-shrink-0 h-screen transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:sticky lg:top-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow">
                <BookOpenCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-100 leading-tight">ContaVE</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight">Contabilidad VE</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="p-2 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Empresa activa */}
        {empresaActiva && (
          <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Empresa activa</div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{empresaActiva.nombre}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">RIF: {empresaActiva.rif}</div>
          </div>
        )}

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-3">
          {Object.entries(sections).map(([section, items]) => (
            <div key={section || '_'}>
              {section && (
                <div className="px-2 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {section}
                </div>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon
                  const active = tab === item.key
                  return (
                    <button
                      key={item.key}
                      onClick={() => { setTab(item.key); setSidebarOpen(false) }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                        active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-medium'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Usuario */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback className={`text-xs ${user.role === 'SUPER_ADMIN' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
                {user.role === 'SUPER_ADMIN' ? '👑' : initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{user.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={user.role === 'SUPER_ADMIN' ? 'default' : 'outline'} className={`text-xs ${user.role === 'SUPER_ADMIN' ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700' : ''}`}>
              {user.role === 'SUPER_ADMIN' && <Crown className="w-3 h-3 mr-1" />}
              {user.role}
            </Badge>
            {mounted && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-slate-500 dark:text-slate-400"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-slate-500 dark:text-slate-400" onClick={handleLogout}>
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 overflow-x-hidden min-w-0 pt-14 lg:pt-0">
        <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
          {tab === 'dashboard' && <Dashboard />}
          {tab === 'vencimientos-fiscales' && <VencimientosFiscales />}
          {tab === 'escaner' && <EscanerFacturas />}
          {tab === 'diario' && <LibroDiario />}
          {tab === 'mayor' && <LibroMayor />}
          {tab === 'balance' && <Balance />}
          {tab === 'conciliacion' && <Conciliacion />}
          {tab === 'declaracion-iva' && <DeclaracionIVA />}
          {tab === 'estados-financieros' && <EstadosFinancieros />}
          {tab === 'ejercicios' && <Ejercicios />}
          {tab === 'libro-compras' && <LibroCompras />}
          {tab === 'libro-ventas' && <LibroVentas />}
          {tab === 'islr' && <ISLRPanel />}
          {tab === 'reporte-islr' && <ReporteISLR />}
          {tab === 'cuentas' && <PlanCuentas />}
          {tab === 'activos-fijos' && <ActivosFijos />}
          {tab === 'declaracion-igtf' && <DeclaracionIGTF />}
          {tab === 'facturar' && <FacturarVenta />}
          {tab === 'clientes' && <Clientes />}
          {tab === 'empleados' && <Empleados />}
          {tab === 'nomina' && <Nomina />}
          {tab === 'ajuste-inflacion' && <AjusteInflacion />}
          {tab === 'empresas' && <Empresas />}
          {tab === 'configuracion' && <Configuracion />}
          {tab === 'tasa' && <TasaCambio />}
          {tab === 'exportar' && <Exportar />}
        </div>
        <footer className="mt-auto py-4 text-center text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          ContaVE · Contabilidad venezolana · IVA 16% + Retenciones IVA e ISLR + Libros SENIAT · Plan VEN-NIF Pymes · Hecho para el mercado venezolano
        </footer>
      </main>
    </div>
  )
}
