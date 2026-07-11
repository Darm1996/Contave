# ContaVE 🇻🇪

App contable para el mercado venezolano con IA visual (VLM).

## 🚀 Inicio rápido

Lee **DEPLOY_GUIDE.md** para la guía completa paso a paso (Supabase + Vercel).

## ⚡ Setup rápido (resumen)

```bash
# 1. Instalar dependencias
npm install

# 2. Crear .env con tus credenciales de Supabase (ver .env.example)
cp .env.example .env
# Edita .env con tu DATABASE_URL de Supabase

# 3. Crear tablas en Supabase
npx prisma generate
npx prisma db push

# 4. Cargar datos iniciales (plan de cuentas + super admin)
npm run seed
npm run super-admin

# 5. Probar localmente
npm run dev
```

## 🔑 Credenciales por defecto (cambiar en producción)

- Super Admin: superadmin@contave.demo / ContaVE2026!
- Admin demo: admin@contave.demo / admin123

## 📖 Documentación

- `DEPLOY_GUIDE.md` — Guía completa Supabase + Vercel
- `SUPABASE_SETUP.md` — Configuración detallada Supabase
