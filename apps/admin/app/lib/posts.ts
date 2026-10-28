import type { PostFrontmatter } from "@repo/content";

/** Branch prefix for drafts created by the admin; each draft is a PR from one. */
export const POST_BRANCH_PREFIX = "post/";

export type PostSummary = { slug: string; path: string } & (
  { ok: true; frontmatter: PostFrontmatter } | { ok: false; error: string }
);

export type PostPullRequest = {
  number: number;
  title: string;
  url: string;
  branch: string;
  updatedAt: string;
};
