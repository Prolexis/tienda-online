-- AlterTable
ALTER TABLE "cat_productos" ADD COLUMN     "marca_id" INTEGER;

-- CreateTable
CREATE TABLE "cat_marcas" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "descripcion" TEXT,
    "imagen" VARCHAR(500),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cat_marcas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cat_marcas_slug_key" ON "cat_marcas"("slug");

-- AddForeignKey
ALTER TABLE "cat_productos" ADD CONSTRAINT "cat_productos_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "cat_marcas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
