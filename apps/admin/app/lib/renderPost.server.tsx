import { evaluate } from "@mdx-js/mdx";
import rehypeShiki from "@shikijs/rehype";
import type { ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import emoji from "remark-emoji";
import { SITE_URL } from "./posts";
import { parsePostSource } from "./posts.server";

// Classes from the site's `Typography.astro`, so the preview reads the same
const PROSE = [
  "prose max-w-none md:prose-xl dark:prose-invert",
  "prose-h1:text-center prose-h1:pt-6 prose-h1:font-normal md:prose-h1:py-6 prose-h1:leading-tight",
  "prose-h2:font-normal prose-h2:mt-8",
  "prose-h3:font-medium md:prose-h3:font-normal prose-h3:mb-1",
  "prose-ul:pl-6",
  "prose-li:my-1",
  "prose-figcaption:text-sm",
].join(" ");

type MdxNode = {
  type: string;
  children?: MdxNode[];
  attributes?: { type: string; name?: string; value?: unknown }[];
};

const CODE_NODES = new Set([
  "mdxjsEsm",
  "mdxFlowExpression",
  "mdxTextExpression",
]);

/**
 * Drops everything in the MDX that would run as code on the server: imports,
 * exports, `{…}` expressions (including `{/* comments *\/}`), and expression
 * attributes. Drafts are partly model-written, so only markup gets rendered.
 */
function remarkStripCode() {
  const strip = (node: MdxNode) => {
    if (node.children) {
      node.children = node.children.filter((c) => !CODE_NODES.has(c.type));
      node.children.forEach(strip);
    }
    if (node.attributes) {
      node.attributes = node.attributes.filter(
        (a) =>
          a.type === "mdxJsxAttribute" &&
          (a.value == null || typeof a.value === "string"),
      );
      // Astro accepts HTML's `class` in MDX; React wants `className`
      for (const a of node.attributes) {
        if (a.name === "class") a.name = "className";
      }
    }
  };
  return strip;
}

/** Points draft-relative images at the admin's asset route, site paths at the site. */
function resolveSrc(src: string | undefined, slug: string) {
  if (!src) return src;
  if (src.startsWith("./assets/")) {
    return `/drafts/${slug}/assets/${src.slice("./assets/".length)}`;
  }
  if (src.startsWith("/")) return `${SITE_URL}${src}`;
  return src;
}

// Stand-ins for the site's MDX components (`apps/site/src/components`)
const components = (slug: string) => ({
  CalloutBox: ({ children }: { children?: ReactNode }) => (
    <div className="m-4 border border-slate-300 px-6 pb-2 md:rounded-lg">
      {children}
    </div>
  ),
  FloatBox: ({
    side,
    children,
  }: {
    side?: "left" | "right";
    children?: ReactNode;
  }) => (
    <div
      className={`w-2/3 py-4 font-medium prose-p:text-2xl prose-p:leading-normal prose-p:text-gray-600 ${
        side === "left" ? "float-left pr-8" : "float-right pl-8"
      }`}
    >
      {children}
    </div>
  ),
  Giphy: ({ id, slug: gifSlug }: { id?: string; slug?: string }) => (
    <figure className="relative mx-auto size-[300px] md:size-[480px]">
      <iframe
        src={`https://giphy.com/embed/${id}`}
        className="size-full"
        title="GIPHY"
      />
      <figcaption className="absolute right-2 bottom-1">
        <a className="text-sm" href={`https://giphy.com/gifs/${gifSlug}`}>
          via GIPHY
        </a>
      </figcaption>
    </figure>
  ),
  Image: ({ src, alt }: { src?: string; alt?: string }) => (
    <img src={resolveSrc(src, slug)} alt={alt ?? ""} />
  ),
  img: ({ src, alt }: { src?: string; alt?: string }) => (
    <img src={resolveSrc(src, slug)} alt={alt ?? ""} />
  ),
});

export type RenderedPost =
  { ok: true; html: string } | { ok: false; error: string };

/** Renders a draft's MDX to HTML approximating the site's post page. */
export async function renderPostHtml(
  text: string,
  slug: string,
): Promise<RenderedPost> {
  const parsed = parsePostSource(text);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { frontmatter, body } = parsed;

  try {
    const { default: Content } = await evaluate(body, {
      ...runtime,
      remarkPlugins: [remarkStripCode, [emoji, { accessible: true }]],
      rehypePlugins: [
        rehypeSlug,
        rehypeAutolinkHeadings,
        [
          rehypeShiki,
          { theme: "github-dark-default", fallbackLanguage: "plaintext" },
        ],
      ],
    });
    const html = renderToString(
      <article className={PROSE}>
        <h1>{frontmatter.title}</h1>
        {frontmatter.heroImage && (
          <img
            src={resolveSrc(frontmatter.heroImage[0], slug)}
            alt={frontmatter.heroImage[1]}
          />
        )}
        <Content components={components(slug)} />
      </article>,
    );
    return { ok: true, html };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}
