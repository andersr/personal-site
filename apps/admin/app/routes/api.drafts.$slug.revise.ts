import { agentStreamResponse, readPrompt } from "~/lib/agentStream.server";
import { getDraftBase, reviseDraft } from "~/lib/drafts.server";
import { streamRevision } from "~/lib/postAgent.server";
import type { Route } from "./+types/api.drafts.$slug.revise";

export async function action({ request, params }: Route.ActionArgs) {
  const instructions = await readPrompt(request);
  // Read once: the revision is saved against the version the model saw
  const base = await getDraftBase(params.slug);
  return agentStreamResponse(
    streamRevision(base.text, instructions),
    async (draft, writer) => {
      const sha = await reviseDraft(params.slug, draft, base);
      writer.write({ type: "data-saved", data: { sha } });
    },
  );
}
