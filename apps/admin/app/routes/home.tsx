import { POST_BRANCH_PREFIX, type PostSummary } from "~/lib/posts";
import { listPostPullRequests, listPosts } from "~/lib/posts.server";
import type { Route } from "./+types/home";

const SITE_URL = "https://www.anders.co";

export function meta() {
  return [{ title: "Posts · anders.co admin" }];
}

export async function loader() {
  const [posts, pullRequests] = await Promise.all([
    listPosts(),
    listPostPullRequests(),
  ]);
  return { posts, pullRequests };
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
  const { posts, pullRequests } = loaderData;

  return (
    <main className="mt-6 flex flex-col gap-10">
      <section>
        <h2 className="text-lg font-semibold">Drafts in progress</h2>
        {pullRequests.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            No open drafts. Drafts created here open a pull request from a{" "}
            <code>{POST_BRANCH_PREFIX}*</code> branch.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-200 dark:divide-gray-800">
            {pullRequests.map((pr) => (
              <li key={pr.number} className="flex justify-between gap-4 py-2">
                <a href={pr.url} className="underline">
                  #{pr.number} {pr.title}
                </a>
                <span className="text-sm text-gray-500">
                  {pr.branch} · updated {formatDate(new Date(pr.updatedAt))}
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
