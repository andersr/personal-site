import { createAnthropic } from "@ai-sdk/anthropic";
import { Output, stepCountIs, tool, ToolLoopAgent } from "ai";
import { z } from "zod";
import { getEnv } from "./env.server";
import { getPostSource, listPosts } from "./posts.server";

const INSTRUCTIONS = `You draft blog posts for anders.co, the personal site of a software engineer who writes about web development, testing, and working with AI coding assistants.

Before writing, call listPosts to see what already exists, then readPost on one or two posts closest to the topic so you match the author's voice: first person, conversational but practical, short paragraphs, concrete examples and code over abstractions.

The body is MDX rendered with Tailwind typography:
- Start with a short intro paragraph, then use "##" (and "###") headings. Never use "#"; the page renders the title as the h1.
- Fenced code blocks need a language tag.
- Link to external tools and docs inline the first time they're mentioned.
- These components are available without imports (never write import statements):
  - <CalloutBox>markdown content</CalloutBox> for a highlighted aside
  - <FloatBox side="left|right">one short pull quote</FloatBox>, placed just before the paragraph it floats beside
  - <Giphy id="..." slug="..." /> only if the author gives you a Giphy id
- Don't invent images, screenshots, quotes, links, or facts about the author. Where the author should add something, leave a clear placeholder like {/* TODO: screenshot of X */}.

Frontmatter you provide:
- slug: short, lowercase, hyphenated, unique among existing posts
- title: Title Case
- description: one or two sentences in the author's voice, used for listings and SEO
- toc: true only for long posts with many sections
- series: only if the post belongs to an existing series (use the series index post's slug)`;

/** What the agent returns; the server turns it into an `index.mdx`. */
export const postDraftSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase-hyphenated")
    .describe("URL slug, e.g. how-i-test-astro-sites"),
  title: z.string(),
  description: z.string(),
  toc: z.boolean().optional(),
  // An object rather than the frontmatter's [name, slug] tuple, which
  // structured-output JSON schemas don't express well
  series: z
    .object({ name: z.string(), slug: z.string() })
    .optional()
    .describe("Series this post belongs to, if any"),
  body: z.string().min(1).describe("MDX body, without frontmatter"),
});

export type PostDraft = z.infer<typeof postDraftSchema>;

let agent: ReturnType<typeof createAgent> | undefined;

function createAgent() {
  const env = getEnv();
  const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return new ToolLoopAgent({
    id: "post-writer",
    model: anthropic(env.POST_AGENT_MODEL),
    instructions: INSTRUCTIONS,
    tools: {
      listPosts: tool({
        description:
          "List published and draft posts on the site: slug, title, description, series.",
        inputSchema: z.object({}),
        execute: async () =>
          (await listPosts()).flatMap((post) =>
            post.ok
              ? [
                  {
                    slug: post.slug,
                    title: post.frontmatter.title,
                    description: post.frontmatter.description,
                    series: post.frontmatter.seriesInfo?.[0],
                  },
                ]
              : [],
          ),
      }),
      readPost: tool({
        description: "Read the full MDX source of an existing post by slug.",
        inputSchema: z.object({ slug: z.string() }),
        execute: async ({ slug }) =>
          (await getPostSource(slug))?.text ?? `No post with slug "${slug}"`,
      }),
    },
    output: Output.object({ schema: postDraftSchema }),
    stopWhen: stepCountIs(12),
  });
}

function getAgent() {
  agent ??= createAgent();
  return agent;
}

export function streamNewDraft(description: string) {
  return getAgent().stream({
    prompt: `Write a new blog post draft from this description:\n\n${description}`,
  });
}

export function streamRevision(source: string, instructions: string) {
  return getAgent().stream({
    prompt: `Here is the current draft, including frontmatter:\n\n${source}\n\nRevise it as follows, and return the complete revised post (keep the slug unless asked to change it):\n\n${instructions}`,
  });
}
