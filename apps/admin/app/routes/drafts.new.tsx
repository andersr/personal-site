import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { useNavigate } from "react-router";
import { AgentProgress } from "~/components/AgentProgress";
import type { DraftAgentMessage } from "~/lib/posts";

export function meta() {
  return [{ title: "New post · anders.co admin" }];
}

const transport = new DefaultChatTransport<DraftAgentMessage>({
  api: "/api/drafts/generate",
});

export default function NewDraft() {
  const navigate = useNavigate();
  const [description, setDescription] = useState("");
  const { messages, sendMessage, status, error } = useChat<DraftAgentMessage>({
    transport,
    onData: (part) => {
      if (part.type === "data-draft") {
        void navigate(`/drafts/${part.data.slug}`);
      }
    },
  });
  const busy = status === "submitted" || status === "streaming";

  return (
    <main className="mt-6 flex flex-col gap-4">
      <h2 className="text-lg font-semibold">New post</h2>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage({ text: description });
        }}
      >
        <label
          htmlFor="description"
          className="text-sm text-gray-600 dark:text-gray-400"
        >
          Describe the post: topic, the points to make, any links, code, or
          anecdotes to include, and roughly how long it should be. The agent
          writes a draft and saves it to your private drafts repo.
        </label>
        <textarea
          id="description"
          required
          rows={10}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={busy}
          className="rounded border border-gray-300 p-3 font-mono text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <div>
          <button
            type="submit"
            disabled={busy || !description.trim()}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
          >
            {busy ? "Writing draft…" : "Write draft"}
          </button>
        </div>
      </form>
      <AgentProgress
        messages={messages}
        status={status}
        error={error}
        doneLabel="Draft created, opening it…"
      />
    </main>
  );
}
