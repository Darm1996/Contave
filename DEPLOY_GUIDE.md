# 🚀 Guía Completa: ContaVE en Supabase + Vercel

Esta guía te lleva paso a paso desde el sandbox actual hasta tener tu app contable funcionando en producción con:
- **Supabase** como base de datos PostgreSQL (gratis)
- **Vercel** como hosting de la aplicación (gratis)

Tiempo estimado: **30-45 minutos**

---

## 📋 Requisitos previos

Antes de empezar necesitas:
- [ ] Una cuenta en https://supabase.com (gratis, se crea con GitHub/Google)
- [ ] Una cuenta en https://vercel.com (gratis, se crea con GitHub/Google)
- [ ] Una cuenta en https://github.com (gratis, necesaria para Vercel)
- [ ] Los archivos del proyecto (los tienes en este sandbox)

---

## 🗄️ PARTE 1: Configurar Supabase (Base de Datos)

### Paso 1.1: Crear proyecto en Supabase

1. Ve a https://supabase.com y haz clic en **"Start your project"**
2. Inicia sesión con GitHub o Google
3. Haz clic en **"New Project"** (botón verde)
4. Completa el formulario:
   - **Organization:** selecciona tu organización (te crean una por defecto)
   - **Name:** `contave` (o el nombre que prefieras)
   - **Database Password:** haz clic en **"Generate a password"** y **CÓPIALA** en un lugar seguro (la necesitarás después)
   - **Region:** `South America (São Paulo)` si estás en Venezuela, o `East US` si prefieres
   - **Pricing Plan:** `Free` (suficiente para empezar)
5. Haz clic en **"Create new project"**
6. **Espera 2-3 minutos** mientras se crea (verás una animación)

### Paso 1.2: Obtener la cadena de conexión

1. En tu proyecto Supabase, en el menú izquierdo haz clic en **⚙️ Settings** (ícono de engranaje abajo)
2. Haz clic en **"Database"**
3. Busca la sección **"Connection string"** → pestaña **"URI"**
4. Verás algo como:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefg.supabase.co:5432/postgres
   ```
5. Reemplaza `[YOUR-PASSWORD]` con la contraseña que copiaste en el paso 1.1
6. **Copia esa URL completa** — es tu `DATABASE_URL`

Ejemplo final:
```
postgresql://postgres:MiPassword123@db.abcdefg.supabase.co:5432/postgres
```

### Paso 1.3: Obtener la URL del Pooler (recomendado para Vercel)

En la misma página de Settings → Database:

1. Busca la sección **"Connection pooling"** → pestaña **"Transaction mode"**
2. Verás algo como:
   ```
   postgresql://postgres.abcdefg:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
   ```
3. Reemplaza `[YOUR-PASSWORD]` con tu contraseña
4. **Copia esa URL** — es tu `DIRECT_URL` (para conexiones pooler)

---

## 💻 PARTE 2: Subir el código a GitHub

Vercel necesita que tu código esté en GitHub para desplegarlo automáticamente.

### Paso 2.1: Crear repositorio en GitHub

1. Ve a https://github.com/new
2. **Repository name:** `contave`
3. **Description:** `App contable venezolana con VLM`
4. Selecciona **"Private"** (recomendado para apps con lógica de negocio)
5. ✅ Marca **"Add a README file"**
6. Haz clic en **"Create repository"**

### Paso 2.2: Descargar el código del sandbox

Necesitas descargar todos los archivos del proyecto desde el sandbox. Para esto:

1. En el panel del sandbox (donde ves la app), busca un botón de **descarga** o **exportar proyecto** (suele estar en la barra superior)
2. Descarga el archivo ZIP del proyecto completo
3. Descomprímelo en tu computadora en una carpeta llamada `contave`

**Archivos críticos que debes asegurar que se descarguen:**
- `prisma/schema.prisma` (ya es el schema de PostgreSQL/Supabase, no requiere cambios)
- `scripts/seed.ts`
- `scripts/crear-super-admin.ts`
- `src/` (todo el código fuente)
- `package.json`
- `.env.example`
- `SUPABASE_SETUP.md`

### Paso 2.3: Subir a GitHub

Abre una terminal en tu computadora (PowerShell en Windows, Terminal en Mac/Linux) y ejecuta:

```bash
# Entra a la carpeta del proyecto
cd contave

# Inicializa git (si no está inicializado)
git init

# Agrega todos los archivos
git add .

# Haz el primer commit
git commit -m "ContaVE - app contable venezolana"

# Cambia la rama principal a main
git branch -M main

# Conecta con tu repositorio de GitHub (REEMPLAZA tu-usuario)
git remote add origin https://github.com/TU-USUARIO/contave.git

# Sube el código
git push -u origin main
```

Si te pide credenciales, usa un **Personal Access Token** de GitHub (Settings → Developer settings → Personal access tokens → Generate new token).

---

## ⚙️ PARTE 3: Preparar el proyecto para producción

### Paso 3.1: (Ya no es necesario) Cambiar el schema a PostgreSQL

`prisma/schema.prisma` ya usa el provider `postgresql` directamente — no hay
un schema separado de SQLite que copiar. Puedes pasar directamente al
siguiente paso.

### Paso 3.2: Crear archivo `.env` local para probar

Crea un archivo llamado `.env` en la raíz del proyecto con este contenido (REEMPLAZA los valores):

```bash
# Reemplaza con tu URL de Supabase (parte 1.2)
DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.TU_PROYECTO.supabase.co:5432/postgres"

# Reemplaza con tu URL del pooler (parte 1.3) - opcional pero recomendado
DIRECT_URL="postgresql://postgres.TU_PROYECTO:TU_PASSWORD@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"

# Genera un secreto aleatorio largo (cambia esto)
JWT_SECRET="cambia-esto-por-una-cadena-aleatoria-de-al-menos-32-caracteres-2026"

# Requerida: API key de Gemini para el escáner de facturas por IA (VLM)
# Consíguela en https://aistudio.google.com/app/apikey
GEMINI_API_KEY="tu-api-key-de-gemini"

# Opcional - solo si vas a usar Google Sheets
# GOOGLE_SHEETS_CLIENT_EMAIL="tu-sa@proyecto.iam.gserviceaccount.com"
# GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# GOOGLE_SHEETS_SPREADSHEET_ID="1ABC123..."
```

### Paso 3.3: Crear las tablas en Supabase

```bash
# Instala dependencias (si no lo has hecho)
bun install

# Genera el cliente Prisma con el nuevo schema
bun run db:generate

# Crea todas las tablas en Supabase
bun run db:push
```

Verás un mensaje como: `🚀  Your database is now in sync with your Prisma schema.`

### Paso 3.4: Cargar datos iniciales (plan de cuentas + super admin)

```bash
# Carga el plan de cuentas VEN-NIF, empresa demo, tasa BCV y admin
bun run scripts/seed.ts

# Crea el super admin
bun run scripts/crear-super-admin.ts
```

Verás:
```
🔑 CREDENCIALES DE ACCESO:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Email:     superadmin@contave.demo
   Password:  ContaVE2026!
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Paso 3.5: Probar localmente con Supabase

```bash
bun run dev
```

Abre http://localhost:3000 y verifica que puedes:
- Login con `superadmin@contave.demo` / `ContaVE2026!`
- Ver el plan de cuentas con 64 cuentas
- Ver la empresa demo

Si todo funciona, ya tienes Supabase conectado. ✅

### Paso 3.6: Configurar build para Vercel

Vercel necesita que el build genere el cliente Prisma automáticamente. Crea o edita el archivo `package.json` y asegúrate de que el script `build` sea:

```json
"build": "prisma generate && next build"
```

También necesitas un archivo `postinstall` para que Vercel regenere Prisma después de instalar:

```json
"scripts": {
  "dev": "next dev -p 3000",
  "build": "prisma generate && next build",
  "start": "next start",
  "postinstall": "prisma generate",
  "lint": "eslint .",
  "db:push": "prisma db push",
  "db:generate": "prisma generate"
}
```

⚠️ **Importante**: No uses el script `build` actual que tiene `cp -r .next/static` — ese es solo para el sandbox. Cámbialo al simple `next build`.

### Paso 3.7: Commit de los cambios

```bash
git add .
git commit -m "Configurado para Supabase + Vercel"
git push
```

---

## ☁️ PARTE 4: Desplegar en Vercel

### Paso 4.1: Importar proyecto en Vercel

1. Ve a https://vercel.com y haz clic en **"Log In"** (con GitHub)
2. En el dashboard, haz clic en **"Add New..."** → **"Project"**
3. Verás tus repositorios de GitHub. Busca `contave` y haz clic en **"Import"**

### Paso 4.2: Configurar el proyecto

En la pantalla de configuración:

1. **Framework Preset:** Next.js (se detecta automáticamente)
2. **Root Directory:** `./` (dejar por defecto)
3. **Build Command:** `npm run build` (dejar por defecto)
4. **Output Directory:** dejar por defecto
5. **Install Command:** dejar por defecto

### Paso 4.3: ⚡ Configurar variables de entorno (CRÍTICO)

En la misma pantalla, busca la sección **"Environment Variables"** y agrega estas variables:

| Name | Value |
|------|-------|
| `DATABASE_URL` | `postgresql://postgres:TU_PASSWORD@db.TU_PROYECTO.supabase.co:5432/postgres` |
| `DIRECT_URL` | `postgresql://postgres.TU_PROYECTO:TU_PASSWORD@aws-0-sa-east-1.pooler.supabase.com:6543/postgres` |
| `JWT_SECRET` | `cambia-esto-por-una-cadena-aleatoria-de-al-menos-32-caracteres-2026` |
| `NEXTAUTH_URL` | (lo agregarás después del primer deploy) |
| `NEXTAUTH_SECRET` | (lo puedes generar con `openssl rand -base64 32`) |

⚠️ **Importante**: usa los mismos valores que pusiste en `.env` local. Si quieres Google Sheets, agrega también esas 3 variables.

### Paso 4.4: Deploy

1. Haz clic en **"Deploy"** (botón azul)
2. **Espera 2-5 minutos** mientras se construye la app
3. Si todo sale bien, verás: **"Congratulations!"** con confeti 🎉
4. Vercel te dará una URL como: `https://contave-abc123-tu-usuario.vercel.app`

### Paso 4.5: Probar la app en producción

1. Haz clic en el link que te dio Vercel
2. Verás la pantalla de login de ContaVE
3. Inicia sesión con: `superadmin@contave.demo` / `ContaVE2026!`
4. Verifica que:
   - ✅ El dashboard carga con datos
   - ✅ Puedes ver el plan de cuentas (64 cuentas)
   - ✅ Puedes subir una factura y el VLM la analiza
   - ✅ Puedes exportar Excel

### Paso 4.6: Configurar dominio personalizado (opcional)

Si quieres usar `contave.tudominio.com` en lugar de la URL de Vercel:

1. En Vercel → tu proyecto → **Settings** → **Domains**
2. Escribe tu dominio y haz clic en **"Add"**
3. Vercel te dará los registros DNS que debes agregar en tu proveedor de dominio
4. Una vez propagado (5-30 min), tu app estará en tu dominio

---

## 🔧 PARTE 5: Configuración post-deploy

### Paso 5.1: Actualizar NEXTAUTH_URL

Después del primer deploy, necesitas decirle a la app cuál es su URL final:

1. En Vercel → tu proyecto → **Settings** → **Environment Variables**
2. Edita la variable `NEXTAUTH_URL` y pon tu URL de producción:
   ```
   https://contave-abc123-tu-usuario.vercel.app
   ```
3. Haz clic en **"Save"**
4. Ve a **"Deployments"** → haz clic en los 3 puntos del último deploy → **"Redeploy"**

### Paso 5.2: Configurar Google Sheets (opcional)

Si quieres sincronizar con Google Sheets:

1. Ve a https://console.cloud.google.com
2. Crea un proyecto nuevo llamado `contave-sheets`
3. Habilita la API de **Google Sheets** (APIs & Services → Library → search "Google Sheets API" → Enable)
4. Ve a **Credentials** → **Create Credentials** → **Service Account**
5. Llena el formulario:
   - Service account name: `contave-sheets-sa`
   - Haz clic en **"Create and Continue"** → **"Done"**
6. Haz clic en el service account que acabas de crear → **"Keys"** → **"Add Key"** → **"Create new key"** → **JSON**
7. Se descargará un archivo JSON. Ábrelo y copia estos valores:
   - `client_email` → es tu `GOOGLE_SHEETS_CLIENT_EMAIL`
   - `private_key` → es tu `GOOGLE_SHEETS_PRIVATE_KEY`
8. Crea un Google Sheet nuevo, copia su ID de la URL: `https://docs.google.com/spreadsheets/d/ESTE_ID/edit`
9. Comparte el Google Sheet con el email del service account (botón "Compartir" arriba a la derecha)
10. Agrega estas 3 variables en Vercel → Settings → Environment Variables:
    - `GOOGLE_SHEETS_CLIENT_EMAIL`
    - `GOOGLE_SHEETS_PRIVATE_KEY` (copia todo el valor incluyendo `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`)
    - `GOOGLE_SHEETS_SPREADSHEET_ID`
11. Redeploy

### Paso 5.3: Cambiar contraseñas (importante para producción)

Las credenciales `admin123` y `ContaVE2026!` son de demostración. En producción:

1. Inicia sesión como super admin
2. Crea un usuario nuevo con email real y contraseña fuerte
3. Asócialo como ADMIN a la empresa
4. Verifica que funcione
5. Elimina o cambia la contraseña del super admin demo

---

## 🆘 Solución de problemas comunes

### Error: "Cannot find module '@prisma/client'"
**Solución**: Asegúrate de que `postinstall: "prisma generate"` esté en `package.json` y que no haya un `.npmrc` con configuraciones raras.

### Error: "Database connection timeout"
**Solución**: Usa la URL del pooler (puerto 6543) en `DATABASE_URL` y la directa (5432) en `DIRECT_URL`.

### Error: "PrismaClientInitializationError"
**Solución**: Verifica que las variables `DATABASE_URL` y `DIRECT_URL` estén correctas en Vercel. El password no debe tener caracteres especiales sin escapar.

### La app carga pero no puedo login
**Solución**: Verifica que `JWT_SECRET` esté configurado en Vercel. Si cambiaste el secret, las sesiones antiguas se invalidan (normal).

### VLM no funciona en producción
**Solución**: El SDK de Z-AI ya está incluido en el proyecto, debería funcionar. Si hay errores de CORS o red, revisa los logs de Vercel (Functions →Logs).

### Google Sheets no sincroniza
**Solución**: Verifica que el Google Sheet esté compartido con el email del service account (no con tu email personal). El email del SA termina en `@proyecto.iam.gserviceaccount.com`.

---

## ✅ Checklist final

- [ ] Proyecto creado en Supabase
- [ ] Cadena de conexión copiada
- [ ] Código subido a GitHub
- [ ] Variables `.env` configuradas localmente (incluyendo `GEMINI_API_KEY`)
- [ ] `bun run db:push` ejecutado (tablas creadas)
- [ ] `bun run scripts/seed.ts` ejecutado (datos cargados)
- [ ] `bun run scripts/crear-super-admin.ts` ejecutado
- [ ] Probado localmente con Supabase ✅
- [ ] `package.json` actualizado con `postinstall: "prisma generate"`
- [ ] Cambios commiteados a GitHub
- [ ] Proyecto importado en Vercel
- [ ] Variables de entorno configuradas en Vercel
- [ ] Deploy exitoso
- [ ] Login funcional en producción
- [ ] Subir factura de prueba funciona
- [ ] Export Excel funciona
- [ ] (Opcional) Google Sheets configurado
- [ ] (Opcional) Dominio personalizado configurado
- [ ] Contraseñas de demo cambiadas

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs de Vercel: tu proyecto → **Functions** → **Logs**
2. Revisa los logs de Supabase: tu proyecto → **Logs**
3. Verifica que las variables de entorno estén iguales en local y en Vercel

¡Listo! Tu app ContaVE estará funcionando en producción con base de datos en Supabase y hosting en Vercel. 🚀
