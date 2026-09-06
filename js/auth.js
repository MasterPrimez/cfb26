// Layer 2: sign in to sync. Supabase Auth (email magic link) + one row per person holding their prefs.
// Works without an account: everything stays on-device until someone signs in; then the device copy and the
// account copy are merged and every change is saved to both.
import { state, onChange } from './state.js';

export const SUPABASE_URL = 'https://ectxmgzjrdzcpyyecaww.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjdHhtZ3pqcmR6Y3B5eWVjYXd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2Njc5OTgsImV4cCI6MjEwNDI0Mzk5OH0.7PnTmDn_Y3W7eC2RZaxpj3IriDwyu7dvJ1gFKsshMYU';

let client = null;
let user = null;
let pushTimer = null;
let applyingRemote = false;
const listeners = new Set();

export function onAuth(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function currentUser() { return user; }
const notify = () => listeners.forEach(fn => fn(user));

function sb() {
  if (client) return client;
  if (!window.supabase?.createClient) return null; // library didn't load (offline / blocked) — app keeps working on-device
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return client;
}

export async function initAuth() {
  const c = sb(); if (!c) return;
  c.auth.onAuthStateChange(async (event, session) => {
    const next = session?.user || null;
    const changed = (next?.id || null) !== (user?.id || null);
    user = next;
    if (event === 'SIGNED_IN' && /[?&]code=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);
    if (changed) { if (user) await pullAndMerge(); notify(); }
  });
  const { data } = await c.auth.getSession();
  user = data?.session?.user || null;
  if (user) await pullAndMerge();
  notify();
  onChange(() => { if (user && !applyingRemote) schedulePush(); });
}

export async function sendMagicLink(email) {
  const c = sb(); if (!c) throw new Error('Sign-in is unavailable right now.');
  const { error } = await c.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } });
  if (error) throw error;
}

export async function signOut() {
  const c = sb(); if (!c) return;
  await c.auth.signOut();
  user = null; notify();
}

async function pullAndMerge() {
  const c = sb(); if (!c || !user) return;
  const { data, error } = await c.from('profiles').select('prefs').eq('id', user.id).maybeSingle();
  if (error) { console.warn('sync pull failed', error.message); return; }
  const merged = state.mergePrefs(data?.prefs || null);
  applyingRemote = true;
  try { state.importPrefs(merged); } finally { applyingRemote = false; }
  await push();
}

function schedulePush() { clearTimeout(pushTimer); pushTimer = setTimeout(push, 800); }

async function push() {
  const c = sb(); if (!c || !user) return;
  const { error } = await c.from('profiles').upsert({ id: user.id, email: user.email, prefs: state.prefs, updated_at: new Date().toISOString() });
  if (error) console.warn('sync push failed', error.message);
}
