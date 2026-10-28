import { agentStreamResponse, readPrompt } from "~/lib/agentStream.server";
import { getDraftText, reviseDraft } from "~/lib/drafts.server";
import { streamRevision } from "~/lib/postAgent.server";
import type { Route } from "./+types/api.drafts.$slug.revise";

export async function action({ request, params }: Route.ActionArgs) {
  const instructions = await readPrompt(request);
  const source = await getDraftText(params.slug);
  return agentStreamResponse(
    streamRevision(source, instructions),
    async (draft, writer) => {
      const sha = await reviseDraft(params.slug, draft);
      writer.write({ type: "data-saved", data: { sha } });
    },
  );
}
