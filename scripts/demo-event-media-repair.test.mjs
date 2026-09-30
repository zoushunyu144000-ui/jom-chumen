import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("repairs only the three demo covers and galleries, and is repeatable", async () => {
  let repairModule;
  try {
    repairModule = await import("../src/lib/server/event-media-repair.ts");
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
  }

  assert.equal(
    typeof repairModule?.repairDemoEventMedia,
    "function",
    "a targeted event media repair should be available",
  );
  assert.equal(
    typeof repairModule?.repairDemoEventCover,
    "function",
    "cover reads should be able to repair their exact database row",
  );

  const db = new PGlite();
  try {
    await db.exec(`
      create table events (
        slug text primary key,
        cover_url text not null,
        body text not null default '[]',
        gallery_count int not null default 0
      );
      insert into events (slug, cover_url, body, gallery_count) values
        ('demo-penang-ai-coffee', '/covers/shared.jpg', '[{"type":"p","text":"keep this"},{"type":"img","src":"/old.jpg","caption":"__gallery__"}]', 1),
        ('demo-kl-ai-meetup', '/covers/shared.jpg', '[{"type":"img","src":"/old.jpg","caption":"gallery"},{"type":"img","src":"/old.jpg","caption":"gallery"}]', 2),
        ('demo-kl-creative-coffee', '/covers/shared.jpg', '[{"type":"img","src":"/existing-a.jpg","caption":"__gallery__"},{"type":"img","src":"/existing-b.jpg","caption":"__gallery__"}]', 2),
        ('other-event', '/covers/other.jpg', '[{"type":"p","text":"leave this alone"}]', 0);
    `);

    const query = (sql, params) => db.query(sql, params).then((result) => result.rows);
    const coverUpdates = await repairModule.repairDemoEventCover(query, "demo-penang-ai-coffee");
    assert.deepEqual(
      coverUpdates.map((row) => row.slug),
      ["demo-penang-ai-coffee"],
    );
    assert.deepEqual(
      await repairModule.repairDemoEventCover(query, "other-event"),
      [],
      "non-target event covers must remain untouched",
    );
    const updated = await repairModule.repairDemoEventMedia(query);
    assert.deepEqual(updated.map((row) => row.slug).sort(), [
      "demo-kl-ai-meetup",
      "demo-kl-creative-coffee",
      "demo-penang-ai-coffee",
    ]);

    const rows = await db.query(
      "select slug, cover_url, body, gallery_count from events order by slug",
    );
    const bySlug = new Map(rows.rows.map((row) => [row.slug, row]));
    const expected = {
      "demo-penang-ai-coffee": [
        "/covers/demo-penang-coffee-2.jpg",
        "/covers/demo-penang-coffee-3.jpg",
      ],
      "demo-kl-ai-meetup": ["/covers/demo-kl-ai-2.jpg", "/covers/demo-kl-ai-3.jpg"],
      "demo-kl-creative-coffee": ["/existing-a.jpg", "/existing-b.jpg"],
    };

    for (const [slug, gallerySources] of Object.entries(expected)) {
      const row = bySlug.get(slug);
      assert.equal(row.gallery_count, 2);
      const gallery = JSON.parse(row.body).filter(
        (block) => block.type === "img" && ["__gallery__", "gallery"].includes(block.caption),
      );
      assert.deepEqual(
        gallery.map((block) => block.src),
        gallerySources,
      );
    }
    assert.equal(bySlug.get("demo-penang-ai-coffee").cover_url, "/covers/demo-penang-coffee.jpg");
    assert.equal(bySlug.get("demo-kl-ai-meetup").cover_url, "/covers/demo-kl-ai.jpg");
    assert.equal(bySlug.get("demo-kl-creative-coffee").cover_url, "/covers/demo-kl-coffee.jpg");
    assert.deepEqual(JSON.parse(bySlug.get("demo-penang-ai-coffee").body)[0], {
      type: "p",
      text: "keep this",
    });
    assert.deepEqual(JSON.parse(bySlug.get("demo-kl-creative-coffee").body), [
      { type: "img", src: "/existing-a.jpg", caption: "__gallery__" },
      { type: "img", src: "/existing-b.jpg", caption: "__gallery__" },
    ]);
    assert.equal(bySlug.get("other-event").cover_url, "/covers/other.jpg");
    assert.equal(bySlug.get("other-event").body, '[{"type":"p","text":"leave this alone"}]');

    assert.deepEqual(await repairModule.repairDemoEventMedia(query), []);
  } finally {
    await db.close();
  }
});
