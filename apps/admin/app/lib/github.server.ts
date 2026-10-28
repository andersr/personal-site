import { App, type Octokit } from "octokit";
import { getEnv } from "./env.server";

let app: App | undefined;

/** One GitHub App does both jobs: user sign-in (OAuth) and repo access (installation token). */
export function getGitHubApp(): App {
  if (!app) {
    const env = getEnv();
    app = new App({
      appId: env.GITHUB_APP_ID,
      privateKey: env.GITHUB_APP_PRIVATE_KEY,
      oauth: {
        clientId: env.GITHUB_APP_CLIENT_ID,
        clientSecret: env.GITHUB_APP_CLIENT_SECRET,
      },
    });
  }
  return app;
}

export type Repo = { owner: string; repo: string };

const toRepo = (fullName: string): Repo => {
  const [owner, repo] = fullName.split("/");
  return { owner, repo };
};

/** The public site repo, where published posts live. */
export const siteRepo = () => toRepo(getEnv().GITHUB_REPO);

/** The private repo holding drafts, so they're never visible publicly. */
export const draftsRepo = () => toRepo(getEnv().DRAFTS_REPO);

export function getOAuthCallbackUrl() {
  return new URL("/auth/github/callback", getEnv().APP_URL).toString();
}

const repoOctokits = new Map<string, Promise<Octokit>>();

/**
 * Octokit authenticated as the app's installation on `repo`. Each
 * installation is looked up once; octokit refreshes its token as it expires.
 */
export function getOctokit(repo: Repo): Promise<Octokit> {
  const key = `${repo.owner}/${repo.repo}`;
  let octokit = repoOctokits.get(key);
  if (!octokit) {
    octokit = (async () => {
      const app = getGitHubApp();
      const { data } = await app.octokit.rest.apps
        .getRepoInstallation(repo)
        .catch((error: unknown) => {
          if ((error as { status?: number }).status !== 404) throw error;
          throw new Error(
            `The GitHub App isn't installed on ${key}. Add the repo under the App's installation settings.`,
          );
        });
      return app.getInstallationOctokit(data.id);
    })().catch((error: unknown) => {
      repoOctokits.delete(key);
      throw error;
    });
    repoOctokits.set(key, octokit);
  }
  return octokit;
}
