// @ts-check
import mdx from "@astrojs/mdx";
import tailwind from "@astrojs/tailwind";
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
  integrations: [
    tailwind(),
    icon(),
    expressiveCode({
      themes: ["github-dark-default"],
    }),
    mdx({
      remarkPlugins: [[emoji, { accessible: true }]],
    }),
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
    rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
  },
});
