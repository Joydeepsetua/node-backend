import sharp from 'sharp';

async function compressImage(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .resize({
      width: 1080,        // optional (resize for optimization)
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 70,        // adjust (60–80 recommended)
      mozjpeg: true,
    })
    .toBuffer();
}

export default compressImage;

