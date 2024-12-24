import { type CollectionEntry } from "astro:content";

export type BlogPost = CollectionEntry<"blog">;

export type BlogPostFrontmatter = BlogPost["data"];
