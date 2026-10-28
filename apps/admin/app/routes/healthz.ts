/** Fly health check; deliberately touches no env or GitHub state. */
export function loader() {
  return new Response("ok", { headers: { "Content-Type": "text/plain" } });
}
