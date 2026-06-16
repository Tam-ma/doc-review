import { Link } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { requireAuthWithRole } from '~/lib/auth/middleware';
import { Role } from '~/lib/auth/permissions';

/**
 * Admin hub (/admin) — links the individual admin dashboards.
 * Admin role required; individual dashboards enforce the same gate.
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await requireAuthWithRole(request, context);
  if (user.role !== Role.ADMIN) {
    throw new Response('Forbidden', { status: 403 });
  }
  return { user };
}

const SECTIONS = [
  { to: '/admin/users', title: 'Users', desc: 'Manage users and assign roles.' },
  { to: '/admin/emails', title: 'Email Queue', desc: 'Monitor, retry, and clean up outbound email.' },
  { to: '/admin/search', title: 'Search Analytics', desc: 'Query metrics, popular searches, and reindexing.' },
  { to: '/admin/webhooks', title: 'Webhooks', desc: 'Git provider webhook configuration and recent events.' },
];

export default function AdminIndex() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
      <p className="mt-1 text-sm text-gray-600">Administrative dashboards. Admin role required.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow"
          >
            <h2 className="text-base font-semibold text-gray-900">{s.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
