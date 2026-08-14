-- DropIndex
DROP INDEX "cliente_nombre_trgm";

-- DropIndex
DROP INDEX "producto_nombre_trgm";

-- DropIndex
DROP INDEX "producto_sku_trgm";

-- DropIndex
DROP INDEX "proveedor_nombre_trgm";

-- DropIndex
DROP INDEX "variante_sku_trgm";

-- CreateTable
CREATE TABLE "secuencias_operativas" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "serie" TEXT NOT NULL DEFAULT 'A',
    "siguienteNumero" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secuencias_operativas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "secuencias_operativas_organizacionId_tipo_serie_key" ON "secuencias_operativas"("organizacionId", "tipo", "serie");

-- AddForeignKey
ALTER TABLE "secuencias_operativas" ADD CONSTRAINT "secuencias_operativas_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
