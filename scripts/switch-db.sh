#!/bin/bash
# Script para cambiar entre SQLite (dev local) y Supabase (producción)
# Uso:
#   bash scripts/switch-db.sh sqlite   # Cambiar a SQLite
#   bash scripts/switch-db.sh supabase # Cambiar a Supabase/PostgreSQL

set -e

SCHEMA_FILE="prisma/schema.prisma"
SQLITE_SCHEMA="prisma/schema.sqlite.backup.prisma"
SUPABASE_SCHEMA="prisma/schema.supabase.prisma"

# Hacer backup del schema actual si no existe el backup
if [ ! -f "$SQLITE_SCHEMA" ] && [ -f "$SCHEMA_FILE" ]; then
  cp "$SCHEMA_FILE" "$SQLITE_SCHEMA"
  echo "✓ Backup del schema SQLite guardado en $SQLITE_SCHEMA"
fi

case "$1" in
  sqlite)
    echo "🔄 Cambiando a SQLite (desarrollo local)..."
    cp "$SQLITE_SCHEMA" "$SCHEMA_FILE"
    # Actualizar .env para usar SQLite
    if grep -q '^DATABASE_URL="file:' .env; then
      echo "✓ .env ya está configurado para SQLite"
    else
      echo "⚠ Edita .env manualmente para usar SQLite:"
      echo '  DATABASE_URL="file:/home/z/my-project/db/custom.db"'
    fi
    ;;
  supabase)
    echo "🔄 Cambiando a Supabase (PostgreSQL)..."
    if [ ! -f "$SUPABASE_SCHEMA" ]; then
      echo "❌ No se encontró $SUPABASE_SCHEMA"
      exit 1
    fi
    cp "$SUPABASE_SCHEMA" "$SCHEMA_FILE"
    echo "✓ Schema cambiado a PostgreSQL"
    echo ""
    echo "⚠ Ahora necesitas:"
    echo "  1. Editar .env con tu DATABASE_URL de Supabase"
    echo "  2. Ejecutar: bun run db:generate"
    echo "  3. Ejecutar: bun run db:push"
    echo "  4. Ejecutar: bun run scripts/seed.ts"
    echo ""
    echo "📖 Ver SUPABASE_SETUP.md para instrucciones detalladas"
    ;;
  *)
    echo "Uso: bash scripts/switch-db.sh [sqlite|supabase]"
    echo ""
    echo "Comandos:"
    echo "  sqlite   - Cambiar a SQLite (desarrollo local)"
    echo "  supabase - Cambiar a PostgreSQL/Supabase (producción)"
    exit 1
    ;;
esac

echo ""
echo "✅ Listo. Ejecuta 'bun run db:generate && bun run db:push' para aplicar los cambios."
