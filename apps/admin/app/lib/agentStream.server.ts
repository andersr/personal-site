import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessageStreamWriter,
} from "ai";
import { DraftError, newDraftSource } from "./drafts.server";
import type { PostDraft, streamNewDraft } from "./postAgent.server";
import type { DraftAgentMessage } from "./posts";

/** The text of the last message `useChat` sent, i.e. what the user typed. */
export async function readPrompt(request: Request): Promise<string> {
  const { messages } = (await request.json()) as {
    messages: DraftAgentMessage[];
  };
  const text = messages
    .at(-1)
    ?.parts.flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n")
    .trim();
  if (!text) throw new Response("Empty prompt", { status: 400 });
  return text;
}

function errorText(error: unknown) {
  if (error instanceof DraftError) return error.message;
  return `Something went wrong: ${error instanceof Error ? error.message : String(error)}`;
}

/**
 * Streams the agent's progress (tool calls, output) to `useChat`, then hands
 * the finished draft to `onDraft`, which commits it and reports back through
 * the writer. If that fails, the generated post is sent back anyway so it
 * isn't lost. Streaming also keeps the request alive past Fly's idle timeout.
 */
export function agentStreamResponse(
  run: ReturnType<typeof streamNewDraft>,
  onDraft: (
    draft: PostDraft,
    writer: UIMessageStreamWriter<DraftAgentMessage>,
  ) => Promise<void>,
) {
  let agentFailed = false;
  const stream = createUIMessageStream<DraftAgentMessage>({
    execute: async ({ writer }) => {
      const result = await run;
      writer.merge(
        result.toUIMessageStream({
          sendFinish: false,
          onError: (error) => {
            agentFailed = true;
            return errorText(error);
          },
        }),
      );
      const draft = await result.output.then(
        (output) => output,
        (error: unknown) => {
          // The merged stream has already reported why the agent failed
          if (agentFailed) return undefined;
          throw error;
        },
      );
      if (!draft) return;
      try {
        await onDraft(draft, writer);
      } catch (error) {
        writer.write({
          type: "data-unsaved",
          data: { text: newDraftSource(draft) },
        });
        throw error;
      }
    },
    onError: errorText,
  });
  return createUIMessageStreamResponse({ stream });
}
