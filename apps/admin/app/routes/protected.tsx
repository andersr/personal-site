import { Form, Link, Outlet, redirect } from "react-router";
import { isAllowedUser, userContext } from "~/lib/auth.server";
import { getSession } from "~/lib/session.server";
import type { Route } from "./+types/protected";

export const middleware: Route.MiddlewareFunction[] = [
  async ({ request, context }) => {
    const user = (await getSession(request)).get("user");
    if (!user || !isAllowedUser(user)) throw redirect("/login");
    context.set(userContext, user);
  },
];

export function loader({ context }: Route.LoaderArgs) {
  return { user: context.get(userContext) };
}

export default function Protected({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  return (
    <div className="mx-auto max-w-4xl p-4">
      <header className="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-800">
        <Link to="/" className="text-lg font-semibold">
          anders.co admin
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <img
            src={user.avatarUrl}
            alt=""
            width={28}
            height={28}
            className="rounded-full"
          />
          <span>@{user.login}</span>
          <Form method="post" action="/logout">
            <button
              type="submit"
              className="text-gray-500 underline hover:text-gray-900 dark:hover:text-gray-100"
            >
              Sign out
            </button>
          </Form>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
