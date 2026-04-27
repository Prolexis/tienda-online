-- CreateTable
CREATE TABLE "cat_producto_imagenes" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cat_producto_imagenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sis_notificaciones" (
    "id" SERIAL NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "vinculo" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sis_notificaciones_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cat_producto_imagenes" ADD CONSTRAINT "cat_producto_imagenes_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "cat_productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
