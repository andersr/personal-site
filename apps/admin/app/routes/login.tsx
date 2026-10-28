import { data, Form, redirect } from "react-router";
import { isAllowedUser } from "~/lib/auth.server";
import { commitSession, getSession } from "~/lib/session.server";
import type { Route } from "./+types/login";

export function meta() {
  return [{ title: "Sign in · anders.co admin" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  if (isAllowedUser(session.get("user"))) throw redirect("/");

  // Reading the flash clears it, so the session must be committed
  const error = session.get("error");
  return data(
    { error },
    { headers: { "Set-Cookie": await commitSession(session) } },
  );
}

export default function Login({ loaderData }: Route.ComponentProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-4">
      <h1 className="text-2xl font-semibold">anders.co admin</h1>
      {loaderData.error && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {loaderData.error}
        </p>
      )}
      {/* Native POST so the redirect to github.com is a plain document navigation */}
      <Form method="post" action="/auth/github" reloadDocument>
        <button
          type="submit"
          className="w-full rounded bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
        >
          Sign in with GitHub
        </button>
      </Form>
    </main>
  );
}
