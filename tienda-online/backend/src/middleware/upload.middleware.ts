import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

// Almacenamiento en memoria para procesar con sharp antes de guardar
const storage = multer.memoryStorage();

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Solo se permiten imágenes (JPEG, PNG, WEBP)', 400) as any, false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Aumentamos a 5MB porque comprimiremos
});

// Middleware para procesar y comprimir imágenes
export const processImage = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) return next();

  try {
    const { fieldname, buffer, originalname } = req.file;
    let dest = 'public/uploads/';
    if (fieldname === 'logo') dest += 'brands/';
    else if (fieldname === 'imagen') dest += 'products/';

    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${fieldname}-${uniqueSuffix}.webp`; // Convertimos todo a WebP por eficiencia
    const finalPath = path.join(dest, filename);

    // Comprimir y redimensionar con sharp
    await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true }) // Máximo 800px
      .webp({ quality: 80 }) // Calidad 80% en formato WebP
      .toFile(finalPath);

    // Actualizar el objeto file para que los controladores usen el nuevo nombre
    req.file.filename = filename;
    req.file.path = finalPath;

    next();
  } catch (err) {
    next(new AppError('Error al procesar la imagen', 500));
  }
};
