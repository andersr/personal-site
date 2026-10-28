import { createPostSchema, NON_POST_FILENAMES } from "@repo/content";
import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";

const blog = defineCollection({
  // Load Markdown and MDX files in the `src/content/blog/` directory.
  loader: glob({
    base: "./src/content/blog",
    pattern: [...NON_POST_FILENAMES.map((f) => `!**/${f}`), "**/*.mdx"],
  }),
  // Type-check frontmatter using the schema shared with the admin
  schema: ({ image }) => createPostSchema(image()),
});

export const collections = { blog };
