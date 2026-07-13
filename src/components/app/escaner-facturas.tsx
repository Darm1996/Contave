'use client'
import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useApp } from '@/lib/store'

export function EscanerFacturas() {
  const { empresaActiva } = useApp()
  const [cargado, setCargado] = useState(false)

  // Esto asegura que el componente solo intente renderizar una vez montado
  useEffect(() => {
    setCargado(true)
  }, [])

  if (!cargado) {
    return <div className="p-10 text-center">Cargando escáner...</div>
  }

  // Protección: Si no hay empresa activa, mostramos un aviso en lugar de romper
  if (!empresaActiva) {
    return (
      <div className="p-10 text-center text-slate-500">
        <p>No se ha seleccionado una empresa. Por favor, selecciona una empresa para usar el escáner.</p>
      </div>
    )
  }

  return (
    <div className="p-10">
      <h2 className="text-2xl font-bold">Escáner de Facturas</h2>
      <p>Bienvenido, el módulo está listo.</p>
      {/* Aquí irá tu formulario original una vez verifiquemos que esto carga */}
    </div>
  )
}
