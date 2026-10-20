// One short title per page. Used for the browser tab, history entries and the screen-reader
// announcement when the page changes (single-page apps do not do this by themselves).
export const APP_NAME = 'DreamVerse AI';

export const ROUTE_TITLES = {
  '/': 'Home',
  '/login': 'Log in',
  '/register': 'Create account',
  '/forgot-password': 'Forgot password',
  '/reset-password': 'Choose a new password',
  '/demo-world': 'Demo world',
  '/status': 'Setup status',
  '/dashboard': 'Dashboard',
  '/create': 'Create your future',
  '/world': '3D world',
  '/nova': 'Nova, your mentor',
  '/roadmap': 'Roadmap',
  '/decisions': 'Decision simulator',
  '/achievements': 'Achievements',
};

export const NOT_FOUND_TITLE = 'Page not found';

export const titleForPath = (pathname) => {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return ROUTE_TITLES[clean] ?? NOT_FOUND_TITLE;
};

export const documentTitle = (pathname) =>
  pathname === '/' ? `${APP_NAME} — Design Your Dreams` : `${titleForPath(pathname)} · ${APP_NAME}`;
