// src/utils/uploadFile.ts
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import status from 'http-status';
import { Request, Response, NextFunction } from 'express';
import AppError from '../errors/AppError';



const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folderPath = './src/public';

    if (file.mimetype.startsWith('image/')) {
      folderPath = './src/public/images';
    } else if (file.mimetype === 'application/pdf') {
      folderPath = './src/public/pdf';
    } else if (file.mimetype.startsWith('audio/')) {
      folderPath = './src/public/audio';
    } else if (file.mimetype.startsWith('video/')) {
      folderPath = './src/public/video';
    } else {
      cb(
        new AppError(
          status.BAD_REQUEST,
          'Only images, PDFs, audio, and video files are allowed',
          '',
        ),
        './src/public',
      );
      return;
    }

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    cb(null, folderPath);
  },

  filename(_req, file, cb) {
    const fileExt = path.extname(file.originalname);
    const fileName = `${file.originalname
      .replace(fileExt, '')
      .toLocaleLowerCase()
      .split(' ')
      .join('-')}-${uuidv4()}`;

    cb(null, fileName + fileExt);
  },
});



const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'video/mp4',
  'video/mpeg',
  'video/webm',
];

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        status.BAD_REQUEST,
        `File type "${file.mimetype}" is not supported`,
        '',
      ) as unknown as null,
      false,
    );
  }
};

/* -------------------------------------------------------------------------- */
/*  3. MULTER INSTANCE (with size limit)                                      */
/* -------------------------------------------------------------------------- */

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max per file — adjust as needed
  },
});

/* -------------------------------------------------------------------------- */
/*  4. IMAGE COMPRESSION MIDDLEWARE (runs AFTER multer, before controller)    */
/* -------------------------------------------------------------------------- */

interface CompressOptions {
  maxWidth?: number;
  quality?: number;
}

const compressImage = (options: CompressOptions = {}) => {
  const { maxWidth = 1600, quality = 75 } = options;

  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // handle both single (req.file) and multiple (req.files) uploads
      const files: Express.Multer.File[] = req.file
        ? [req.file]
        : Array.isArray(req.files)
          ? req.files
          : [];

      for (const file of files) {
        if (!file.mimetype.startsWith('image/')) continue;

        const filePath = file.path;
        const ext = path.extname(filePath).toLowerCase();
        const tempPath = `${filePath}.tmp`;

        let sharpInstance = sharp(filePath).resize({
          width: maxWidth,
          withoutEnlargement: true,
        });

        if (ext === '.jpg' || ext === '.jpeg') {
          sharpInstance = sharpInstance.jpeg({ quality });
        } else if (ext === '.png') {
          sharpInstance = sharpInstance.png({ quality, compressionLevel: 8 });
        } else if (ext === '.webp') {
          sharpInstance = sharpInstance.webp({ quality });
        } else {
          // gif or unsupported format for sharp encoding — skip compression
          continue;
        }

        await sharpInstance.toFile(tempPath);

        fs.unlinkSync(filePath);
        fs.renameSync(tempPath, filePath);

        // reflect the new (compressed) size on the file object
        file.size = fs.statSync(filePath).size;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/* -------------------------------------------------------------------------- */
/*  5. EXPORTS                                                                */
/* -------------------------------------------------------------------------- */

export { upload, compressImage };
export default upload;