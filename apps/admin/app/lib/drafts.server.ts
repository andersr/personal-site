import { BLOG_CONTENT_DIR } from "@repo/content";
import { data } from "react-router";
import { getEnv } from "./env.server";
import { draftsRepo, getOctokit, type Repo, siteRepo } from "./github.server";
import type { PostDraft } from "./postAgent.server";
import type { Draft } from "./posts";
import {
  editPostSource,
  getPostSource,
  listPostsIn,
  parsePostSource,
  readRepoFile,
  today,
} from "./posts.server";

/** Drafts live at `drafts/<slug>/index.mdx` (plus `assets/`) in the drafts repo. */
const DRAFTS_DIR = "drafts";
const draftDir = (slug: string) => `${DRAFTS_DIR}/${slug}`;
const draftPath = (slug: string) => `${draftDir(slug)}/index.mdx`;

/** Name of the site repo branch that Vercel builds with drafts included. */
const PREVIEW_BRANCH = "preview";

/** A failure worth showing the user as-is (bad input, conflicts). */
export class DraftError extends Error {}

const status = (error: unknown) => (error as { status?: number }).status;

const toBase64 = (text: string) => Buffer.from(text, "utf8").toString("base64");

/** Slugs come from URLs, so reject anything that could escape the draft's directory. */
function assertSlug(slug: string | undefined): asserts slug is string {
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw data("Draft not found", { status: 404 });
  }
}

function assertValid(text: string) {
  const parsed = parsePostSource(text);
  if (!parsed.ok) throw new DraftError(`Invalid frontmatter:\n${parsed.error}`);
}

/** Frontmatter fields the agent controls, applied over whatever is already there. */
function applyDraft(text: string, draft: PostDraft) {
  return editPostSource(
    text,
    (doc) => {
      doc.set("title", draft.title);
      doc.set("description", draft.description);
      if (draft.toc) doc.set("toc", true);
      else doc.delete("toc");
      if (draft.series) {
        doc.set("seriesInfo", [draft.series.name, draft.series.slug]);
      } else doc.delete("seriesInfo");
    },
    draft.body,
  );
}

type TreeChange = { path: string; sha: string | null };

async function headOf(repo: Repo) {
  const octokit = await getOctokit(repo);
  const { data: repoData } = await octokit.rest.repos.get(repo);
  const branch = repoData.default_branch;
  const { data: ref } = await octokit.rest.git.getRef({
    ...repo,
    ref: `heads/${branch}`,
  });
  return { octokit, branch, sha: ref.object.sha };
}

/** Every file under `dir` at the head of the default branch. */
async function listFiles(repo: Repo, dir: string) {
  const { octokit, sha } = await headOf(repo);
  const { data: tree } = await octokit.rest.git.getTree({
    ...repo,
    tree_sha: sha,
    recursive: "true",
  });
  return tree.tree.flatMap((entry) =>
    entry.type === "blob" && entry.path?.startsWith(`${dir}/`) && entry.sha
      ? [{ path: entry.path, sha: entry.sha }]
      : [],
  );
}

/**
 * One commit on the default branch adding, replacing (blob SHA), or deleting
 * (`sha: null`) any number of files. The contents API only does one file at
 * a time, which would split a publish across several commits.
 */
async function commitChanges(
  repo: Repo,
  changes: TreeChange[],
  message: string,
) {
  const { octokit, branch, sha: parent } = await headOf(repo);
  const { data: parentCommit } = await octokit.rest.git.getCommit({
    ...repo,
    commit_sha: parent,
  });
  const { data: tree } = await octokit.rest.git.createTree({
    ...repo,
    base_tree: parentCommit.tree.sha,
    tree: changes.map(({ path, sha }) => ({
      path,
      sha,
      mode: "100644" as const,
      type: "blob" as const,
    })),
  });
  const { data: commit } = await octokit.rest.git.createCommit({
    ...repo,
    message,
    tree: tree.sha,
    parents: [parent],
  });
  await octokit.rest.git.updateRef({
    ...repo,
    ref: `heads/${branch}`,
    sha: commit.sha,
  });
}

export const listDrafts = () => listPostsIn(draftsRepo(), DRAFTS_DIR);

async function slugIsTaken(slug: string) {
  return Boolean(
    (await getPostSource(slug)) ??
    (await readRepoFile(draftsRepo(), draftPath(slug))),
  );
}

/** Suffixes `-2`, `-3`, … rather than throwing away a finished generation. */
async function freeSlug(slug: string) {
  for (let n = 1; n <= 20; n++) {
    const candidate = n === 1 ? slug : `${slug}-${n}`;
    if (!(await slugIsTaken(candidate))) return candidate;
  }
  throw new DraftError(`No free slug near "${slug}"`);
}

/** A new draft's full `index.mdx`. */
export function newDraftSource(draft: PostDraft) {
  return applyDraft(
    // Placeholder keys fix the frontmatter's key order
    `---\ntitle:\ndescription:\nisDraft: true\npubDate: ${today()}\n---\n`,
    draft,
  );
}

/** Commits a new draft to the drafts repo and returns its slug. */
export async function createDraft(draft: PostDraft): Promise<string> {
  const slug = await freeSlug(draft.slug);
  const text = newDraftSource(draft);
  assertValid(text);

  const octokit = await getOctokit(draftsRepo());
  await octokit.rest.repos.createOrUpdateFileContents({
    ...draftsRepo(),
    path: draftPath(slug),
    message: `Draft "${draft.title}"`,
    content: toBase64(text),
  });
  return slug;
}

async function getDraftSource(slug: string | undefined) {
  assertSlug(slug);
  const source = await readRepoFile(draftsRepo(), draftPath(slug));
  if (!source) throw data("Draft not found", { status: 404 });
  return { slug, source };
}

export async function getDraft(slug: string | undefined): Promise<Draft> {
  const { slug: valid, source } = await getDraftSource(slug);
  const parsed = parsePostSource(source.text);
  return {
    slug: valid,
    title: parsed.ok ? parsed.frontmatter.title : valid,
    path: source.path,
    sha: source.sha,
    text: source.text,
  };
}

export async function getDraftText(slug: string | undefined) {
  return (await getDraftSource(slug)).source.text;
}

/** Commits over the file at `sha`; GitHub rejects it if the draft moved on. */
export async function saveDraft(
  slug: string | undefined,
  text: string,
  sha: string,
  message = "Edit draft",
): Promise<string> {
  assertValid(text);
  const { slug: valid, source } = await getDraftSource(slug);
  const octokit = await getOctokit(draftsRepo());
  try {
    const { data: result } =
      await octokit.rest.repos.createOrUpdateFileContents({
        ...draftsRepo(),
        path: source.path,
        sha,
        message: `${message}: ${valid}`,
        content: toBase64(text),
      });
    return result.content?.sha ?? sha;
  } catch (error) {
    if (status(error) === 409) {
      throw new DraftError(
        "The draft changed since you loaded it. Reload to get the latest version (copy your edits first).",
      );
    }
    throw error;
  }
}

/** Applies a revision from the agent over the current file. */
export async function reviseDraft(slug: string | undefined, draft: PostDraft) {
  const { source } = await getDraftSource(slug);
  return saveDraft(
    slug,
    applyDraft(source.text, draft),
    source.sha,
    "Revise draft with AI",
  );
}

export async function deleteDraft(slug: string | undefined) {
  const { slug: valid } = await getDraftSource(slug);
  const files = await listFiles(draftsRepo(), draftDir(valid));
  await commitChanges(
    draftsRepo(),
    files.map(({ path }) => ({ path, sha: null })),
    `Delete draft: ${valid}`,
  );
}

/** A file from a draft's `assets/`, for serving its images in the preview. */
export async function getDraftAsset(slug: string | undefined, file: string) {
  assertSlug(slug);
  if (!/^[\w.-]+$/.test(file) || file.startsWith(".")) {
    throw data("Not found", { status: 404 });
  }
  const repo = draftsRepo();
  const octokit = await getOctokit(repo);
  try {
    const { data: meta } = await octokit.rest.repos.getContent({
      ...repo,
      path: `${draftDir(slug)}/assets/${file}`,
    });
    if (Array.isArray(meta) || meta.type !== "file") {
      throw data("Not found", { status: 404 });
    }
    // The contents API leaves `content` empty for files over 1 MB
    const content =
      meta.content ||
      (await octokit.rest.git.getBlob({ ...repo, file_sha: meta.sha })).data
        .content;
    return Buffer.from(content, "base64");
  } catch (error) {
    if (status(error) === 404) throw data("Not found", { status: 404 });
    throw error;
  }
}

/**
 * Copies the draft (and its assets) into the site repo as one commit on the
 * default branch, with `isDraft` cleared and `pubDate` set to today, then
 * removes it from the drafts repo. Returns the published slug.
 */
export async function publishDraft(slug: string | undefined): Promise<string> {
  const { slug: valid, source } = await getDraftSource(slug);
  if (await getPostSource(valid)) {
    throw new DraftError(`A published post already uses the slug "${valid}".`);
  }
  const text = editPostSource(source.text, (doc) => {
    doc.delete("isDraft");
    doc.set("pubDate", today());
  });
  const parsed = parsePostSource(text);
  if (!parsed.ok) throw new DraftError(`Invalid frontmatter:\n${parsed.error}`);

  const drafts = draftsRepo();
  const site = siteRepo();
  const [draftsOctokit, siteOctokit] = await Promise.all([
    getOctokit(drafts),
    getOctokit(site),
  ]);
  const files = await listFiles(drafts, draftDir(valid));

  // Blobs have to exist in the site repo before its tree can reference them
  const siteFiles = await Promise.all(
    files.map(async (file) => {
      const content =
        file.path === source.path
          ? toBase64(text)
          : (
              await draftsOctokit.rest.git.getBlob({
                ...drafts,
                file_sha: file.sha,
              })
            ).data.content;
      const { data: blob } = await siteOctokit.rest.git.createBlob({
        ...site,
        content,
        encoding: "base64",
      });
      const relative = file.path.slice(draftDir(valid).length);
      return { path: `${BLOG_CONTENT_DIR}/${valid}${relative}`, sha: blob.sha };
    }),
  );

  await commitChanges(
    site,
    siteFiles,
    `feat(blog): :memo: publish "${parsed.frontmatter.title}"`,
  );
  await commitChanges(
    drafts,
    files.map(({ path }) => ({ path, sha: null })),
    `Published: ${valid}`,
  );
  return valid;
}

/** Where the draft appears in full-preview builds, if full preview is set up. */
export function fullPreviewUrl(slug: string): string | undefined {
  const { VERCEL_PREVIEW_DEPLOY_HOOK, PREVIEW_SITE_URL } = getEnv();
  if (!VERCEL_PREVIEW_DEPLOY_HOOK || !PREVIEW_SITE_URL) return undefined;
  return new URL(`/blog/${slug}`, PREVIEW_SITE_URL).toString();
}

/**
 * Builds the site's `preview` branch on Vercel, where a prebuild step pulls
 * in every draft. The branch only ever points at the default branch's head;
 * drafts never touch the public repo.
 */
export async function triggerFullPreview() {
  const hook = getEnv().VERCEL_PREVIEW_DEPLOY_HOOK;
  if (!hook) throw new DraftError("Full preview isn't set up.");

  const site = siteRepo();
  const { octokit, sha } = await headOf(site);
  try {
    const { data: ref } = await octokit.rest.git.getRef({
      ...site,
      ref: `heads/${PREVIEW_BRANCH}`,
    });
    if (ref.object.sha !== sha) {
      await octokit.rest.git.updateRef({
        ...site,
        ref: `heads/${PREVIEW_BRANCH}`,
        sha,
        force: true,
      });
    }
  } catch (error) {
    if (status(error) !== 404) throw error;
    await octokit.rest.git.createRef({
      ...site,
      ref: `refs/heads/${PREVIEW_BRANCH}`,
      sha,
    });
  }

  // Always use the hook: the branch only ever points at commits the default
  // branch already deployed, and Vercel doesn't build a push of those
  const response = await fetch(hook, { method: "POST" });
  if (!response.ok) {
    throw new DraftError(`Vercel deploy hook failed (${response.status}).`);
  }
}
