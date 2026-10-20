import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { documentTitle, titleForPath } from '../../utils/routeTitles.js';

/**
 * Runs on every page change: sets the tab title, scrolls back to the top and tells screen readers
 * which page opened. Renders only a visually hidden status line.
 */
export default function RouteEffects() {
  const { pathname } = useLocation();
  const first = useRef(true);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    document.title = documentTitle(pathname);
    // Do not announce the page that was loaded directly, only later navigation.
    if (first.current) {
      first.current = false;
      return;
    }
    setAnnouncement(titleForPath(pathname));
    // The 3D world is a fixed full-screen view; other pages should start at the top.
    if (pathname !== '/world') window.scrollTo?.(0, 0);
  }, [pathname]);

  return (
    <p className="sr-only" role="status" aria-live="polite">
      {announcement}
    </p>
  );
}
