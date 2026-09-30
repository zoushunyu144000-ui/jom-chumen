type QueryEventRows = (text: string, params: unknown[]) => Promise<Array<{ slug: string }>>;

const demoEventMediaRepairs = [
  [
    "demo-penang-ai-coffee",
    "/covers/demo-penang-coffee.jpg",
    "/covers/demo-penang-coffee-2.jpg",
    "/covers/demo-penang-coffee-3.jpg",
  ],
  [
    "demo-kl-ai-meetup",
    "/covers/demo-kl-ai.jpg",
    "/covers/demo-kl-ai-2.jpg",
    "/covers/demo-kl-ai-3.jpg",
  ],
  [
    "demo-kl-creative-coffee",
    "/covers/demo-kl-coffee.jpg",
    "/covers/demo-kl-coffee-2.jpg",
    "/covers/demo-kl-coffee-3.jpg",
  ],
] as const;

const fixPlaceholders = demoEventMediaRepairs.map((_, index) => {
  const first = index * 4 + 1;
  return `($${first}::text, $${first + 1}::text, $${first + 2}::text, $${first + 3}::text)`;
});

export async function repairDemoEventCover(query: QueryEventRows, slug: string) {
  const repair = demoEventMediaRepairs.find(([targetSlug]) => targetSlug === slug);
  if (!repair) return [];

  return query(
    `update events
     set cover_url = $2
     where slug = $1 and cover_url is distinct from $2
     returning slug`,
    [repair[0], repair[1]],
  );
}

export async function repairDemoEventMedia(query: QueryEventRows) {
  const coverUpdates: Array<{ slug: string }> = [];
  for (const [slug] of demoEventMediaRepairs) {
    coverUpdates.push(...(await repairDemoEventCover(query, slug)));
  }

  const values = demoEventMediaRepairs.flatMap((repair) => [...repair]);
  const mediaUpdates = await query(
    `
      with fixes (slug, cover_url, gallery_one, gallery_two) as (
        values ${fixPlaceholders.join(",\n               ")}
      ), parsed_events as (
        select
          e.slug,
          e.cover_url as existing_cover_url,
          e.body as existing_body,
          e.gallery_count as existing_gallery_count,
          fixes.cover_url,
          fixes.gallery_one,
          fixes.gallery_two,
          case
            when jsonb_typeof(nullif(btrim(e.body), '')::jsonb) = 'array'
              then nullif(btrim(e.body), '')::jsonb
            else '[]'::jsonb
          end as blocks
        from events as e
        join fixes on fixes.slug = e.slug
      ), gallery_status as (
        select
          parsed_events.*,
          gallery.image_count,
          gallery.distinct_image_count,
          gallery.image_count < 2
            or gallery.image_count <> gallery.distinct_image_count as gallery_needs_repair
        from parsed_events
        cross join lateral (
          select
            count(*)::int as image_count,
            count(distinct image.value ->> 'src')::int as distinct_image_count
          from jsonb_array_elements(parsed_events.blocks) as image(value)
          where image.value ->> 'type' = 'img'
            and image.value ->> 'caption' in ('__gallery__', 'gallery')
        ) as gallery
      ), repairs as (
        select
          gallery_status.*,
          case
            when gallery_needs_repair then (
              select (
                coalesce(
                  jsonb_agg(block.value order by block.ordinality) filter (
                    where not coalesce(
                      block.value ->> 'type' = 'img'
                      and block.value ->> 'caption' in ('__gallery__', 'gallery'),
                      false
                    )
                  ),
                  '[]'::jsonb
                ) || jsonb_build_array(
                  jsonb_build_object('type', 'img', 'src', gallery_status.gallery_one, 'caption', '__gallery__'),
                  jsonb_build_object('type', 'img', 'src', gallery_status.gallery_two, 'caption', '__gallery__')
                )
              )::text
              from jsonb_array_elements(gallery_status.blocks) with ordinality as block(value, ordinality)
            )
            else existing_body
          end as next_body,
          case when gallery_needs_repair then 2 else image_count end as next_gallery_count
        from gallery_status
        where existing_cover_url is distinct from cover_url
          or existing_gallery_count is distinct from case when gallery_needs_repair then 2 else image_count end
          or gallery_needs_repair
      )
      update events as e
      set cover_url = repairs.cover_url,
          body = repairs.next_body,
          gallery_count = repairs.next_gallery_count
      from repairs
      where e.slug = repairs.slug
      returning e.slug
    `,
    values,
  );
  return [...new Map([...coverUpdates, ...mediaUpdates].map((row) => [row.slug, row])).values()];
}
