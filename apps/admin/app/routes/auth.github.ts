import { redirect } from "react-router";
import { getGitHubApp, getOAuthCallbackUrl } from "~/lib/github.server";
import { commitSession, getSession } from "~/lib/session.server";
import type { Route } from "./+types/auth.github";

export async function loader() {
  return redirect("/login");
}

/** Starts the GitHub App user-authorization flow. */
export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request);
  const state = crypto.randomUUID();
  session.flash("oauthState", state);

  const { url } = getGitHubApp().oauth.getWebFlowAuthorizationUrl({
    state,
    redirectUrl: getOAuthCallbackUrl(),
    allowSignup: false,
  });

  return redirect(url, {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}
