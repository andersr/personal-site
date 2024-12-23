import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  // Load Markdown and MDX files in the `src/content/blog/` directory.
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  // Type-check frontmatter using a schema
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      isDraft: z.boolean().optional(),
      toc: z.boolean().optional(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: z.tuple([image(), z.string()]).optional(), // [image, alt]
      heroImageCredit: z
        .tuple([z.string(), z.union([z.literal(""), z.string().trim().url()])])
        .optional(), // [credit name, credit link OR ""]
    }),
});

export const collections = { blog };
