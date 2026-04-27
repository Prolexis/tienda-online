# 🛍️ TiendaOnline — Sistema de E-Commerce

Sistema web completo de carrito de compras desarrollado con **React + Node.js + PostgreSQL**.

---

## 📋 Requisitos previos

| Herramienta      | Versión mínima |
|------------------|---------------|
| Node.js          | 20 LTS+        |
| npm              | 10+            |
| PostgreSQL       | 16+            |

---

## 🚀 Guía de instalación y ejecución

### 1️⃣ Crear la base de datos PostgreSQL

Abre pgAdmin o la terminal de PostgreSQL y ejecuta:

```sql
CREATE DATABASE tienda_online;
```

---

### 2️⃣ Configurar variables de entorno del backend

```bash
cd backend
cp .env.example .env
```

Edita el archivo `.env` y actualiza:

```env
DATABASE_URL="postgresql://TU_USUARIO:TU_PASSWORD@localhost:5432/tienda_online?schema=public"
JWT_SECRET=coloca_aqui_una_clave_secreta_larga
JWT_REFRESH_SECRET=otra_clave_diferente_para_refresh
```

---

### 3️⃣ Instalar dependencias (desde la raíz del proyecto)

```bash
# Desde la carpeta raíz tienda-online/
npm run install:all
```

O instalar por separado:

```bash
npm install                      # Raíz (concurrently)
cd backend  && npm install
cd ../frontend && npm install
```

---

### 4️⃣ Ejecutar migraciones de Prisma y cargar datos de prueba

```bash
cd backend

# Generar el cliente de Prisma
npx prisma generate

# Crear las tablas en la base de datos
npx prisma migrate dev --name init

# Cargar datos iniciales (roles, usuarios, categorías, 20 productos)
npm run db:seed
```

Esto creará automáticamente:
- **Admin:** `admin@tienda.com` / `admin123`
- **Cliente:** `cliente@tienda.com` / `cliente123`
- 6 categorías y 20 productos de ejemplo

---

### 5️⃣ Iniciar el proyecto completo

```bash
# Desde la carpeta raíz — inicia backend y frontend simultáneamente
npm run dev
```

O iniciar por separado:

```bash
# Terminal 1 — Backend (puerto 4000)
cd backend && npm run dev

# Terminal 2 — Frontend (puerto 5173)
cd frontend && npm run dev
```

---

### 6️⃣ Abrir en el navegador

| Servicio              | URL                              |
|-----------------------|----------------------------------|
| 🌐 Tienda (frontend)  | http://localhost:5173            |
| 🔧 API (backend)      | http://localhost:4000/api/v1     |
| 📚 Documentación API  | http://localhost:4000/api/docs   |
| 🗄️ Prisma Studio      | `cd backend && npm run db:studio`|

---

## 🏗️ Estructura del proyecto

```
tienda-online/
├── package.json                 ← Scripts raíz (monorepo)
├── backend/
│   ├── prisma/
│   │   └── schema.prisma        ← Modelo de datos (BD)
│   ├── src/
│   │   ├── server.ts            ← Punto de entrada Express
│   │   ├── config/
│   │   │   └── prisma.ts        ← Cliente Prisma singleton
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts   ← JWT + RBAC
│   │   │   └── error.middleware.ts  ← Manejo centralizado de errores
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── product.routes.ts
│   │   │   ├── cart.routes.ts
│   │   │   ├── order.routes.ts
│   │   │   ├── admin.routes.ts
│   │   │   └── report.routes.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── product.service.ts
│   │   │   ├── cart.service.ts
│   │   │   └── order.service.ts
│   │   ├── controllers/
│   │   │   └── auth.controller.ts
│   │   ├── types/
│   │   │   └── index.ts         ← Interfaces y DTOs TypeScript
│   │   └── utils/
│   │       ├── logger.ts        ← Winston logger
│   │       └── seed.ts          ← Datos iniciales
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── App.tsx              ← Router principal
    │   ├── main.tsx             ← Punto de entrada React
    │   ├── index.css            ← Tailwind + estilos globales
    │   ├── services/
    │   │   └── api.ts           ← Axios + interceptores
    │   ├── store/
    │   │   ├── auth.store.ts    ← Zustand: autenticación
    │   │   └── cart.store.ts    ← Zustand: carrito
    │   ├── components/
    │   │   ├── layout/
    │   │   │   └── Navbar.tsx
    │   │   ├── auth/
    │   │   │   └── ProtectedRoute.tsx
    │   │   └── admin/
    │   │       └── AdminLayout.tsx
    │   └── pages/
    │       ├── HomePage.tsx
    │       ├── ProductsPage.tsx
    │       ├── CartPage.tsx
    │       ├── CheckoutPage.tsx
    │       ├── OrdersPage.tsx
    │       ├── LoginPage.tsx
    │       ├── RegisterPage.tsx
    │       └── admin/
    │           ├── AdminDashboard.tsx
    │           ├── AdminProducts.tsx
    │           ├── AdminOrders.tsx
    │           └── AdminUsers.tsx
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── tsconfig.json
```

---

## ✨ Funcionalidades incluidas

### 👤 Usuarios y Autenticación
- Registro e inicio de sesión con JWT (Access + Refresh Token)
- Roles: ADMIN, CLIENTE, GERENTE_VENTAS, GERENTE_INVENTARIO, VENDEDOR
- Rutas protegidas por rol en frontend y backend
- Hash de contraseñas con bcrypt (12 salt rounds)

### 🛍️ Catálogo y Carrito
- Listado de productos con búsqueda, filtros por categoría y paginación
- Carrito persistente en backend (por usuario autenticado)
- Agregar, actualizar cantidad y eliminar productos
- Cálculo automático: subtotal + IGV 18% + total
- Validación de stock en tiempo real

### 💳 Checkout y Órdenes
- Proceso de compra en 2 pasos: dirección de envío → método de pago
- Métodos de pago: tarjeta (simulado), transferencia, contra entrega
- Generación automática de número de orden
- Descuento de stock al confirmar la compra
- Historial de estados de la orden

### 📊 Panel de Administración
- Dashboard con KPIs y 4 tipos de gráficos (Recharts)
- CRUD completo de productos con modal
- Gestión de pedidos con cambio de estado
- Listado de usuarios con segmentación de clientes

### 📄 Reportes PDF (PDFKit)
- Reporte de órdenes del período
- Reporte de inventario valorizado
- Factura individual por orden (descargable)

---

## 🔑 Credenciales de prueba

| Rol     | Email                    | Contraseña   |
|---------|--------------------------|--------------|
| Admin   | admin@tienda.com         | admin123     |
| Cliente | cliente@tienda.com       | cliente123   |

---

## 🛠️ Stack tecnológico

**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Zustand + Recharts + Axios

**Backend:** Node.js 20 + Express + TypeScript + Prisma ORM + Zod + JWT + bcrypt + PDFKit + Winston

**Base de datos:** PostgreSQL 16

---

## ⚠️ Notas importantes

- El **pago es simulado**: no se realizan cargos reales. En producción integra Stripe o MercadoPago.
- Crea la carpeta `backend/logs/` manualmente si aparece error de logger: `mkdir backend/logs`
- Asegúrate de que PostgreSQL esté corriendo antes de ejecutar las migraciones.
