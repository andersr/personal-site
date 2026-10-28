import { z } from "zod";

/**
 * Builds the blog post frontmatter schema. `heroImageSchema` is injected because
 * the site validates hero images with Astro's `image()` helper, which only exists
 * inside an Astro content collection; other consumers (e.g. the admin) can pass
 * `z.string()` to accept the relative path as written in the frontmatter.
 */
export function createPostSchema<TImage extends z.ZodType>(
  heroImageSchema: TImage,
) {
  return z.object({
    title: z.string(),
    description: z.string(),
    isDraft: z.boolean().optional(),
    notes: z.boolean().optional(),
    toc: z.boolean().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.tuple([heroImageSchema, z.string()]).optional(), // [image, alt]
    heroImageCredit: z
      .tuple([z.string(), z.union([z.literal(""), z.url().trim()])])
      .optional(), // [credit name, credit link OR ""]
    seriesName: z.string().optional(),
    seriesSlug: z.string().optional(),
    seriesInfo: z
      .tuple([z.string(), z.string()]) // [series name, series slug]
      .optional(),
    repo: z.string().optional(),
    shareLinks: z
      .tuple([
        z.url({ hostname: /^bsky\.app$/ }),
        z.url({ hostname: /^(www\.)?threads\.net$/ }),
      ])
      .optional(),
  });
}

/** Frontmatter schema with `heroImage` kept as the relative path string. */
export const postFrontmatterSchema = createPostSchema(z.string());

export type PostFrontmatter = z.infer<typeof postFrontmatterSchema>;
