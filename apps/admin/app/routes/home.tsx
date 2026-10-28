import { Link } from "react-router";
import { listDrafts } from "~/lib/drafts.server";
import { type PostSummary, SITE_URL } from "~/lib/posts";
import { listPosts } from "~/lib/posts.server";
import type { Route } from "./+types/home";

export function meta() {
  return [{ title: "Posts · anders.co admin" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [posts, drafts] = await Promise.all([listPosts(), listDrafts()]);
  const published = new URL(request.url).searchParams.get("published");
  return { posts, drafts, published };
}

// ISO date avoids server/client timezone differences during hydration
const formatDate = (date: Date) => date.toISOString().slice(0, 10);

function PostStatus({ post }: { post: PostSummary }) {
  if (!post.ok) {
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200">
        Invalid
      </Badge>
    );
  }
  return post.frontmatter.isDraft ? (
    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
      Draft
    </Badge>
  ) : (
    <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">
      Published
    </Badge>
  );
}

function Badge({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { posts, drafts, published } = loaderData;

  return (
    <main className="mt-6 flex flex-col gap-10">
      {published && (
        <p className="rounded bg-green-100 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          Published. It goes live at{" "}
          <a href={`${SITE_URL}/blog/${published}`} className="underline">
            {SITE_URL}/blog/{published}
          </a>{" "}
          once Vercel finishes deploying.
        </p>
      )}
      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Drafts ({drafts.length})</h2>
          <Link
            to="/drafts/new"
            className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-gray-100 dark:text-gray-900"
          >
            New post
          </Link>
        </div>
        {drafts.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            No drafts. They're kept in your private drafts repo until you
            publish them.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-200 dark:divide-gray-800">
            {drafts.map((draft) => (
              <li key={draft.slug} className="flex justify-between gap-4 py-2">
                <Link to={`/drafts/${draft.slug}`} className="underline">
                  {draft.ok ? draft.frontmatter.title : draft.slug}
                </Link>
                <span className="flex shrink-0 items-center gap-3 text-sm text-gray-500">
                  {draft.ok ? (
                    `started ${formatDate(draft.frontmatter.pubDate)}`
                  ) : (
                    <PostStatus post={draft} />
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Posts ({posts.length})</h2>
        <ul className="mt-2 divide-y divide-gray-200 dark:divide-gray-800">
          {posts.map((post) => (
            <li key={post.slug} className="flex flex-col gap-1 py-3">
              <div className="flex items-center justify-between gap-4">
                <a
                  href={`${SITE_URL}/blog/${post.slug}`}
                  className="font-medium underline"
                >
                  {post.ok ? post.frontmatter.title : post.slug}
                </a>
                <div className="flex shrink-0 items-center gap-3 text-sm text-gray-500">
                  {post.ok && formatDate(post.frontmatter.pubDate)}
                  <PostStatus post={post} />
                </div>
              </div>
              {!post.ok && (
                <pre className="overflow-x-auto text-xs whitespace-pre-wrap text-red-700 dark:text-red-300">
                  {post.path}: {post.error}
                </pre>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
