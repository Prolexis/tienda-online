# 🚀 Guía de Despliegue y Migración del Sistema

Este documento proporciona un procedimiento detallado para trasladar y ejecutar el sistema de Tienda Online en una nueva computadora.

---

## 📋 1. Requisitos del Sistema Destino

Antes de iniciar, asegúrese de que la PC destino cumpla con los siguientes requisitos:

- **Sistema Operativo:** Windows 10/11, macOS o Linux.
- **Node.js:** Versión 18.x o superior (se recomienda la versión LTS).
- **npm:** Versión 9.x o superior.
- **Base de Datos:** PostgreSQL 14 o superior.
- **Puertos Libres:** 
  - `4000` (Backend API)
  - `5173` (Frontend Development)

---

## 📦 2. Preparación del Paquete Portable

Para trasladar el código de forma eficiente y ligera, siga estos pasos en la PC de origen:

1. **Limpiar archivos temporales:** Elimine las carpetas de dependencias y builds para reducir el tamaño del paquete.
2. **Generar archivo comprimido:** Cree un archivo ZIP excluyendo las carpetas pesadas.

### Archivos y carpetas a incluir:
- `/backend` (Excluir `node_modules`, `dist`)
- `/frontend` (Excluir `node_modules`, `dist`)
- `package.json` (Raíz)
- `package-lock.json` (Raíz)
- `ROLES_PERMISOS.md`
- `.gitignore`

---

## 🛠️ 3. Instalación y Configuración en la PC Destino

### Paso A: Preparación del Entorno
1. **Instalar Node.js:** Descárguelo desde [nodejs.org](https://nodejs.org/).
2. **Instalar PostgreSQL:** Descárguelo desde [postgresql.org](https://www.postgresql.org/download/).
   - Durante la instalación, configure una contraseña para el usuario `postgres`.
   - Cree una base de datos llamada `tienda_online`.

### Paso B: Extracción y Dependencias
1. Extraiga el paquete ZIP en la ubicación deseada (ej. `C:\tienda-online`).
2. Abra una terminal en la raíz del proyecto y ejecute:
   ```bash
   npm run install:all
   ```
   *Este comando instalará las dependencias de la raíz, del backend y del frontend simultáneamente.*

### Paso C: Variables de Entorno
1. Diríjase a la carpeta `/backend`.
2. Copie el archivo `.env.example` y renómbrelo como `.env`.
3. Edite el archivo `.env` con los datos de su base de datos PostgreSQL:
   ```env
   DATABASE_URL="postgresql://USUARIO:PASSWORD@localhost:5432/tienda_online?schema=public"
   JWT_SECRET="una_clave_aleatoria_muy_larga"
   JWT_REFRESH_SECRET="otra_clave_aleatoria_diferente"
   ```

---

## 🗄️ 4. Migración de la Base de Datos

En la carpeta raíz, ejecute el siguiente comando para sincronizar el esquema de la base de datos y cargar los datos iniciales (semillas):

```bash
# Ejecutar migraciones de Prisma
npm run db:migrate

# Cargar datos de prueba (Usuarios, Categorías, Marcas, Productos)
npm run db:seed
```

---

## 🚀 5. Ejecución del Sistema

Para iniciar tanto el backend como el frontend en modo desarrollo:

```bash
npm run dev
```

- **Backend:** Corriendo en `http://localhost:4000`
- **Frontend:** Corriendo en `http://localhost:5173`
- **Documentación API:** `http://localhost:4000/api/docs`

---

## 🔍 6. Verificación de Funcionamiento

Para confirmar que todo está correcto, realice las siguientes pruebas:
1. **Registro/Login:** Intente crear un usuario y loguearse.
2. **Administración:** Acceda a `/admin/brands` y verifique que las marcas se listan correctamente.
3. **Imágenes:** Intente subir un logo de marca y verifique que se previsualiza.
4. **Carrito:** Agregue productos al carrito y verifique el flujo de checkout.

---

## 🛠️ 7. Troubleshooting (Resolución de Problemas)

| Error Común | Causa Probable | Solución |
|-------------|----------------|----------|
| `Error: P1001: Can't reach database server` | PostgreSQL no está corriendo o la URL en `.env` es incorrecta. | Verifique que el servicio PostgreSQL esté activo y que el usuario/password en `.env` sean correctos. |
| `EADDRINUSE: address already in use :::4000` | El puerto 4000 ya está siendo usado por otra aplicación. | Cierre la aplicación que usa el puerto o cambie el `PORT` en el `.env` del backend. |
| `Module not found` | Faltan dependencias por instalar. | Ejecute `npm run install:all` nuevamente en la raíz. |
| `Prisma Client could not be found` | No se generó el cliente de Prisma después de la migración. | Ejecute `npx prisma generate` dentro de la carpeta `backend`. |
| `404 Not Found` en imágenes | La carpeta de uploads no existe o no tiene permisos. | Verifique que existe `backend/public/uploads/brands` y que tiene permisos de escritura. |

---

*Documento generado el 26 de Abril de 2026 para el sistema de Tienda Online.*
