import type { UIMessage } from "ai";
import type { PostFrontmatter } from "@repo/content";

export const SITE_URL = "https://www.anders.co";

export type PostSummary = { slug: string; path: string } & (
  { ok: true; frontmatter: PostFrontmatter } | { ok: false; error: string }
);

export type Draft = {
  slug: string;
  title: string;
  path: string;
  /** Blob SHA of `index.mdx`; required to save over it. */
  sha: string;
  text: string;
};

/** Messages streamed from the draft-writing agent routes to `useChat`. */
export type DraftAgentMessage = UIMessage<
  never,
  {
    draft: { slug: string };
    saved: { sha: string };
    /** The generated post, when committing it failed. */
    unsaved: { text: string };
  },
  {
    listPosts: { input: Record<string, never>; output: unknown };
    readPost: { input: { slug: string }; output: string };
  }
>;
