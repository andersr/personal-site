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
  site: "https://personal-site-tau-sandy.vercel.app", // BASE_URL,
  integrations: [
    tailwind(),
    icon(),
    mdx({
      remarkPlugins: [[emoji, { accessible: true }]],
    }),
    sitemap(),
  ],
  markdown: {
    rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
  },
  experimental: {
    responsiveImages: true,
  },
});
