import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { makeBrandOgJpeg, normalizeOgJpeg, OG_HEIGHT, OG_WIDTH } from "./og-image.ts";

test("OG 图片总是标准 1200x630 JPEG", async () => {
  const png = await sharp({
    create: { width: 400, height: 900, channels: 4, background: "#ffffff" },
  }).png().toBuffer();
  const jpeg = await normalizeOgJpeg(png);
  const meta = await sharp(jpeg).metadata();
  assert.equal(meta.format, "jpeg");
  assert.equal(meta.width, OG_WIDTH);
  assert.equal(meta.height, OG_HEIGHT);
});

test("无封面时品牌兜底图也是标准 JPEG", async () => {
  const jpeg = await makeBrandOgJpeg("MBTI 夜谈 <script>alert(1)</script>");
  const meta = await sharp(jpeg).metadata();
  assert.equal(meta.format, "jpeg");
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 630);
});
