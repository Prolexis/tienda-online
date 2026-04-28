import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

// =============================================
// MIDDLEWARE DE SUBIDA Y PROCESAMIENTO DE IMÁGENES
// =============================================

// Almacenamiento en memoria para procesar con sharp antes de guardar
const storage = multer.memoryStorage();

// Tipo auxiliar para evitar usar Express.Multer.File directamente
type UploadedFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  filename?: string;
  path?: string;
};

// Request con posible archivo
type RequestWithFile = Request & {
  file?: UploadedFile;
};

// Filtro de archivos permitidos
const fileFilter = (_req: Request, file: any, cb: multer.FileFilterCallback): void => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new AppError('Solo se permiten imágenes (JPEG, PNG, WEBP)', 400) as any);
};

// Middleware multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Middleware para procesar, comprimir y guardar imágenes
export const processImage = async (
  req: RequestWithFile,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.file) {
    next();
    return;
  }

  try {
    const { fieldname, buffer } = req.file;

    let folder = 'uploads';

    if (fieldname === 'logo') {
      folder = 'brands';
    } else if (fieldname === 'imagen') {
      folder = 'products';
    }

    const dest = path.join(process.cwd(), 'public', 'uploads', folder);

    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${fieldname}-${uniqueSuffix}.webp`;
    const finalPath = path.join(dest, filename);

    await sharp(buffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toFile(finalPath);

    req.file.filename = filename;
    req.file.path = finalPath;

    next();

  } catch (error) {
    console.error('Error al procesar imagen:', error);
    next(new AppError('Error al procesar la imagen', 500));
  }
};
