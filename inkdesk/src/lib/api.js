import { API_URL } from './config';
import { persistentStore } from './storage';
import { mockCall } from './mock';

const ENDPOINT_KEY = 'inkdesk_endpoint';

class ApiError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind; // 'auth' | 'validation' | 'network' | 'server' | 'rate' | 'notfound'
  }
}

/* ---------- endpoint -------------------------------------------------- */

export function getEndpoint() {
  return (persistentStore.getItem(ENDPOINT_KEY) || API_URL || '').trim();
}

export function setEndpoint(url) {
  const clean = String(url || '').trim();
  if (clean) persistentStore.setItem(ENDPOINT_KEY, clean);
  else persistentStore.removeItem(ENDPOINT_KEY);
}

/** Demo mode = no endpoint configured → sample data, nothing leaves the browser. */
export function isDemo() {
  return !getEndpoint();
}

/* ---------- transport ----------------------------------------------- */

function fieldsToMessage(fields) {
  const values = fields ? Object.values(fields) : [];
  return values.length ? values.join(' ') : '';
}

function toApiError(res) {
  if (res.error === 'auth') {
    return new ApiError('auth', res.message || 'The webhook rejected this request.');
  }
  if (res.error === 'validation') {
    return new ApiError('validation', fieldsToMessage(res.fields) || res.message || 'Please check the form.');
  }
  return new ApiError(res.error || 'server', res.message || 'Request failed.');
}

/**
 * A workflow can answer with the { ok, data } envelope or with a bare
 * payload — accept either. A body that carries `error` but no `ok` is
 * treated as a failure.
 */
function unwrap(res) {
  if (!res || typeof res !== 'object') return res;
  const enveloped = 'ok' in res;
  const bareFailure = !enveloped && typeof res.error === 'string' && !('data' in res);
  if (!enveloped && !bareFailure) return res;
  if (res.ok === false || bareFailure) throw toApiError(res);
  return res.data;
}

async function httpCall(body) {
  let res;
  try {
    res = await fetch(getEndpoint(), {
      method: 'POST',
      // text/plain keeps this a CORS "simple request", so the browser never
      // sends an OPTIONS preflight the webhook would have to answer.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('network', 'Cannot reach the webhook. Check the URL in Settings, and that the n8n workflow is active and listening.');
  }
  let json;
  try {
    json = await res.json();
  } catch {
    throw new ApiError('server', `The webhook returned a non-JSON response (HTTP ${res.status}). Check the URL and the workflow's Respond to Webhook node.`);
  }
  if (!res.ok && !(json && typeof json === 'object' && 'ok' in json)) {
    throw new ApiError('server', (json && json.message) || `The webhook returned HTTP ${res.status}.`);
  }
  return json;
}

async function call(action, params = {}) {
  const body = { action, ...params };
  const res = isDemo() ? await mockCall(action, params) : await httpCall(body);
  return unwrap(res);
}

/* ---------- public API ---------------------------------------------- */

export const api = {
  list: (params) => call('list', { params }).then((d) => d.items),
  clientHistory: (q, params = {}) => call('clientHistory', { params: { ...params, q } }),
  dashboard: () => call('dashboard', {}),
  meta: () => call('meta', {}),
  updateStatus: (id, status) => call('updateStatus', { id, status }),
  reschedule: (id, payload) => call('reschedule', { id, payload }),
  saveNotes: (id, notes) => call('saveNotes', { id, notes }),
  addManual: (payload) => call('addManual', { payload }),
  deleteAppointment: (id) => call('deleteAppointment', { id }),
  blockDate: (payload) => call('blockDate', { payload }),
  unblockDate: (payload) => call('unblockDate', { payload }),
};

/** Tests an arbitrary webhook URL without saving it (used by Settings). */
export async function pingEndpoint(url) {
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'ping' }),
    });
  } catch {
    throw new Error('Could not reach that URL. Check the workflow is active and that it answers with an Access-Control-Allow-Origin header.');
  }
  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`The endpoint answered with a non-JSON response (HTTP ${res.status}).`);
  }
  if (json && json.ok === false) throw new Error(json.message || 'The workflow responded with an error.');
  return json;
}
