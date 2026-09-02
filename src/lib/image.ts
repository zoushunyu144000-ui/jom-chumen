export type CompressOptions = {
  maxEdge?: number;
  quality?: number;
  format?: "jpeg" | "png";
  maxChars?: number;
};

export async function compressImage(
  file: File,
  maxEdgeOrOpts: number | CompressOptions = 1400,
  qualityArg = 0.82,
): Promise<string> {
  const opts: CompressOptions =
    typeof maxEdgeOrOpts === "number"
      ? { maxEdge: maxEdgeOrOpts, quality: qualityArg, format: "jpeg" }
      : maxEdgeOrOpts;
  const maxEdge = opts.maxEdge ?? 1400;
  const quality = opts.quality ?? 0.82;
  const format = opts.format ?? "jpeg";
  const maxChars = opts.maxChars ?? (format === "png" ? 650_000 : 900_000);

  const source = await loadImage(file);
  const srcW =
    "naturalWidth" in source && source.naturalWidth
      ? source.naturalWidth
      : source.width;
  const srcH =
    "naturalHeight" in source && source.naturalHeight
      ? source.naturalHeight
      : source.height;
  if (!srcW || !srcH) throw new Error("无法读取这张图，请先截图再上传");

  let edge = Math.min(maxEdge, Math.max(srcW, srcH));
  let data = draw(source, srcW, srcH, edge, format, quality);
  let guard = 0;
  while (data.length > maxChars && edge > 180 && guard < 8) {
    edge = Math.round(edge * 0.78);
    const q = format === "jpeg" ? Math.max(0.5, quality - guard * 0.08) : quality;
    data = draw(source, srcW, srcH, edge, format, q);
    guard += 1;
  }
  if ("close" in source && typeof source.close === "function") source.close();
  if (data.length > 1_200_000) throw new Error("图片太大，请换一张或先截图");
  return data;
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* HEIC / some Android albums fail here */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await loadHtmlImage(url);
  } catch {
    URL.revokeObjectURL(url);
    const fallback = await readFileDataUrl(file);
    return loadHtmlImage(fallback);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadHtmlImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("无法读取这张图，请先截图再上传"));
    img.src = src;
  });
}

function readFileDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("无法读取这张图，请先截图再上传"));
    };
    reader.onerror = () => reject(new Error("无法读取这张图，请先截图再上传"));
    reader.readAsDataURL(file);
  });
}

function draw(
  source: ImageBitmap | HTMLImageElement,
  srcW: number,
  srcH: number,
  maxEdge: number,
  format: "jpeg" | "png",
  quality: number,
) {
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法处理图片");
  if (format === "jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(source, 0, 0, width, height);
  return format === "png"
    ? canvas.toDataURL("image/png")
    : canvas.toDataURL("image/jpeg", quality);
}
