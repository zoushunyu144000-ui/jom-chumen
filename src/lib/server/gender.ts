import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { ensureAppSchema } from "@/lib/server/schema";

export const saveGender = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ gender: z.enum(["female", "male", "other", ""]) }).parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await ensureAppSchema();
    const sql = await getSql();
    await sql`
      insert into profiles (user_id, display_name, avatar_url, tags, gender, updated_at)
      values (${context.userId}, ${""}, ${""}, ${"[]"}, ${data.gender}, now())
      on conflict (user_id) do update set gender = excluded.gender, updated_at = now()
    `;
  });
