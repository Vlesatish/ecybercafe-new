export async function uploadFileToServer(file: File, maxMB: number = 50): Promise<{ url: string; filename: string; size: string }> {
  const maxSizeBytes = maxMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    throw new Error(`⚠️ File Size Warning: Uploaded file is ${sizeInMB} MB. Maximum allowed limit is ${maxMB} MB! (फाइल साइज़ ${sizeInMB} MB है, जो ${maxMB} MB की सीमा से अधिक है).`);
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    let errorMsg = 'Failed to upload file.';
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch (e) {}
    throw new Error(errorMsg);
  }

  const data = await res.json();
  const fileSizeStr = file.size > 1024 * 1024 
    ? (file.size / (1024 * 1024)).toFixed(2) + ' MB'
    : (file.size / 1024).toFixed(1) + ' KB';

  return {
    url: data.url,
    filename: data.originalname || file.name,
    size: fileSizeStr
  };
}
