export async function compressImage(
  file: File,
  maxEdge = 1400,
  quality = 0.82,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法处理图片");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  let q = quality;
  let data = canvas.toDataURL("image/jpeg", q);
  while (data.length > 900_000 && q > 0.45) {
    q -= 0.1;
    data = canvas.toDataURL("image/jpeg", q);
  }
  if (data.length > 1_200_000) throw new Error("图片太大，请换一张");
  return data;
}
