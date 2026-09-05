import { compressImageFile } from './imageCompressor';
import { compressPdfFile } from './pdfCompressor';

async function performUpload(fileToUpload: File): Promise<{ ok: boolean; status: number; text: string; data?: any }> {
  const formData = new FormData();
  formData.append('file', fileToUpload);

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    const text = await res.text();
    let data: any = null;
    try {
      if (text && text.trim().startsWith('{')) {
        data = JSON.parse(text);
      }
    } catch {}

    return {
      ok: res.ok,
      status: res.status,
      text,
      data
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      text: err.message || 'Network error'
    };
  }
}

async function uploadBase64ToServer(fileToUpload: File): Promise<{ ok: boolean; status: number; text: string; data?: any }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await fetch('/api/upload-base64', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64,
            filename: fileToUpload.name,
            mimetype: fileToUpload.type || (fileToUpload.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
          })
        });
        const text = await res.text();
        let data: any = null;
        try {
          if (text && text.trim().startsWith('{')) {
            data = JSON.parse(text);
          }
        } catch {}

        resolve({
          ok: res.ok,
          status: res.status,
          text,
          data
        });
      } catch (err: any) {
        resolve({
          ok: false,
          status: 0,
          text: err.message || 'Network error'
        });
      }
    };
    reader.onerror = () => {
      resolve({
        ok: false,
        status: 0,
        text: 'Failed to read file from browser memory'
      });
    };
    reader.readAsDataURL(fileToUpload);
  });
}

export async function uploadFileToServer(
  file: File, 
  maxMB: number = 50,
  options?: { autoCompress?: boolean }
): Promise<{ url: string; filename: string; size: string }> {
  const ONE_MB = 1024 * 1024;
  const maxSizeBytes = maxMB * ONE_MB;

  if (file.size > maxSizeBytes) {
    const sizeInMB = (file.size / ONE_MB).toFixed(2);
    throw new Error(`⚠️ File Size Warning: Uploaded file is ${sizeInMB} MB. Maximum allowed limit is ${maxMB} MB! (फाइल साइज़ ${sizeInMB} MB है, जो ${maxMB} MB की सीमा से अधिक है).`);
  }

  // Upload original file directly as-is with 100% original quality
  let fileToUpload = file;
  
  // Only compress if explicitly requested via options.autoCompress === true
  if (options?.autoCompress) {
    try {
      if (file.type && file.type.startsWith('image/')) {
        const comp = await compressImageFile(file, { maxWidth: 2200, maxHeight: 2200, quality: 0.88 });
        if (comp && comp.file && comp.file.size < file.size) {
          fileToUpload = comp.file;
        }
      } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const comp = await compressPdfFile(file, { qualityPreset: 'high' });
        if (comp && comp.file && comp.file.size < file.size) {
          fileToUpload = comp.file;
        }
      }
    } catch (e) {
      console.warn('Optional compression skipped, using original file:', e);
    }
  }

  // Try direct multipart upload first if file is small (< 1.5MB), or use base64 upload for larger files
  let uploadResult: { ok: boolean; status: number; text: string; data?: any };
  
  if (fileToUpload.size > 1.5 * ONE_MB) {
    uploadResult = await uploadBase64ToServer(fileToUpload);
  } else {
    uploadResult = await performUpload(fileToUpload);
    // If multipart upload failed due to size / 413 / proxy limits, seamlessly retry with base64 upload
    if (!uploadResult.ok && (uploadResult.status === 413 || uploadResult.status === 0 || uploadResult.text.toLowerCase().includes('too large'))) {
      uploadResult = await uploadBase64ToServer(fileToUpload);
    }
  }

  if (!uploadResult.ok) {
    let errorMsg = `Upload failed (Status ${uploadResult.status}).`;
    if (uploadResult.data && uploadResult.data.error) {
      errorMsg = uploadResult.data.error;
    } else if (uploadResult.status === 413 || uploadResult.text.toLowerCase().includes('too large')) {
      errorMsg = `File is too large for your server limit (${(file.size / ONE_MB).toFixed(1)} MB). Maximum allowed limit is ${maxMB} MB.`;
    } else if (uploadResult.status === 0) {
      errorMsg = 'Network error during upload. Please check your internet connection or server status.';
    }
    throw new Error(errorMsg);
  }

  const data = uploadResult.data || {};
  const fileSizeStr = fileToUpload.size > 1024 * 1024 
    ? (fileToUpload.size / (1024 * 1024)).toFixed(2) + ' MB'
    : (fileToUpload.size / 1024).toFixed(1) + ' KB';

  return {
    url: data.url,
    filename: data.originalname || file.name,
    size: fileSizeStr
  };
}




