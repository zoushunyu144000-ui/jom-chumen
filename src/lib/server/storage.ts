import { createHash, createHmac, randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
};

const EXT_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_EXT).map(([mime, ext]) => [ext, mime]),
);

export type StoredObject = {
  url: string;
  fileName: string;
  mime: string;
  size: number;
  key: string;
  inlineFallback: boolean;
};

type StorageConfig = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
};

function storageConfig(): StorageConfig | null {
  const endpoint =
    process.env.S3_ENDPOINT ||
    (process.env.R2_ACCOUNT_ID
      ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : "");
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || "";
  const bucket = process.env.S3_BUCKET || process.env.R2_BUCKET || "";
  const publicUrl = process.env.S3_PUBLIC_URL || process.env.R2_PUBLIC_URL || "";
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) return null;
  return {
    endpoint: endpoint.replace(/\/+$/, ""),
    region: process.env.S3_REGION || "auto",
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl: publicUrl.replace(/\/+$/, ""),
  };
}

function isInlineFallbackAllowed() {
  return process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production";
}

function hmac(key: string | Buffer, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function amzDate(now = new Date()) {
  return now.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function encodePath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part).replace(/[!'()*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`))
    .join("/");
}

function inferMime(mime: string, fileName: string) {
  if (mime && mime !== "application/octet-stream") return mime.toLowerCase();
  const ext = fileName.toLowerCase().split(".").pop() || "";
  return EXT_MIME[ext] || mime.toLowerCase();
}

function parseDataUrl(dataUrl: string, fileName: string) {
  const match = /^data:([^;,]*);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) throw new Error("上传内容格式不正确");
  const mime = inferMime(match[1] || "application/octet-stream", fileName);
  if (!MIME_EXT[mime]) throw new Error("不支持这种文件格式");
  const bytes = Buffer.from(match[2], "base64");
  const image = mime.startsWith("image/");
  const max = image ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
  if (!bytes.length || bytes.length > max) {
    throw new Error(image ? "图片太大，请压缩后再上传" : "文件太大，请控制在 5MB 内");
  }
  return { mime, bytes, ext: MIME_EXT[mime] };
}

async function putS3(config: StorageConfig, key: string, mime: string, bytes: Buffer) {
  const target = new URL(config.endpoint);
  const prefix = target.pathname.replace(/\/+$/, "");
  const canonicalUri = `/${encodePath(`${prefix}/${config.bucket}/${key}`)}`;
  target.pathname = canonicalUri;
  target.search = "";

  const stamp = amzDate();
  const date = stamp.slice(0, 8);
  const payloadHash = sha256(bytes);
  const canonicalHeaders =
    `content-type:${mime}\n` +
    `host:${target.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${stamp}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = `PUT\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const scope = `${date}/${config.region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${stamp}\n${scope}\n${sha256(canonicalRequest)}`;
  const kDate = hmac(`AWS4${config.secretAccessKey}`, date);
  const kRegion = hmac(kDate, config.region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(target, {
    method: "PUT",
    headers: {
      Authorization: authorization,
      "Content-Type": mime,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": stamp,
    },
    body: bytes,
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`对象存储上传失败 (${response.status})${detail ? `: ${detail}` : ""}`);
  }
}

function safeKind(raw: string) {
  return raw.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "upload";
}

function publicObjectUrl(base: string, key: string) {
  return `${base}/${encodePath(key)}`;
}

async function storeObject(userId: string, dataUrl: string, fileName: string, kind: string): Promise<StoredObject> {
  const parsed = parseDataUrl(dataUrl, fileName);
  const config = storageConfig();
  if (!config) {
    if (!isInlineFallbackAllowed()) {
      throw new Error("文件上传暂不可用：生产环境尚未配置 R2 / S3 对象存储");
    }
    return {
      url: dataUrl,
      fileName,
      mime: parsed.mime,
      size: parsed.bytes.length,
      key: "",
      inlineFallback: true,
    };
  }

  const now = new Date();
  const folder = `${safeKind(kind)}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const key = `${folder}/${randomUUID()}.${parsed.ext}`;
  await putS3(config, key, parsed.mime, parsed.bytes);
  const url = publicObjectUrl(config.publicUrl, key);

  const sql = await getSql();
  await sql`
    insert into media_objects (id, user_id, object_key, url, file_name, mime_type, file_size, kind)
    values (${randomUUID()}, ${userId}, ${key}, ${url}, ${fileName.slice(0, 160)}, ${parsed.mime}, ${parsed.bytes.length}, ${safeKind(kind)})
  `;

  return {
    url,
    fileName,
    mime: parsed.mime,
    size: parsed.bytes.length,
    key,
    inlineFallback: false,
  };
}

export const uploadMediaObject = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({
      dataUrl: z.string().min(20).max(7_500_000),
      fileName: z.string().max(160).default("upload"),
      kind: z.string().max(40).default("upload"),
    }).parse(data),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => storeObject(context.userId, data.dataUrl, data.fileName, data.kind));
