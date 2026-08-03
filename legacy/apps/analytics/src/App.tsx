import { useEffect, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { getBridge, requirePermission, type ThemeName } from '@teradata-pe/bridge';
import { Protected } from './routing/Protected';
import { Workbench } from './pages/Workbench';
import { Insights } from './pages/Insights';
import { Admin } from './pages/Admin';
import './styles.css';

/**
 * Analytics remote root. Rules of the house:
 *  - session/theme/cache/operations come from the bridge, never from local state;
 *  - route protection uses the SHARED validators from @teradata-pe/bridge;
 *  - no imports from other remotes, ever.
 */
export function App({ basename = '/analytics' }: { basename?: string }) {
  const { session, theme } = getBridge();
  const [, setThemeTick] = useState<ThemeName>(theme.current);
  const [user, setUser] = useState(session.user);

  useEffect(() => {
    // Re-render on theme/session changes; actual colors come from
    // @mission/tokens CSS variables driven by html[data-theme].
    const offTheme = theme.subscribe((next) => setThemeTick(next), { immediate: false });
    const offSession = session.subscribe(setUser);
    return () => {
      offTheme();
      offSession();
    };
  }, [session, theme]);

  return (
    <BrowserRouter basename={basename}>
      <div className="mc-remote analytics-root" data-testid="analytics-root">
        <header className="mc-remote-header">
          <div>
            <h1>Analytics</h1>
            <p className="mc-muted">React 19 remote · signed in as {user?.name ?? 'anonymous'}</p>
          </div>
          <nav className="mc-tabs">
            <NavLink to="" end className={({ isActive }) => (isActive ? 'mc-tab mc-tab-active' : 'mc-tab')}>
              Workbench
            </NavLink>
            <NavLink to="insights" className={({ isActive }) => (isActive ? 'mc-tab mc-tab-active' : 'mc-tab')}>
              Insights
            </NavLink>
            {/* UI gating via the session facade: hidden without permission, and
                the route itself stays guarded either way. */}
            {session.can('admin') && (
              <NavLink to="admin" className={({ isActive }) => (isActive ? 'mc-tab mc-tab-active' : 'mc-tab')}>
                Admin
              </NavLink>
            )}
          </nav>
        </header>

        <Routes>
          <Route
            index
            element={
              <Protected validator={requirePermission('analytics:view')}>
                <Workbench />
              </Protected>
            }
          />
          <Route
            path="insights"
            element={
              <Protected validator={requirePermission('analytics:query')}>
                <Insights />
              </Protected>
            }
          />
          <Route
            path="admin"
            element={
              <Protected validator={requirePermission('admin')}>
                <Admin />
              </Protected>
            }
          />
          <Route path="*" element={<p className="mc-muted">Nothing here.</p>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
