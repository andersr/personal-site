import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useState } from "react";
import {
  data,
  Form,
  redirect,
  type ShouldRevalidateFunctionArgs,
  useFetcher,
  useNavigation,
  useRevalidator,
} from "react-router";
import { AgentProgress } from "~/components/AgentProgress";
import {
  deleteDraft,
  DraftError,
  fullPreviewUrl,
  getDraft,
  publishDraft,
  saveDraft,
  triggerFullPreview,
} from "~/lib/drafts.server";
import type { Draft, DraftAgentMessage } from "~/lib/posts";
import type { RenderedPost } from "~/lib/renderPost.server";
import type { action as previewAction } from "./drafts.$slug.preview";
import type { Route } from "./+types/drafts.$slug";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `${loaderData?.draft.title ?? "Draft"} · anders.co admin` }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const draft = await getDraft(params.slug);
  return { draft, fullPreviewUrl: fullPreviewUrl(draft.slug) };
}

type ActionResult = { error?: string; building?: boolean };

export async function action({ request, params }: Route.ActionArgs) {
  const form = await request.formData();
  try {
    switch (form.get("intent")) {
      case "publish": {
        const slug = await publishDraft(params.slug);
        return redirect(`/?published=${encodeURIComponent(slug)}`);
      }
      case "delete":
        await deleteDraft(params.slug);
        return redirect("/");
      case "full-preview":
        await triggerFullPreview();
        return { building: true } satisfies ActionResult;
      default:
        await saveDraft(
          params.slug,
          String(form.get("text")),
          String(form.get("sha")),
        );
        return {} satisfies ActionResult;
    }
  } catch (error) {
    if (error instanceof DraftError) {
      return data({ error: error.message } satisfies ActionResult, {
        status: 400,
      });
    }
    throw error;
  }
}

/** Rendering a preview doesn't change the draft, so don't refetch it from GitHub. */
export function shouldRevalidate({
  formAction,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (formAction?.endsWith("/preview")) return false;
  return defaultShouldRevalidate;
}

const button =
  "rounded px-4 py-2 text-sm font-medium disabled:opacity-50 border border-gray-300 dark:border-gray-700";
const primaryButton = `${button} border-transparent bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900`;

export default function DraftPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { draft, fullPreviewUrl } = loaderData;
  return (
    <main className="mt-6 flex flex-col gap-6">
      <h2 className="text-lg font-semibold">{draft.title}</h2>
      <Editor
        draft={draft}
        fullPreviewUrl={fullPreviewUrl}
        result={actionData as ActionResult | undefined}
      />
    </main>
  );
}

function Editor({
  draft,
  fullPreviewUrl,
  result,
}: {
  draft: Draft;
  fullPreviewUrl?: string;
  result?: ActionResult;
}) {
  const [text, setText] = useState(draft.text);
  // Pick up new commits (saves, AI revisions) without remounting
  const [syncedSha, setSyncedSha] = useState(draft.sha);
  if (draft.sha !== syncedSha) {
    setSyncedSha(draft.sha);
    setText(draft.text);
  }
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const preview = useFetcher<typeof previewAction>();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";
  const intent = navigation.formData?.get("intent");
  const dirty = text !== draft.text;

  const showPreview = () => {
    setTab("preview");
    void preview.submit(
      { text },
      { method: "post", action: `/drafts/${draft.slug}/preview` },
    );
  };

  return (
    <>
      <Form method="post" className="flex flex-col gap-3">
        <input type="hidden" name="sha" value={draft.sha} />
        {/* Above the tall editor, where results are hard to miss */}
        <ActionMessage result={result} />
        <div className="flex gap-1 text-sm" role="tablist">
          {(["edit", "preview"] as const).map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              onClick={name === "edit" ? () => setTab("edit") : showPreview}
              className={`rounded-t border-b-2 px-3 py-1 capitalize ${
                tab === name
                  ? "border-gray-900 font-medium dark:border-gray-100"
                  : "border-transparent text-gray-500"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
        {/* Kept mounted (just hidden) so the form always submits the text */}
        <textarea
          name="text"
          aria-label="Post source (MDX)"
          value={text}
          onChange={(event) => setText(event.target.value)}
          spellCheck
          hidden={tab !== "edit"}
          className="h-[70vh] rounded border border-gray-300 p-3 font-mono text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        {tab === "preview" && (
          <PreviewPane
            rendering={preview.state !== "idle"}
            result={preview.data}
          />
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            name="intent"
            value="save"
            disabled={!dirty || submitting}
            className={primaryButton}
          >
            {submitting && intent === "save" ? "Saving…" : "Save"}
          </button>
          {dirty && (
            <button
              type="button"
              onClick={() => setText(draft.text)}
              className={button}
            >
              Discard changes
            </button>
          )}
          {fullPreviewUrl && (
            <>
              <button
                type="submit"
                name="intent"
                value="full-preview"
                disabled={dirty || submitting}
                title={
                  dirty
                    ? "Save first; the build uses saved drafts"
                    : "Rebuild the Vercel preview with your latest saved drafts"
                }
                className={button}
              >
                {submitting && intent === "full-preview"
                  ? "Starting…"
                  : "Build full preview"}
              </button>
              <a
                href={fullPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline"
              >
                Open full preview ↗
              </a>
            </>
          )}
          <div className="ml-auto flex items-center gap-3">
            <ConfirmButton
              intent="delete"
              label="Delete…"
              question="Delete this draft?"
              confirmLabel="Yes, delete"
              pendingLabel="Deleting…"
            />
            <ConfirmButton
              intent="publish"
              label="Publish…"
              question="Publish to anders.co today?"
              confirmLabel="Yes, publish"
              pendingLabel="Publishing…"
              disabledReason={
                dirty ? "Save or discard your changes first" : undefined
              }
              primary
            />
          </div>
        </div>
      </Form>
      <Revise slug={draft.slug} disabled={dirty} />
    </>
  );
}

const errorText = "text-sm whitespace-pre-wrap text-red-700 dark:text-red-300";

function PreviewPane({
  rendering,
  result,
}: {
  rendering: boolean;
  result: RenderedPost | undefined;
}) {
  return (
    <div className="min-h-[70vh] rounded border border-gray-200 p-6 dark:border-gray-800">
      {rendering || !result ? (
        <p className="text-sm text-gray-500">Rendering…</p>
      ) : result.ok ? (
        // Rendered server-side from MDX with all code stripped out
        <div dangerouslySetInnerHTML={{ __html: result.html }} />
      ) : (
        <pre className={errorText}>{result.error}</pre>
      )}
    </div>
  );
}

function ActionMessage({ result }: { result?: ActionResult }) {
  if (result?.error) return <pre className={errorText}>{result.error}</pre>;
  if (!result?.building) return null;
  return (
    <p className="rounded bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100">
      Full preview is rebuilding on Vercel; it&apos;s ready in about a minute.
      Use &ldquo;Open full preview&rdquo; below (sign in to Vercel to view it).
    </p>
  );
}

/** An inline two-step confirm, instead of a blocking `window.confirm`. */
function ConfirmButton({
  intent,
  label,
  question,
  confirmLabel,
  pendingLabel,
  disabledReason,
  primary,
}: {
  intent: string;
  label: string;
  question: string;
  confirmLabel: string;
  pendingLabel: string;
  disabledReason?: string;
  primary?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const navigation = useNavigation();
  const pending =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === intent;

  if (!confirming) {
    return (
      <button
        type="button"
        disabled={Boolean(disabledReason) || navigation.state !== "idle"}
        title={disabledReason}
        onClick={() => setConfirming(true)}
        className={button}
      >
        {label}
      </button>
    );
  }
  return (
    <>
      <span className="text-sm">{question}</span>
      <button
        type="submit"
        name="intent"
        value={intent}
        disabled={navigation.state !== "idle"}
        className={primary ? primaryButton : button}
      >
        {pending ? pendingLabel : confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className={button}
      >
        Cancel
      </button>
    </>
  );
}

function Revise({ slug, disabled }: { slug: string; disabled: boolean }) {
  const revalidator = useRevalidator();
  const [instructions, setInstructions] = useState("");
  const transport = useMemo(
    () =>
      new DefaultChatTransport<DraftAgentMessage>({
        api: `/api/drafts/${slug}/revise`,
      }),
    [slug],
  );
  const { messages, sendMessage, status, error } = useChat<DraftAgentMessage>({
    transport,
    onData: (part) => {
      if (part.type === "data-saved") {
        setInstructions("");
        void revalidator.revalidate();
      }
    },
  });
  const busy = status === "submitted" || status === "streaming";

  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-semibold">Revise with AI</h3>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage({ text: instructions });
        }}
      >
        <textarea
          aria-label="Revision instructions"
          rows={3}
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          disabled={busy}
          placeholder="e.g. Tighten the intro and add a section on running tests in CI"
          className="rounded border border-gray-300 p-3 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy || disabled || !instructions.trim()}
            className={button}
          >
            {busy ? "Revising…" : "Revise draft"}
          </button>
          {disabled && (
            <span className="text-sm text-gray-500">
              Save or discard your edits first; revisions apply to the saved
              draft.
            </span>
          )}
        </div>
      </form>
      <AgentProgress
        messages={messages}
        status={status}
        error={error}
        doneLabel="Revision saved."
      />
    </section>
  );
}
