import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { blogSchema } from "./types/BlogPost";

const blog = defineCollection({
  // Load Markdown and MDX files in the `src/content/blog/` directory.
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  // Type-check frontmatter using a schema
  schema: blogSchema,
});

export const collections = { blog };
