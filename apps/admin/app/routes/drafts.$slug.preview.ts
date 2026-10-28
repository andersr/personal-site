import { renderPostHtml } from "~/lib/renderPost.server";
import type { Route } from "./+types/drafts.$slug.preview";

/** Renders the editor's current (possibly unsaved) text for the Preview tab. */
export async function action({ request, params }: Route.ActionArgs) {
  const text = String((await request.formData()).get("text") ?? "");
  return renderPostHtml(text, params.slug);
}
