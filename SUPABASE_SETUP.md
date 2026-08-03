# 🗄️ Configurar Base de Datos en Supabase

ContaVE funciona con SQLite para desarrollo local, pero para producción (multi-usuario, acceso desde internet, respaldos automáticos) recomendamos **Supabase** (PostgreSQL gestionado, plan gratuito generoso).

## 📋 Pasos para migrar a Supabase

### 1. Crear cuenta y proyecto en Supabase

1. Ve a https://supabase.com y créate una cuenta (gratis con GitHub)
2. Click en **"New Project"**
3. Completa:
   - **Name:** ContaVE (o el nombre que prefieras)
   - **Database Password:** genera una contraseña segura y guárdala
   - **Region:** selecciona la más cercana (us-east-1 para Venezuela)
   - **Plan:** Free (suficiente para empezar)
4. Espera 2-3 minutos a que se cree el proyecto

### 2. Obtener la cadena de conexión

1. En tu proyecto Supabase, ve a **Settings → Database**
2. Busca la sección **"Connection string"**
3. Copia la URL con este formato:
   ```
   postgresql://postgres:[TU-PASSWORD]@db.[TU-PROYECTO].supabase.co:5432/postgres
   ```
4. Reemplaza `[TU-PASSWORD]` con tu contraseña y `[TU-PROYECTO]` con tu ID de proyecto

### 3. Configurar variables de entorno

Edita el archivo `.env` en la raíz del proyecto:

```bash
DATABASE_URL="postgresql://postgres:[TU-PASSWORD]@db.[TU-PROYECTO].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[TU-PASSWORD]@db.[TU-PROYECTO].supabase.co:5432/postgres"
```

### 4. Crear las tablas en Supabase

`prisma/schema.prisma` ya usa el provider `postgresql`, así que no hace falta
cambiar ningún archivo — solo generar el cliente y aplicar el schema:

```bash
# Genera el cliente Prisma
bun run db:generate

# Crea todas las tablas en Supabase
bun run db:push
```

### 5. Cargar datos iniciales (seed)

```bash
# Crea el super admin, empresa demo, plan de cuentas VEN-NIF y tasa BCV
bun run scripts/seed.ts

# Crea específicamente el super admin
bun run scripts/crear-super-admin.ts
```

### 6. (Opcional) Migrar datos existentes de SQLite

Si ya tienes datos en SQLite que quieres migrar a Supabase:

```bash
# Exporta datos de SQLite a JSON
bun run scripts/exportar-datos-sqlite.ts

# Cambia a Supabase (pasos 3-4 arriba)

# Importa los datos a Supabase
bun run scripts/importar-datos-supabase.ts
```

## 🔧 Usar el Pooler de Supabase (recomendado para producción)

Supabase ofrece un **pooler de conexiones** (Supavisor) que maneja mejor la concurrencia. Para usarlo:

1. En Supabase → Settings → Database → **"Connection pooling"**
2. Copia la URL del pooler (puerto 6543):
   ```
   postgresql://postgres.[TU-PROYECTO]:[TU-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
3. Configura `.env`:
   ```bash
   # Pooler para la app (transaccional)
   DATABASE_URL="postgresql://postgres.[TU-PROYECTO]:[TU-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
   # Conexión directa para migraciones
   DIRECT_URL="postgresql://postgres:[TU-PASSWORD]@db.[TU-PROYECTO].supabase.co:5432/postgres"
   ```

## 🛡️ Configuración de seguridad en Supabase

### Restringir acceso por IP (opcional)

En Supabase → Settings → Database → Network restrictions, puedes limitar qué IPs pueden conectarse.

### Habilitar Row Level Security (RLS) — recomendado

Aunque la app controla el acceso multi-tenant a nivel de aplicación, puedes añadir una capa extra de seguridad con RLS en Supabase:

1. Ve a **SQL Editor** en Supabase
2. Ejecuta este script (adapta según tus necesidades):

```sql
-- Ejemplo: las facturas solo pueden ser vistas por usuarios asociados a la empresa
ALTER TABLE "Factura" ENABLE ROW LEVEL SECURITY;

-- Como la app usa Prisma con un solo rol (postgres), RLS se omite por defecto.
-- Para activarlo, necesitas usar el servicio de Auth de Supabase.
-- Por ahora, la seguridad se maneja en la capa de aplicación (Next.js + JWT).
```

## 📊 Monitoreo y mantenimiento

### Ver el estado de la base de datos
- Supabase → **Database → Tables** → ver todas las tablas y datos
- Supabase → **Reports** → ver consultas lentas, uso de conexiones

### Respaldos automáticos
- Supabase hace respaldos diarios automáticos en el plan Pro
- En el plan Free, puedes exportar manualmente con `pg_dump` usando el
  `DATABASE_URL` de tu proyecto, o desde el panel de Supabase (Database →
  Backups)

## ❓ Preguntas frecuentes

**¿Puedo desarrollar localmente sin depender de Supabase?**
Sí. Instala PostgreSQL localmente (o usa un contenedor Docker) y apunta
`DATABASE_URL`/`DIRECT_URL` a esa instancia local en tu `.env`. El schema
(`prisma/schema.prisma`) es el mismo en desarrollo y producción — solo cambia
la cadena de conexión.

**¿Qué pasa si supero el límite del plan free?**
Supabase Free incluye 500MB de almacenamiento y 2GB de transferencia/mes. Para una app contable con cientos de facturas por empresa, esto es suficiente para varias empresas pequeñas. Si necesitas más, el plan Pro es $25/mes.

**¿Puedo usar otra base de datos PostgreSQL?**
Sí. Sirven Neon, Railway, Render, o un PostgreSQL propio. Solo cambia el `DATABASE_URL`. Supabase es el más recomendado por su panel web y características adicionales (Auth, Storage, Realtime).

**¿Cómo hago para que la app use Supabase Auth en lugar de JWT propio?**
Es una migración futura posible. Por ahora, la app usa JWT propio con bcrypt, que es seguro y funciona bien. Si quieres integrar Supabase Auth (login con Google, GitHub, etc.), se puede añadir en otra iteración.

## ✅ Verificación post-migración

Después de migrar, verifica que todo funciona:

```bash
# 1. Login como super admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@contave.demo","password":"ContaVE2026!"}'

# 2. Verificar que el plan de cuentas cargó
# (login en la web y ve a "Plan de Cuentas" - debes ver 64 cuentas)

# 3. Subir una factura de prueba y verificar que se genera el asiento
```

¡Listo! Tu app ahora corre sobre PostgreSQL en Supabase, lista para producción multi-usuario. 🚀
