import { z } from "zod";

const envSchema = z.object({
  APP_URL: z.url(),
  SESSION_SECRET: z.string().min(32),
  GITHUB_APP_ID: z.string().min(1),
  GITHUB_APP_CLIENT_ID: z.string().min(1),
  GITHUB_APP_CLIENT_SECRET: z.string().min(1),
  // Accept "\n" escapes so the PEM can live on one line in .env
  GITHUB_APP_PRIVATE_KEY: z
    .string()
    .min(1)
    .transform((key) => key.replace(/\\n/g, "\n")),
  GITHUB_REPO: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/, "must be owner/name")
    .default("andersr/personal-site"),
  ADMIN_GITHUB_USER_ID: z.coerce.number().int().positive(),
});

export type Env = z.infer<typeof envSchema>;

let env: Env | undefined;

/** Validated on first use rather than at import, so builds don't need secrets. */
export function getEnv(): Env {
  if (!env) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      throw new Error(
        `Invalid admin environment:\n${z.prettifyError(result.error)}`,
      );
    }
    env = result.data;
  }
  return env;
}
