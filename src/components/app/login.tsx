'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useApp, apiFetch } from '@/lib/store'
import { toast } from 'sonner'
import { BookOpen, Loader2 } from 'lucide-react'

export function Login() {
  const { setUser, setEmpresaActiva, setEmpresas } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    const r = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setLoading(false)
    if (!r.ok) {
      toast.error(r.error || 'Error al iniciar sesión')
      return
    }
    setUser(r.data.user)
    setEmpresaActiva(r.data.empresaActiva)
    // Cargar empresas
    const me = await apiFetch('/api/auth/me')
    if (me.ok && me.data?.empresas) {
      setEmpresas(me.data.empresas)
      if (!r.data.empresaActiva && me.data.empresas.length > 0) {
        setEmpresaActiva(me.data.empresas[0])
      }
    }
    toast.success(`Bienvenido, ${r.data.user.name}`)
  }

  async function handleRegister() {
    if (!name || !email || !password) {
      toast.error('Complete todos los campos')
      return
    }
    setLoading(true)
    const r = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    })
    setLoading(false)
    if (!r.ok) {
      toast.error(r.error || 'Error al registrar')
      return
    }
    setUser(r.data.user)
    toast.success('Usuario creado. Crea tu primera empresa en la sección Empresas.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <Card className="w-full max-w-md shadow-xl border-emerald-200 dark:border-slate-700">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">ContaVE</CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400">Contabilidad venezolana inteligente<br/>Facturas → Libro Diario → Mayor</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="space-y-3">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
              </div>
              <div>
                <Label htmlFor="pwd">Contraseña</Label>
                <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleLogin} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar'}
              </Button>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center pt-2 border-t border-slate-100 dark:border-slate-800">
                ¿Primera vez? Usa la pestaña <strong>Registrarse</strong> para crear tu cuenta.
              </p>
            </TabsContent>
            <TabsContent value="register" className="space-y-3">
              <div>
                <Label htmlFor="name">Nombre completo</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contador Responsable" />
              </div>
              <div>
                <Label htmlFor="email2">Email</Label>
                <Input id="email2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="pwd2">Contraseña</Label>
                <Input id="pwd2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleRegister} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear cuenta'}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
