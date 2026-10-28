export {
  createPostSchema,
  postFrontmatterSchema,
  type PostFrontmatter,
} from "./postSchema";

/** Blog post directory, relative to the repo root. */
export const BLOG_CONTENT_DIR = "apps/site/src/content/blog";

/** Files inside a post directory that are working notes, not published pages. */
export const NON_POST_FILENAMES = ["notes.mdx", "todo.mdx"] as const;
