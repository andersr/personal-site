import type { ChatStatus } from "ai";
import { useState } from "react";
import type { DraftAgentMessage } from "~/lib/posts";

/** Describes each step of the agent's run as it streams in. */
function describe(part: DraftAgentMessage["parts"][number]) {
  switch (part.type) {
    case "tool-listPosts":
      return "Looked through existing posts";
    case "tool-readPost":
      return `Read “${part.input?.slug ?? "…"}” for voice and style`;
    case "text":
      return `Writing (${part.text.length.toLocaleString("en-US")} characters)`;
    default:
      return undefined;
  }
}

export function AgentProgress({
  messages,
  status,
  error,
  doneLabel,
}: {
  messages: DraftAgentMessage[];
  status: ChatStatus;
  error: Error | undefined;
  doneLabel: string;
}) {
  const parts =
    messages.filter((m) => m.role === "assistant").at(-1)?.parts ?? [];
  const steps = parts.map(describe).filter((step) => step !== undefined);
  const unsaved = parts.find((part) => part.type === "data-unsaved");
  const busy = status === "submitted" || status === "streaming";

  if (!busy && !error && steps.length === 0) return null;
  return (
    <div className="rounded border border-gray-200 p-3 text-sm dark:border-gray-800">
      <ol className="flex flex-col gap-1 text-gray-600 dark:text-gray-400">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
        {status === "submitted" && <li>Starting…</li>}
        {status === "ready" && !error && steps.length > 0 && (
          <li className="font-medium text-gray-900 dark:text-gray-100">
            {doneLabel}
          </li>
        )}
      </ol>
      {error && (
        <p className="mt-2 whitespace-pre-wrap text-red-700 dark:text-red-300">
          {error.message}
        </p>
      )}
      {unsaved && <UnsavedPost text={unsaved.data.text} />}
    </div>
  );
}

/** The generated post, shown when saving it failed so the run isn't wasted. */
function UnsavedPost({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span>The post wasn't saved. Copy it before leaving this page:</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard
              .writeText(text)
              .then(() => setCopied(true));
          }}
          className="rounded border border-gray-300 px-3 py-1 font-medium dark:border-gray-700"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <textarea
        readOnly
        aria-label="Unsaved post (MDX)"
        value={text}
        rows={12}
        className="rounded border border-gray-300 p-3 font-mono text-xs dark:border-gray-700 dark:bg-gray-900"
      />
    </div>
  );
}
