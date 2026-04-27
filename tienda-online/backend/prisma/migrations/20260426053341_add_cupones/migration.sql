-- CreateTable
CREATE TABLE "cupones" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "tipo" VARCHAR(20) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "minimo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "usos" INTEGER NOT NULL DEFAULT 0,
    "usos_maximos" INTEGER NOT NULL DEFAULT 100,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cupones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cupones_codigo_key" ON "cupones"("codigo");
