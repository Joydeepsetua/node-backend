import multer from 'multer';
import { Request } from 'express';

const memoryStorage = multer.memoryStorage();

// Allowed image MIME types
const allowedImageTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/x-icon',
];

const imageUploadMiddleware = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP, SVG, BMP, TIFF, ICO)!'));
    }
  },
}).single('profilePicture'); // Use single() for one file with field name 'profilePicture'

export default imageUploadMiddleware;