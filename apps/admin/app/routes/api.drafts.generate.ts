import { agentStreamResponse, readPrompt } from "~/lib/agentStream.server";
import { createDraft } from "~/lib/drafts.server";
import { streamNewDraft } from "~/lib/postAgent.server";
import type { Route } from "./+types/api.drafts.generate";

export async function action({ request }: Route.ActionArgs) {
  const description = await readPrompt(request);
  return agentStreamResponse(
    streamNewDraft(description),
    async (draft, writer) => {
      const slug = await createDraft(draft);
      writer.write({ type: "data-draft", data: { slug } });
    },
  );
}
