import { createContext } from "react-router";
import { getEnv } from "./env.server";
import type { SessionUser } from "./session.server";

/** Set by the protected layout's middleware; read it in any route beneath it. */
export const userContext = createContext<SessionUser>();

/** Re-checked on every request so changing the env var revokes old sessions. */
export function isAllowedUser(user: SessionUser | undefined) {
  return user?.id === getEnv().ADMIN_GITHUB_USER_ID;
}
