import type { IconLinkProps } from "~/types/Icon";
import { HI_AT_ANDERSCO_MAILTO } from "./email";

type AppIcons =
  | "email"
  | "bluesky"
  | "github"
  | "linkedin"
  | "instagram"
  | "medium"
  | "stackoverflow"
  | "threads"
  | "calendar"
  | "chevronLeft";

export const APP_ICONS: Record<AppIcons, string> = {
  bluesky: "proicons:bluesky",
  email: "mdi:email-outline",
  github: "mdi:github",
  linkedin: "mdi:linkedin",
  instagram: "mdi:instagram",
  medium: "simple-icons:medium",
  stackoverflow: "mdi:stack-overflow",
  threads: "simple-icons:threads",
  calendar: "mdi:calendar-month",
  chevronLeft: "mdi:chevron-left",
};

export const ABOUT_ICON_LINKS: IconLinkProps[] = [
  {
    icon: APP_ICONS["bluesky"],
    href: "https://bsky.app/profile/andersco.bsky.social",
    title: "Bluesky",
  },
  {
    icon: APP_ICONS["github"],
    href: "https://github.com/andersr",
    title: "GitHub",
  },
  {
    icon: APP_ICONS["instagram"],
    href: "https://instagram.com",
    title: "Instagram",
  },
  {
    icon: APP_ICONS["linkedin"],
    href: "https://www.linkedin.com/in/andersramsay/",
    title: "LinkedIn",
  },
  {
    icon: APP_ICONS["medium"],
    href: "https://medium.com/@andersco",
    title: "Medium",
    size: 30,
  },
  {
    icon: APP_ICONS["stackoverflow"],
    href: "https://stackoverflow.com/users/2008639/andersr",
    title: "Stack Overflow",
  },
  {
    icon: APP_ICONS["threads"],
    href: "https://www.threads.net/@andersr",
    title: "Threads",
  },
];

export const FOOTER_ICON_LINKS: IconLinkProps[] = [
  {
    icon: APP_ICONS["email"],
    href: HI_AT_ANDERSCO_MAILTO,
    title: "Email",
  },
  // {
  //   icon: APP_ICONS["bluesky"],
  //   href: "https://bsky.app/profile/andersco.bsky.social",
  //   title: "Bluesky",
  // },
  {
    icon: APP_ICONS["github"],
    href: "https://github.com/andersr",
    title: "GitHub",
  },

  {
    icon: APP_ICONS["linkedin"],
    href: "https://www.linkedin.com/in/andersramsay/",
    title: "LinkedIn",
  },
  // {
  //   icon: APP_ICONS["threads"],
  //   href: "https://www.threads.net/@andersr",
  //   title: "Threads",
  // },
];
