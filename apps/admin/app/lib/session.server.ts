import { createCookieSessionStorage, type SessionStorage } from "react-router";
import { getEnv } from "./env.server";

export type SessionUser = {
  id: number;
  login: string;
  avatarUrl: string;
};

type SessionData = { user: SessionUser };
type SessionFlashData = { oauthState: string; error: string };

let storage: SessionStorage<SessionData, SessionFlashData> | undefined;

function getStorage() {
  storage ??= createCookieSessionStorage<SessionData, SessionFlashData>({
    cookie: {
      name: "__session",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secrets: [getEnv().SESSION_SECRET],
    },
  });
  return storage;
}

export function getSession(request: Request) {
  return getStorage().getSession(request.headers.get("Cookie"));
}

export function commitSession(
  ...args: Parameters<
    SessionStorage<SessionData, SessionFlashData>["commitSession"]
  >
) {
  return getStorage().commitSession(...args);
}

export function destroySession(
  ...args: Parameters<
    SessionStorage<SessionData, SessionFlashData>["destroySession"]
  >
) {
  return getStorage().destroySession(...args);
}
