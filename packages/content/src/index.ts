export {
  createPostSchema,
  postFrontmatterSchema,
  type PostFrontmatter,
} from "./postSchema";

/** Files inside a post directory that are working notes, not published pages. */
export const NON_POST_FILENAMES = ["notes.mdx", "todo.mdx"] as const;
