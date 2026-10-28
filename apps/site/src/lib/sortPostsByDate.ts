import type { BlogPost } from "~/types/BlogPost";

// Ties broken by id so same-day posts don't depend on collection load order
export const sortPostsByDate = (a: BlogPost, b: BlogPost) =>
  b.data.pubDate.valueOf() - a.data.pubDate.valueOf() ||
  a.id.localeCompare(b.id);
