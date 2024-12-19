import { z, type CollectionEntry } from "astro:content";

export const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  draft: z.boolean().optional(),
  toc: z.boolean().optional(),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  heroImage: z.tuple([z.string().startsWith("/"), z.string()]).optional(),
});

export type BlogPost = CollectionEntry<"blog">;
