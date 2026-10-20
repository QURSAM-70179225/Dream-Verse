import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Loader from '../components/ui/Loader.jsx';
import AvatarCustomizer from '../world/ui/AvatarCustomizer.jsx';
import HelpOverlay from '../world/ui/HelpOverlay.jsx';
import InfoPanel from '../world/ui/InfoPanel.jsx';
import WorldBoundary, { WorldUnavailable } from '../world/ui/WorldBoundary.jsx';
import WorldHUD from '../world/ui/WorldHUD.jsx';
import LevelUpNotice from '../components/ui/LevelUpNotice.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ProgressProvider, useProgress } from '../context/ProgressContext.jsx';
import { useIsMobile, useMediaQuery, usePrefersReducedMotion } from '../hooks/useMediaQuery.js';
import { hasWebGL } from '../utils/webgl.js';
import { loadLook, sanitizeLook, saveLook } from '../world/data/avatar.js';
import { recordVisit } from '../services/progress.js';
import { cityLabel, describe } from '../world/data/interactions.js';
import { buildLocation } from '../world/data/locations.js';
import { createInput, useKeyboardControls, useLookControls } from '../world/engine/input.js';

const WorldCanvas = lazy(() => import('../world/components/WorldCanvas.jsx'));

const HELP_KEY = 'dreamverse_world_help_seen';
const NEXT_TIME = { day: 'night', night: 'auto', auto: 'day' };
const INTERIORS = ['apartment', 'office', 'cafe'];

function helpSeen() {
  try {
    return localStorage.getItem(HELP_KEY) === '1';
  } catch {
    return false;
  }
}

export default function World() {
  return (
    <ProgressProvider>
      <WorldRoot />
    </ProgressProvider>
  );
}

function WorldRoot() {
  const { user, token } = useAuth();
  const { progress, loading, error, refresh } = useProgress();
  const supported = useMemo(() => hasWebGL(), []);
  const mobile = useIsMobile();
  const coarse = useMediaQuery('(pointer: coarse)');
  const reduced = usePrefersReducedMotion();
  const touch = coarse || mobile;

  const input = useMemo(createInput, []);
  const viewRef = useRef(null);
  const limitsRef = useRef({ minPitch: 0.2, maxPitch: 1.2, min: 5, max: 14 });
  const timer = useRef(null);

  const [look, setLook] = useState(() => loadLook());
  const [timeMode, setTimeMode] = useState('day');
  const [loc, setLoc] = useState({ id: 'city', spawn: 'default', n: 0 });
  const [near, setNear] = useState(null);
  const [zone, setZone] = useState('');
  const [panel, setPanel] = useState(() => (helpSeen() ? null : 'help')); // null | 'help' | 'avatar' | 'info'
  const [info, setInfo] = useState(null);
  const [fading, setFading] = useState(false);
  const [reward, setReward] = useState('');

  const level = progress?.level ?? 1;
  const dream = progress?.dream || null;
  const roadmap = progress?.roadmap || null;
  const roomTheme = dream?.profile?.roomTheme;
  const cityTheme = dream?.profile?.cityTheme;
  const milestoneKey = (roadmap?.milestones || []).map((m) => m.progress ?? 0).join(',');

  const location = useMemo(
    () =>
      buildLocation(loc.id, {
        roomTheme,
        cityTheme,
        milestones: milestoneKey ? milestoneKey.split(',').map(Number) : [],
      }),
    [loc.id, roomTheme, cityTheme, milestoneKey]
  );
  limitsRef.current = location.cam;

  useKeyboardControls(input);
  useLookControls(viewRef, input, limitsRef);

  const paused = panel !== null || fading;
  useEffect(() => {
    if (paused) {
      input.keys.clear();
      input.joy.x = 0;
      input.joy.y = 0;
    }
  }, [paused, input]);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Entering a building tells the server, which keeps the visit list, gives XP for the first visit
  // to each place and unlocks "Future Explorer" after all three. Silent on failure: exploring
  // never depends on it.
  const greeted = useRef(false);
  const [greeting, setGreeting] = useState('');
  useEffect(() => {
    if (greeted.current || user?.demo || !progress?.title) return undefined;
    greeted.current = true;
    setGreeting(`Welcome back, ${progress.title} (level ${progress.level}).`);
    const t = setTimeout(() => setGreeting(''), 6000);
    return () => clearTimeout(t);
  }, [progress, user]);

  const rewardTimer = useRef(null);
  const reported = useRef(new Set());
  useEffect(() => {
    if (user?.demo || !token || !INTERIORS.includes(loc.id) || reported.current.has(loc.id)) return undefined;
    reported.current.add(loc.id);
    let cancelled = false;
    recordVisit(token, loc.id)
      .then((res) => {
        if (cancelled || !res.firstVisit) return;
        const parts = [`First visit! +${res.xpGained} XP`];
        if (res.streak?.counted) parts.push(`Day ${res.streak.count} streak`);
        res.newAchievements.forEach((a) => parts.push(`Achievement unlocked: ${a.title}`));
        setReward(parts.join(' · '));
        clearTimeout(rewardTimer.current);
        rewardTimer.current = setTimeout(() => setReward(''), 7000);
        refresh({ silent: true });
      })
      .catch(() => reported.current.delete(loc.id));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.id, token, user]);
  useEffect(() => () => clearTimeout(rewardTimer.current), []);

  const closePanel = useCallback(() => {
    if (panel === 'help') {
      try {
        localStorage.setItem(HELP_KEY, '1');
      } catch {
        /* storage unavailable */
      }
    }
    setPanel(null);
    setInfo(null);
  }, [panel]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && panel) closePanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, closePanel]);

  const go = useCallback(
    (to, spawn) => {
      if (fading) return;
      setFading(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(
        () => {
          setLoc((l) => ({ id: to, spawn, n: l.n + 1 }));
          setNear(null);
          setZone('');
          setFading(false);
        },
        reduced ? 0 : 260
      );
    },
    [fading, reduced]
  );

  const onInteract = useCallback(
    (item) => {
      if (!item) return;
      if (item.kind === 'portal') {
        go(item.to, item.spawn);
      } else {
        setInfo(describe(item.id, { dream, roadmap }));
        setPanel('info');
      }
    },
    [go, dream, roadmap]
  );

  // Options above the user's level are not available: fall back to the defaults for those parts.
  useEffect(() => {
    if (progress) setLook((current) => sanitizeLook(current, progress.level));
  }, [progress]);

  const cycleTime = () => setTimeMode((m) => NEXT_TIME[m]);
  const changeLook = (next) => {
    setLook(next);
    saveLook(next);
  };

  if (!supported) {
    return (
      <div className="fixed inset-0">
        <WorldUnavailable reason="This browser or device does not support WebGL, which the 3D world needs." />
      </div>
    );
  }

  const spawn = location.spawns[loc.spawn] || location.spawns.default;
  const locationName = loc.id === 'city' ? cityLabel(dream) : location.name;
  const ready = !loading;

  let notice = null;
  if (reward) notice = reward;
  else if (greeting && !error) notice = greeting;
  else if (error) notice = 'Your saved dream could not be loaded, so this is the default world.';
  else if (user?.demo) notice = 'Sample world. Create an account to build your own.';
  else if (!dream && ready) {
    notice = (
      <>
        Create your dream to personalize this world.{' '}
        <Link to="/create" className="font-semibold text-neon-cyan underline">
          Create now
        </Link>
      </>
    );
  }

  const announce = `${reward ? `${reward}. ` : ''}${locationName}${zone ? `, ${zone}` : ''}.${near ? ` ${near.label} is nearby. Press E to use it.` : ''}`;

  return (
    <div className="fixed inset-0 overflow-hidden bg-midnight-950">
      <div
        ref={viewRef}
        className="absolute inset-0 touch-none"
        role="application"
        aria-label="Interactive 3D world. Walk with W A S D or the arrow keys, press E to interact."
      >
        {ready ? (
          <WorldBoundary>
            <Suspense fallback={<Loader label="Building your world" />}>
              <WorldCanvas
                location={location}
                spawn={spawn}
                playerKey={`${loc.id}:${loc.spawn}:${loc.n}`}
                look={look}
                input={input}
                timeMode={timeMode}
                paused={paused}
                mobile={mobile}
                reduced={reduced}
                onNear={setNear}
                onZone={setZone}
                onInteract={onInteract}
              />
            </Suspense>
          </WorldBoundary>
        ) : (
          <Loader label="Preparing your world" />
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <WorldHUD
        locationName={locationName}
        zone={loc.id === 'city' ? zone : ''}
        timeMode={timeMode}
        onCycleTime={cycleTime}
        onAvatar={() => setPanel((p) => (p === 'avatar' ? null : 'avatar'))}
        onHelp={() => setPanel('help')}
        near={panel ? null : near}
        onInteract={() => onInteract(near)}
        touch={touch}
        input={input}
        notice={panel ? null : notice}
        avatarOpen={panel === 'avatar'}
      />

      <LevelUpNotice className="pointer-events-auto absolute inset-x-0 top-20 z-40 mx-auto w-full max-w-md px-3" />

      {panel === 'info' && info && <InfoPanel info={info} onClose={closePanel} />}
      {panel === 'avatar' && <AvatarCustomizer look={look} onChange={changeLook} onClose={closePanel} level={level} />}
      {panel === 'help' && <HelpOverlay touch={touch} onClose={closePanel} />}

      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-20 bg-midnight-950 transition-opacity duration-200 ${
          fading ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
