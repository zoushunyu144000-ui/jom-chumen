import sharp from "sharp";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export async function normalizeOgJpeg(input: Buffer) {
  return sharp(input, { failOn: "none" })
    .rotate()
    .resize(OG_WIDTH, OG_HEIGHT, {
      fit: "cover",
      position: "centre",
      withoutEnlargement: false,
    })
    .flatten({ background: "#f4f3ee" })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}

export async function makeBrandOgJpeg(title: string) {
  const safeTitle = escapeXml(title || "JOM 出门局").slice(0, 80);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}">
      <rect width="100%" height="100%" fill="#f4f3ee"/>
      <rect x="72" y="72" width="150" height="54" rx="27" fill="#d9ff3f"/>
      <text x="147" y="108" text-anchor="middle" font-family="Arial, sans-serif" font-size="27" font-weight="700" fill="#151611">JOM</text>
      <text x="72" y="280" font-family="Arial, sans-serif" font-size="68" font-weight="700" fill="#151611">JOM 出门局</text>
      <text x="72" y="385" font-family="Arial, sans-serif" font-size="46" font-weight="600" fill="#151611">${safeTitle}</text>
      <text x="72" y="520" font-family="Arial, sans-serif" font-size="28" fill="#62645d">一起出门，认识真实的人。</text>
    </svg>`;
  return normalizeOgJpeg(Buffer.from(svg));
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
