import {
  BLOG_CONTENT_DIR,
  NON_POST_FILENAMES,
  type PostFrontmatter,
  postFrontmatterSchema,
} from "@repo/content";
import { type Document, parseDocument, parse as parseYaml } from "yaml";
import { z } from "zod";
import { getOctokit, type Repo, siteRepo } from "./github.server";
import type { PostSummary } from "./posts";

type BlobText = { text?: string | null };
type TreeEntry = {
  name: string;
  type: "blob" | "tree" | "commit";
  object:
    (BlobText & { entries?: { name: string; object: BlobText }[] }) | null;
};
type PostsQuery = {
  repository: { object: { entries?: TreeEntry[] } | null } | null;
};

// Two levels deep in one request: top-level `<slug>.mdx` files plus
// `<slug>/index.mdx`. Non-blob objects (e.g. `assets/`) come back empty.
const POSTS_QUERY = /* GraphQL */ `
  query ($owner: String!, $repo: String!, $expression: String!) {
    repository(owner: $owner, name: $repo) {
      object(expression: $expression) {
        ... on Tree {
          entries {
            name
            type
            object {
              ... on Blob {
                text
              }
              ... on Tree {
                entries {
                  name
                  object {
                    ... on Blob {
                      text
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

export type ParsedPostSource =
  | { ok: true; frontmatter: PostFrontmatter; body: string }
  | { ok: false; error: string };

/** Splits an `.mdx` file into validated frontmatter and body. */
export function parsePostSource(text: string): ParsedPostSource {
  const match = text.match(FRONTMATTER);
  if (!match) return { ok: false, error: "No frontmatter block" };
  const body = text.slice(match[0].length).replace(/^(\r?\n)+/, "");
  try {
    const result = postFrontmatterSchema.safeParse(parseYaml(match[1]));
    return result.success
      ? { ok: true, frontmatter: result.data, body }
      : { ok: false, error: z.prettifyError(result.error) };
  } catch (error) {
    return { ok: false, error: `Invalid YAML: ${String(error)}` };
  }
}

/** Today as `YYYY-MM-DD` (UTC), the format posts use for `pubDate`. */
export const today = () => new Date().toISOString().slice(0, 10);

/**
 * Rewrites a post's frontmatter through yaml's Document API, which keeps
 * existing key order and formatting. Optionally replaces the body too.
 */
export function editPostSource(
  text: string,
  edit: (frontmatter: Document) => void,
  body?: string,
): string {
  const match = text.match(FRONTMATTER);
  const doc = parseDocument(match?.[1] ?? "");
  edit(doc);
  const oldBody = match
    ? text.slice(match[0].length).replace(/^(\r?\n)+/, "")
    : text;
  // lineWidth 0: don't re-fold long values the author wrote on one line
  return `---\n${doc.toString({ lineWidth: 0 })}---\n\n${(body ?? oldBody).trim()}\n`;
}

function parsePost(slug: string, path: string, text: string): PostSummary {
  const parsed = parsePostSource(text);
  return parsed.ok
    ? { slug, path, ok: true, frontmatter: parsed.frontmatter }
    : { slug, path, ok: false, error: parsed.error };
}

function toPost(dir: string, entry: TreeEntry): PostSummary | undefined {
  const isNonPost = (NON_POST_FILENAMES as readonly string[]).includes(
    entry.name,
  );
  if (entry.type === "blob" && entry.name.endsWith(".mdx") && !isNonPost) {
    const slug = entry.name.replace(/\.mdx$/, "");
    return parsePost(slug, `${dir}/${entry.name}`, entry.object?.text ?? "");
  }
  if (entry.type === "tree") {
    const index = entry.object?.entries?.find((e) => e.name === "index.mdx");
    if (index) {
      const path = `${dir}/${entry.name}/index.mdx`;
      return parsePost(entry.name, path, index.object.text ?? "");
    }
  }
  return undefined;
}

/**
 * Posts in `dir` on `repo`'s default branch, newest first; ones with invalid
 * frontmatter sort first.
 */
export async function listPostsIn(
  repo: Repo,
  dir: string,
): Promise<PostSummary[]> {
  const octokit = await getOctokit(repo);
  const result = await octokit.graphql<PostsQuery>(POSTS_QUERY, {
    ...repo,
    expression: `HEAD:${dir}`,
  });
  const entries = result.repository?.object?.entries ?? [];

  return entries
    .map((entry) => toPost(dir, entry))
    .filter((post) => post !== undefined)
    .sort((a, b) => {
      if (!a.ok || !b.ok) return Number(a.ok) - Number(b.ok);
      return b.frontmatter.pubDate.getTime() - a.frontmatter.pubDate.getTime();
    });
}

/** Published posts on the site repo. */
export const listPosts = () => listPostsIn(siteRepo(), BLOG_CONTENT_DIR);

export type PostSource = { path: string; text: string; sha: string };

/** Reads a file's text and blob SHA (needed to update it). */
export async function readRepoFile(
  repo: Repo,
  path: string,
): Promise<PostSource | undefined> {
  const octokit = await getOctokit(repo);
  try {
    const { data } = await octokit.rest.repos.getContent({ ...repo, path });
    if (Array.isArray(data) || data.type !== "file") return undefined;
    const text = Buffer.from(data.content, "base64").toString("utf8");
    return { path, text, sha: data.sha };
  } catch (error) {
    if ((error as { status?: number }).status === 404) return undefined;
    throw error;
  }
}

/** A published post's source: `<slug>/index.mdx` or a top-level `<slug>.mdx`. */
export async function getPostSource(slug: string) {
  return (
    (await readRepoFile(siteRepo(), `${BLOG_CONTENT_DIR}/${slug}/index.mdx`)) ??
    (await readRepoFile(siteRepo(), `${BLOG_CONTENT_DIR}/${slug}.mdx`))
  );
}
