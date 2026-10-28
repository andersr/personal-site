import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  // Fly terminates TLS and forwards plain HTTP, so React Router sees
  // `http://admin.anders.co` while browsers send `Origin: https://…`. Its
  // CSRF check compares the two and rejects every form action as a 400.
  allowedActionOrigins: ["admin.anders.co"],
} satisfies Config;
