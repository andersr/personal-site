import { z, type CollectionEntry } from "astro:content";

export const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  // Transform string to Date object
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  heroImage: z.string().optional(),
});

export type BlogPost = CollectionEntry<"blog">;
