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

export function getRepo() {
  const [owner, repo] = getEnv().GITHUB_REPO.split("/");
  return { owner, repo };
}

export function getOAuthCallbackUrl() {
  return new URL("/auth/github/callback", getEnv().APP_URL).toString();
}

let repoOctokit: Promise<Octokit> | undefined;

/**
 * Octokit authenticated as the app's installation on the site repo. The
 * installation is looked up once; octokit refreshes its token as it expires.
 */
export function getRepoOctokit(): Promise<Octokit> {
  repoOctokit ??= (async () => {
    const app = getGitHubApp();
    const { data } = await app.octokit.rest.apps.getRepoInstallation(getRepo());
    return app.getInstallationOctokit(data.id);
  })().catch((error) => {
    repoOctokit = undefined;
    throw error;
  });
  return repoOctokit;
}
