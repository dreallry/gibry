import { auth } from './firebase';

export function compressImageToBase64(file: Blob, maxWidth = 300, maxHeight = 300, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      reject(new Error('Gunakan gambar JPG, PNG, atau WebP maksimal 5 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Gambar tidak valid.'));
      img.onload = () => {
        try {
          const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Browser tidak dapat memproses gambar.');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (error) { reject(error); }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadProfilePhoto(uid: string, fileOrDataUrl: File | Blob | string): Promise<string> {
  if (uid !== auth.currentUser?.uid) throw new Error('Foto bukan milik akun yang sedang login.');
  if (typeof fileOrDataUrl === 'string' && /^https:\/\//.test(fileOrDataUrl)) return fileOrDataUrl;
  let file: Blob;
  if (typeof fileOrDataUrl === 'string') {
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(fileOrDataUrl) || fileOrDataUrl.length > 7 * 1024 * 1024) throw new Error('Data gambar tidak valid.');
    file = await (await fetch(fileOrDataUrl)).blob();
  } else file = fileOrDataUrl;
  // Spark has no Storage bucket; a small avatar fits in the existing profile record.
  const photo = await compressImageToBase64(file, 160, 160, 0.65);
  if (photo.length > 24576) throw new Error('Foto terlalu besar. Pilih gambar yang lebih sederhana.');
  return photo;
}
