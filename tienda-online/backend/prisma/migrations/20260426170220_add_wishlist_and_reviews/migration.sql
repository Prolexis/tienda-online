-- CreateTable
CREATE TABLE "cli_wishlist" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cli_wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cat_resenas" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "puntuacion" SMALLINT NOT NULL,
    "comentario" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cat_resenas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cli_wishlist_usuario_id_producto_id_key" ON "cli_wishlist"("usuario_id", "producto_id");

-- CreateIndex
CREATE UNIQUE INDEX "cat_resenas_usuario_id_producto_id_key" ON "cat_resenas"("usuario_id", "producto_id");

-- AddForeignKey
ALTER TABLE "cli_wishlist" ADD CONSTRAINT "cli_wishlist_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "seg_usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cli_wishlist" ADD CONSTRAINT "cli_wishlist_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "cat_productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cat_resenas" ADD CONSTRAINT "cat_resenas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "seg_usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cat_resenas" ADD CONSTRAINT "cat_resenas_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "cat_productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
