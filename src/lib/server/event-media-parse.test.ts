import assert from "node:assert/strict";
import test from "node:test";
import {
  countGallery,
  GALLERY_CAPTION,
  isGalleryImage,
  parseMediaProxy,
} from "./event-media-parse.ts";

test("counts gallery blocks including the legacy caption", () => {
  assert.equal(countGallery([]), 0);
  assert.equal(
    countGallery([
      { type: "img", caption: GALLERY_CAPTION },
      { type: "img", caption: "gallery" },
      { type: "img", caption: "现场" },
      { type: "p", caption: GALLERY_CAPTION },
    ]),
    2,
  );
});

test("parseMediaProxy reads cover and gallery indexes", () => {
  assert.equal(parseMediaProxy("https://cdn.example/cover.jpg"), null);
  assert.deepEqual(parseMediaProxy("/api/media/j-abc?kind=cover"), {
    slug: "j-abc",
    kind: "cover",
    n: 0,
  });
  assert.deepEqual(parseMediaProxy("/api/media/j-abc?kind=gallery&n=2"), {
    slug: "j-abc",
    kind: "gallery",
    n: 2,
  });
  assert.equal(isGalleryImage({ type: "img", caption: GALLERY_CAPTION }), true);
  assert.equal(isGalleryImage({ type: "img", caption: "现场" }), false);
});
