import {
  BLOG_CONTENT_DIR,
  NON_POST_FILENAMES,
  postFrontmatterSchema,
} from "@repo/content";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { getRepo, getRepoOctokit } from "./github.server";
import {
  POST_BRANCH_PREFIX,
  type PostPullRequest,
  type PostSummary,
} from "./posts";

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

function parsePost(slug: string, path: string, text: string): PostSummary {
  const yaml = text.match(FRONTMATTER)?.[1];
  if (yaml === undefined) {
    return { slug, path, ok: false, error: "No frontmatter block" };
  }
  try {
    const result = postFrontmatterSchema.safeParse(parseYaml(yaml));
    return result.success
      ? { slug, path, ok: true, frontmatter: result.data }
      : { slug, path, ok: false, error: z.prettifyError(result.error) };
  } catch (error) {
    return { slug, path, ok: false, error: `Invalid YAML: ${String(error)}` };
  }
}

function toPost(entry: TreeEntry): PostSummary | undefined {
  const isNonPost = (NON_POST_FILENAMES as readonly string[]).includes(
    entry.name,
  );
  if (entry.type === "blob" && entry.name.endsWith(".mdx") && !isNonPost) {
    const slug = entry.name.replace(/\.mdx$/, "");
    return parsePost(
      slug,
      `${BLOG_CONTENT_DIR}/${entry.name}`,
      entry.object?.text ?? "",
    );
  }
  if (entry.type === "tree") {
    const index = entry.object?.entries?.find((e) => e.name === "index.mdx");
    if (index) {
      const path = `${BLOG_CONTENT_DIR}/${entry.name}/index.mdx`;
      return parsePost(entry.name, path, index.object.text ?? "");
    }
  }
  return undefined;
}

/** Posts on the default branch; ones with invalid frontmatter sort first. */
export async function listPosts(): Promise<PostSummary[]> {
  const octokit = await getRepoOctokit();
  const result = await octokit.graphql<PostsQuery>(POSTS_QUERY, {
    ...getRepo(),
    expression: `HEAD:${BLOG_CONTENT_DIR}`,
  });
  const entries = result.repository?.object?.entries ?? [];

  return entries
    .map(toPost)
    .filter((post) => post !== undefined)
    .sort((a, b) => {
      if (!a.ok || !b.ok) return Number(a.ok) - Number(b.ok);
      return b.frontmatter.pubDate.getTime() - a.frontmatter.pubDate.getTime();
    });
}

export async function listPostPullRequests(): Promise<PostPullRequest[]> {
  const octokit = await getRepoOctokit();
  const { data } = await octokit.rest.pulls.list({
    ...getRepo(),
    state: "open",
    per_page: 100,
  });

  return data
    .filter((pr) => pr.head.ref.startsWith(POST_BRANCH_PREFIX))
    .map((pr) => ({
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      branch: pr.head.ref,
      updatedAt: pr.updated_at,
    }));
}
