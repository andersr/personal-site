import { getDraftAsset } from "~/lib/drafts.server";
import type { Route } from "./+types/drafts.$slug.assets.$file";

const CONTENT_TYPES: Record<string, string> = {
  avif: "image/avif",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
};

/** Serves images from a draft's `assets/` in the private repo to the preview. */
export async function loader({ params }: Route.LoaderArgs) {
  const body = await getDraftAsset(params.slug, params.file);
  const ext = params.file.split(".").pop()?.toLowerCase() ?? "";
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "private, max-age=300",
      // SVGs can carry scripts; never let one run in the admin's origin
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}
