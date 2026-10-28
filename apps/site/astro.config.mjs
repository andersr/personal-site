// @ts-check
import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import { defineConfig } from "astro/config";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import emoji from "remark-emoji";
import { loadEnv } from "vite";

import sitemap from "@astrojs/sitemap";

import expressiveCode from "astro-expressive-code";

const { BASE_URL } = loadEnv(
  process.env.NODE_ENV ?? "development",
  process.cwd(),
  "",
);

if (!BASE_URL) {
  throw new Error("BASE_URL is required");
}
// https://astro.build/config
export default defineConfig({
  site: BASE_URL,
  // Astro 7 defaults to "jsx", which drops whitespace between inline elements
  compressHTML: true,
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    icon(),
    expressiveCode({
      themes: ["github-dark-default"],
    }),
    mdx(),
    sitemap({
      i18n: {
        defaultLocale: "en",
        locales: {
          en: "en-US",
        },
      },
    }),
  ],
  markdown: {
    // remark/rehype rather than Astro 7's default Sätteri processor, which these plugins need. MDX inherits it.
    processor: unified({
      remarkPlugins: [[emoji, { accessible: true }]],
      rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
    }),
  },
});
