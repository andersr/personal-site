import type { BlogPost } from "~/types/BlogPost";

export const sortPostsByDate = (a: BlogPost, b: BlogPost) =>
  b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
