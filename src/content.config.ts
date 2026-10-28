import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";

const blog = defineCollection({
  // Load Markdown and MDX files in the `src/content/blog/` directory.
  loader: glob({
    base: "./src/content/blog",
    pattern: ["!**/notes.mdx", "!**/todo.mdx", "**/*.mdx"],
  }),
  // Type-check frontmatter using a schema
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      isDraft: z.boolean().optional(),
      notes: z.boolean().optional(),
      toc: z.boolean().optional(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: z.tuple([image(), z.string()]).optional(), // [image, alt]
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
    }),
});

export const collections = { blog };
