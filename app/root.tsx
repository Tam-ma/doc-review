import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getUser } from "~/lib/auth/session.server";
import { getUserById } from "~/lib/db/users.server";
import { AppHeader } from "~/components/AppHeader";

export const links = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  // Resolve the signed-in user (with DB role) for the global header. This runs
  // on every page, so it must never throw — fall back to logged-out on error.
  const env = (context as { env?: Record<string, unknown>; cloudflare?: { env?: Record<string, unknown> } }).env
    ?? (context as { cloudflare?: { env?: Record<string, unknown> } }).cloudflare?.env
    ?? {};
  try {
    const sessionUser = await getUser(request, { env });
    if (!sessionUser) {
      return { user: null };
    }
    const dbUser = await getUserById(env, sessionUser.id);
    return { user: { ...sessionUser, role: dbUser?.role ?? "viewer" } };
  } catch {
    return { user: null };
  }
}

export default function Root() {
  const data = useLoaderData<typeof loader>();
  const user = data?.user ?? null;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <AppHeader user={user} />
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
