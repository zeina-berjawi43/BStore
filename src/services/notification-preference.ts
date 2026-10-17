import { getNotificationSetting, updateNotificationSetting } from './authService';
import { onSessionChanged, peekSessionUser } from './tokenStorage';

export function createNotificationPreference(deps: { load: () => Promise<boolean>; save: (value: boolean) => Promise<boolean> }, initial?: boolean) {
  let confirmed = initial ?? true, intent = 0, epoch = 0, running = false, read: Promise<void> | null = null;
  let state = { value: confirmed, confirmed, loaded: initial !== undefined, loading: false, saving: false, savedVersion: 0, error: '' };
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<typeof state>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  const load = () => {
    if (read || running) return read || Promise.resolve();
    const version = intent, generation = epoch;
    publish({ loading: true });
    const work = deps.load().then(value => {
      if (generation !== epoch) return;
      confirmed = value; publish({ value: intent === version ? value : state.value, confirmed, loaded: true, error: '' });
    }).catch(error => {
      if (generation === epoch && intent === version) publish({ error: error instanceof Error ? error.message : 'Could not load notification settings.' });
    }).finally(() => { if (generation === epoch) { read = null; publish({ loading: false }); } });
    read = work; return work;
  };
  const drain = async () => {
    if (running) return;
    running = true;
    const generation = epoch;
    publish({ saving: true });
    // A pre-existing read also writes the scoped profile cache. Finish it before
    // writes, while leaving the user's optimistic selection visible throughout.
    if (read) await read;
    while (generation === epoch) {
      const version = intent, value = state.value;
      try {
        const saved = await deps.save(value);
        if (generation !== epoch) return;
        confirmed = saved;
        publish({ confirmed, loaded: true, savedVersion: state.savedVersion + 1, error: '' });
        if (version === intent || saved === state.value) { publish({ value: saved }); break; }
      } catch (error) {
        if (generation !== epoch) return;
        publish({ error: error instanceof Error ? error.message : 'Could not save notification settings.' });
        if (version === intent) { publish({ value: confirmed }); break; }
      }
    }
    if (generation === epoch) { running = false; publish({ saving: false }); }
  };
  return { subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, getSnapshot: () => state, load,
    toggle: () => { intent++; publish({ value: !state.value, error: '' }); void drain(); },
    reset: (value?: boolean) => { epoch++; intent = 0; running = false; read = null; confirmed = value ?? true; publish({ value: confirmed, confirmed, loaded: value !== undefined, loading: false, saving: false, savedVersion: 0, error: '' }); },
  };
}
const cached = () => (peekSessionUser() as { notificationsEnabled?: boolean } | null)?.notificationsEnabled;
const preferenceState = createNotificationPreference({ load: getNotificationSetting, save: updateNotificationSetting }, cached());
export const notificationPreference = { ...preferenceState, load: () => {
  const state = preferenceState.getSnapshot(), value = cached();
  // The module can load before session restoration warms the profile cache.
  if (!state.loaded && !state.loading && !state.saving && !state.error && value !== undefined) preferenceState.reset(value);
  return preferenceState.load();
} };
onSessionChanged(() => preferenceState.reset(cached()));
