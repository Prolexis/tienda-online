-- CreateEnum
CREATE TYPE "EstadoOrden" AS ENUM ('PENDIENTE_PAGO', 'PAGADA', 'EN_PROCESO', 'ENVIADA', 'ENTREGADA', 'CANCELADA', 'DEVUELTA');

-- CreateTable
CREATE TABLE "seg_roles" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seg_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seg_permisos" (
    "id" SERIAL NOT NULL,
    "modulo" VARCHAR(50) NOT NULL,
    "accion" VARCHAR(50) NOT NULL,

    CONSTRAINT "seg_permisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seg_rol_permiso" (
    "rolId" INTEGER NOT NULL,
    "permisoId" INTEGER NOT NULL,

    CONSTRAINT "seg_rol_permiso_pkey" PRIMARY KEY ("rolId","permisoId")
);

-- CreateTable
CREATE TABLE "seg_usuarios" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "telefono" VARCHAR(20),
    "email_verificado" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "refresh_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seg_usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seg_usuario_rol" (
    "usuarioId" INTEGER NOT NULL,
    "rolId" INTEGER NOT NULL,

    CONSTRAINT "seg_usuario_rol_pkey" PRIMARY KEY ("usuarioId","rolId")
);

-- CreateTable
CREATE TABLE "cli_clientes" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "fecha_nacimiento" TIMESTAMP(3),
    "genero" VARCHAR(20),
    "total_gastado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cantidad_ordenes" INTEGER NOT NULL DEFAULT 0,
    "segmento" VARCHAR(20) NOT NULL DEFAULT 'nuevo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cli_clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cli_direcciones" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "alias" VARCHAR(50) NOT NULL DEFAULT 'Mi casa',
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "direccion" VARCHAR(255) NOT NULL,
    "ciudad" VARCHAR(100) NOT NULL,
    "departamento" VARCHAR(100) NOT NULL,
    "codigo_postal" VARCHAR(10),
    "telefono" VARCHAR(20) NOT NULL,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cli_direcciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cat_categorias" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "descripcion" TEXT,
    "imagen" VARCHAR(500),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cat_categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cat_productos" (
    "id" SERIAL NOT NULL,
    "categoria_id" INTEGER NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "imagen" VARCHAR(500),
    "precio_venta" DECIMAL(10,2) NOT NULL,
    "precio_oferta" DECIMAL(10,2),
    "precio_compra" DECIMAL(10,2),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 5,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cat_productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ord_carritos" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "session_id" VARCHAR(100),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ord_carritos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ord_items_carrito" (
    "id" SERIAL NOT NULL,
    "carrito_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ord_items_carrito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ord_ordenes" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "direccion_id" INTEGER,
    "numero_orden" VARCHAR(20) NOT NULL,
    "estado" "EstadoOrden" NOT NULL DEFAULT 'PENDIENTE_PAGO',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "impuesto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "descuento" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "costo_envio" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "metodo_pago" VARCHAR(50) NOT NULL,
    "notas_cliente" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ord_ordenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ord_items_orden" (
    "id" SERIAL NOT NULL,
    "orden_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "nombre_producto" VARCHAR(200) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ord_items_orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ord_pagos" (
    "id" SERIAL NOT NULL,
    "orden_id" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "metodo" VARCHAR(50) NOT NULL,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'pendiente',
    "referencia" VARCHAR(200),
    "fecha_pago" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ord_pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ord_historial_estados" (
    "id" SERIAL NOT NULL,
    "orden_id" INTEGER NOT NULL,
    "estado_anterior" "EstadoOrden",
    "estado_nuevo" "EstadoOrden" NOT NULL,
    "comentario" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ord_historial_estados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_registro" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "accion" VARCHAR(50) NOT NULL,
    "modulo" VARCHAR(50) NOT NULL,
    "registro_id" INTEGER,
    "datos_anteriores" JSONB,
    "datos_nuevos" JSONB,
    "ip" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_registro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seg_roles_nombre_key" ON "seg_roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "seg_permisos_modulo_accion_key" ON "seg_permisos"("modulo", "accion");

-- CreateIndex
CREATE UNIQUE INDEX "seg_usuarios_email_key" ON "seg_usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "cli_clientes_usuario_id_key" ON "cli_clientes"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "cat_categorias_slug_key" ON "cat_categorias"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "cat_productos_sku_key" ON "cat_productos"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "ord_items_carrito_carrito_id_producto_id_key" ON "ord_items_carrito"("carrito_id", "producto_id");

-- CreateIndex
CREATE UNIQUE INDEX "ord_ordenes_numero_orden_key" ON "ord_ordenes"("numero_orden");

-- AddForeignKey
ALTER TABLE "seg_rol_permiso" ADD CONSTRAINT "seg_rol_permiso_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "seg_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seg_rol_permiso" ADD CONSTRAINT "seg_rol_permiso_permisoId_fkey" FOREIGN KEY ("permisoId") REFERENCES "seg_permisos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seg_usuario_rol" ADD CONSTRAINT "seg_usuario_rol_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "seg_usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seg_usuario_rol" ADD CONSTRAINT "seg_usuario_rol_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "seg_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cli_clientes" ADD CONSTRAINT "cli_clientes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "seg_usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cli_direcciones" ADD CONSTRAINT "cli_direcciones_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cli_clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cat_productos" ADD CONSTRAINT "cat_productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "cat_categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ord_carritos" ADD CONSTRAINT "ord_carritos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "seg_usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ord_items_carrito" ADD CONSTRAINT "ord_items_carrito_carrito_id_fkey" FOREIGN KEY ("carrito_id") REFERENCES "ord_carritos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ord_items_carrito" ADD CONSTRAINT "ord_items_carrito_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "cat_productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ord_ordenes" ADD CONSTRAINT "ord_ordenes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "seg_usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ord_ordenes" ADD CONSTRAINT "ord_ordenes_direccion_id_fkey" FOREIGN KEY ("direccion_id") REFERENCES "cli_direcciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ord_items_orden" ADD CONSTRAINT "ord_items_orden_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ord_ordenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ord_items_orden" ADD CONSTRAINT "ord_items_orden_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "cat_productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ord_pagos" ADD CONSTRAINT "ord_pagos_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ord_ordenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ord_historial_estados" ADD CONSTRAINT "ord_historial_estados_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ord_ordenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_registro" ADD CONSTRAINT "auditoria_registro_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "seg_usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
