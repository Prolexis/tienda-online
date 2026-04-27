# 🔐 Roles y Permisos del Sistema

Este documento detalla los niveles de acceso y permisos específicos para cada rol en la plataforma de comercio electrónico.

## 👥 Resumen de Roles

| Rol | Descripción | Nivel de Acceso |
|-----|-------------|-----------------|
| **ADMIN** | Administrador total del sistema | Total |
| **GERENTE_INVENTARIO** | Gestión de productos, marcas y stock | Operativo (Catálogo) |
| **GERENTE_VENTAS** | Gestión de pedidos, cupones y clientes | Operativo (Comercial) |
| **VENDEDOR** | Visualización de inventario y gestión de ventas | Lectura / Limitado |
| **CLIENTE** | Usuario final que realiza compras | Público / Usuario |

---

## 🏷️ Gestión de Marcas (Nuevo Módulo)

La gestión de marcas es fundamental para la organización del catálogo. Los permisos se distribuyen de la siguiente manera:

### 🛠️ Administrador (ADMIN)
- **Acceso:** CRUD Completo.
- **Operaciones:**
  - Listar todas las marcas (activas e inactivas).
  - Crear nuevas marcas con logo y asociación de categorías.
  - Editar información de marcas existentes.
  - Desactivar (eliminar) marcas.
- **Restricción:** No se permite la eliminación definitiva si la marca tiene productos asociados.

### 📦 Gerente de Inventario (GERENTE_INVENTARIO)
- **Acceso:** CRUD Completo (mismos permisos que Admin en este módulo).
- **Operaciones:**
  - Gestión completa del catálogo de marcas.
  - Carga de logotipos.
  - Asociación con categorías para facilitar el filtrado.

### 💰 Gerente de Ventas (GERENTE_VENTAS)
- **Acceso:** Solo Lectura.
- **Operaciones:**
  - Visualizar lista de marcas para reportes o promociones.

### 🛒 Vendedor / Otros Roles Administrativos
- **Acceso:** Solo Lectura.
- **Operaciones:**
  - Consulta de marcas en el panel de productos.

---

## 📦 Gestión de Productos

| Operación | ADMIN | GERENTE_INVENTARIO | VENDEDOR |
|-----------|:---:|:---:|:---:|
| Ver Productos | ✅ | ✅ | ✅ |
| Crear Producto | ✅ | ✅ | ❌ |
| Editar Producto | ✅ | ✅ | ❌ |
| Eliminar (Desactivar) | ✅ | ❌ | ❌ |
| Seleccionar Marca | ✅ | ✅ | ❌ |

---

## 📁 Estructura de Endpoints de Marcas

### Públicos
- `GET /api/v1/products/brands`: Lista solo marcas activas.

### Administrativos (Requieren Auth)
- `GET /api/v1/admin/brands`: Lista todas las marcas (Admin/Gerente Inventario).
- `POST /api/v1/admin/brands`: Crear marca.
- `PUT /api/v1/admin/brands/:id`: Actualizar marca.
- `DELETE /api/v1/admin/brands/:id`: Desactivar marca.
- `POST /api/v1/admin/brands/upload`: Subir logo de marca.
