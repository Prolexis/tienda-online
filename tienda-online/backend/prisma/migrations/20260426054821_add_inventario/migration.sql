-- CreateTable
CREATE TABLE "inv_movimientos" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "stock_antes" INTEGER NOT NULL,
    "stock_despues" INTEGER NOT NULL,
    "motivo" VARCHAR(200) NOT NULL,
    "usuario_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inv_movimientos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "inv_movimientos" ADD CONSTRAINT "inv_movimientos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "cat_productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_movimientos" ADD CONSTRAINT "inv_movimientos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "seg_usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
