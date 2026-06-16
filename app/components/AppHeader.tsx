import { Link } from 'react-router';
import type { OAuthUser } from '~/lib/auth/oauth.server';
import { Role } from '~/lib/auth/permissions';
import { UserMenu } from './auth/UserMenu';
import { LoginButton } from './auth/LoginButton';

export type HeaderUser = OAuthUser & { role?: string };

/**
 * Global application header rendered by the root route on every page.
 * Surfaces primary navigation (Docs, Search), notification settings, and the
 * admin area (role-gated), plus the user menu / login control.
 */
export function AppHeader({ user }: { user: HeaderUser | null }) {
  const isAdmin = user?.role?.toLowerCase() === Role.ADMIN;

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-base font-semibold text-gray-900">
              Tamma Doc Review
            </Link>
            <nav className="hidden items-center gap-4 text-sm text-gray-600 sm:flex">
              <Link to="/docs" className="hover:text-gray-900">
                Docs
              </Link>
              <Link to="/search" className="hover:text-gray-900">
                Search
              </Link>
              {user && (
                <Link to="/settings/notifications" className="hover:text-gray-900">
                  Settings
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" className="hover:text-gray-900">
                  Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center">
            {user ? <UserMenu user={user} /> : <LoginButton provider="github" />}
          </div>
        </div>
      </div>
    </header>
  );
}
