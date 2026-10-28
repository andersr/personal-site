// Copies drafts from the private drafts repo into the blog collection so a
// Vercel build of the `preview` branch can show them (they keep `isDraft:
// true`, which preview builds render). Does nothing in every other build.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { VERCEL_ENV, VERCEL_GIT_COMMIT_REF, DRAFTS_REPO, DRAFTS_REPO_TOKEN } =
  process.env;

if (
  VERCEL_ENV !== "preview" ||
  VERCEL_GIT_COMMIT_REF !== "preview" ||
  !DRAFTS_REPO ||
  !DRAFTS_REPO_TOKEN
) {
  process.exit(0);
}

const response = await fetch(
  `https://api.github.com/repos/${DRAFTS_REPO}/tarball`,
  {
    headers: {
      Authorization: `Bearer ${DRAFTS_REPO_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
  },
);
if (!response.ok) {
  console.error(`fetch-drafts: GitHub returned ${response.status}`);
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "drafts-"));
const tar = spawnSync("tar", ["-xz", "-C", dir, "--strip-components=1"], {
  input: Buffer.from(await response.arrayBuffer()),
});
if (tar.status !== 0) {
  console.error(`fetch-drafts: tar failed\n${tar.stderr}`);
  process.exit(1);
}

const draftsDir = join(dir, "drafts");
const blogDir = new URL("../src/content/blog/", import.meta.url).pathname;
const slugs = existsSync(draftsDir) ? readdirSync(draftsDir) : [];
let added = 0;
for (const slug of slugs) {
  // A published post with the same slug wins; publishing would refuse anyway
  if (
    existsSync(join(blogDir, slug)) ||
    existsSync(join(blogDir, `${slug}.mdx`))
  ) {
    console.warn(`fetch-drafts: skipping "${slug}", already published`);
    continue;
  }
  cpSync(join(draftsDir, slug), join(blogDir, slug), { recursive: true });
  added++;
}
rmSync(dir, { recursive: true, force: true });
console.info(`fetch-drafts: added ${added} draft(s)`);
