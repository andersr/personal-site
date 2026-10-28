import { Octokit } from "octokit";
import { redirect } from "react-router";
import { isAllowedUser } from "~/lib/auth.server";
import { getGitHubApp, getOAuthCallbackUrl } from "~/lib/github.server";
import {
  commitSession,
  getSession,
  type SessionUser,
} from "~/lib/session.server";
import type { Route } from "./+types/auth.github.callback";

export async function loader({ request }: Route.LoaderArgs) {
  const params = new URL(request.url).searchParams;
  const session = await getSession(request);
  const expectedState = session.get("oauthState");

  const fail = async (message: string) => {
    session.flash("error", message);
    return redirect("/login", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  };

  const code = params.get("code");
  if (!code || !expectedState || params.get("state") !== expectedState) {
    return fail("Sign-in failed or expired. Please try again.");
  }

  let user: SessionUser;
  try {
    // The user token only identifies who signed in; repo access uses the
    // app's installation token, so it isn't kept.
    const { authentication } = await getGitHubApp().oauth.createToken({
      code,
      redirectUrl: getOAuthCallbackUrl(),
    });
    const { data } = await new Octokit({
      auth: authentication.token,
    }).rest.users.getAuthenticated();
    user = { id: data.id, login: data.login, avatarUrl: data.avatar_url };
  } catch (error) {
    console.error("GitHub OAuth callback failed", error);
    return fail("GitHub sign-in failed. Please try again.");
  }

  if (!isAllowedUser(user)) {
    return fail(`@${user.login} isn't allowed to use this admin.`);
  }

  session.set("user", user);
  return redirect("/", {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}
