import { resolveTimeZone } from '../utils/day.js';

// Sets req.tz from the browser's "X-Timezone" header (an IANA name like "America/Los_Angeles").
export function timezone(req, _res, next) {
  req.tz = resolveTimeZone(req.get('x-timezone'));
  next();
}
