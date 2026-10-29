import type { ImageMetadata } from "astro";

export type PageProps = {
  title?: string;
  description?: string;
  metaImage?: [ImageMetadata, string];
  twStyles?: string;
  topSectionOffset?: string;
  staticPage?: boolean;
};
