/**
 * Demo-mode backend — same request/response contract as the n8n workflow,
 * running entirely in the browser so the UI works with no backend connected.
 * Active whenever no API endpoint is configured (see lib/config.js).
 * In-memory only: every edit is lost on reload.
 */

import { ACTIVE_STATUSES } from './constants';
import { dayISO } from './utils';

const LATENCY = 350;

let seq = 1;

function stamp(offsetDays, hm) {
  return `${dayISO(offsetDays)}T${hm}:00`;
}

const DATA = [];

let BLOCKED = [];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clone = (v) => JSON.parse(JSON.stringify(v));

function bySessionAsc(a, b) {
  return a.date === b.date ? (a.time < b.time ? -1 : 1) : a.date < b.date ? -1 : 1;
}

function applyScope(items, scope) {
  const today = dayISO(0);
  let out = items.slice();
  if (scope === 'upcoming') {
    out = out.filter((a) => ACTIVE_STATUSES.includes(a.status) && a.date >= today).sort(bySessionAsc);
  } else if (scope === 'today') {
    out = out.filter((a) => a.date === today && a.status !== 'cancelled').sort(bySessionAsc);
  } else if (scope === 'past') {
    out = out.filter((a) => a.date < today || ['completed', 'cancelled'].includes(a.status));
    out.sort((a, b) => bySessionAsc(b, a));
  } else {
    out.sort((a, b) => bySessionAsc(b, a));
  }
  return out;
}

function find(id) {
  return DATA.find((x) => x.id === id) || null;
}

const notFound = () => ({ ok: false, error: 'notfound', message: 'Appointment not found.' });

export async function mockCall(action, req = {}) {
  await sleep(LATENCY);

  switch (action) {
    case 'ping':
      return { ok: true, data: { service: 'inkdesk-api (demo)', version: 1 } };

    case 'list': {
      const { status = 'all', scope = 'upcoming', q = '' } = req.params || {};
      let items = clone(DATA);
      if (status !== 'all') items = items.filter((a) => a.status === status);
      if (q) {
        const s = q.toLowerCase();
        items = items.filter((a) => `${a.name} ${a.email} ${a.phone} ${a.id}`.toLowerCase().includes(s));
      }
      return { ok: true, data: { items: applyScope(items, scope) } };
    }

    case 'clientHistory': {
      const q = ((req.params || {}).q || '').trim().toLowerCase();
      if (!q) return { ok: false, error: 'validation', message: 'A phone or email is required.' };
      const matches = clone(DATA).filter(
        (a) => a.phone.toLowerCase() === q || a.email.toLowerCase() === q
      );
      matches.sort((a, b) => (a.date === b.date ? (a.time < b.time ? 1 : -1) : a.date < b.date ? 1 : -1));
      const first = matches[0] || null;
      return {
        ok: true,
        data: {
          items: matches,
          count: matches.length,
          client: first ? { name: first.name, phone: first.phone, email: first.email } : null,
        },
      };
    }

    case 'dashboard': {
      const today = dayISO(0);
      const counts = { all: DATA.length, new: 0, confirmed: 0, rescheduled: 0, completed: 0, cancelled: 0 };
      DATA.forEach((a) => { if (counts[a.status] != null) counts[a.status]++; });
      const upcomingItems = DATA.filter((a) => ACTIVE_STATUSES.includes(a.status) && a.date >= today).sort(bySessionAsc);
      const weekEnd = dayISO(6);
      return {
        ok: true,
        data: {
          counts,
          today: DATA.filter((a) => a.date === today && !['cancelled', 'completed'].includes(a.status)).length,
          week: upcomingItems.filter((a) => a.date <= weekEnd).length,
          upcoming: upcomingItems.length,
        },
      };
    }

    case 'meta':
      return {
        ok: true,
        data: {
          blockedDates: clone(BLOCKED),
        },
      };

    case 'updateStatus': {
      const a = find(req.id);
      if (!a) return notFound();
      a.status = String(req.status).toLowerCase();
      a.updated_at = stamp(0, String(new Date().getHours()).padStart(2, '0'));
      return { ok: true, data: clone(a) };
    }

    case 'reschedule': {
      const a = find(req.id);
      if (!a) return notFound();
      const p = req.payload || {};
      a.date = p.date;
      a.time = p.time;
      a.status = 'rescheduled';
      a.updated_at = stamp(0, String(new Date().getHours()).padStart(2, '0'));
      return { ok: true, data: clone(a) };
    }

    case 'saveNotes': {
      const a = find(req.id);
      if (!a) return notFound();
      a.admin_notes = String(req.notes || '').slice(0, 2000);
      a.updated_at = stamp(0, String(new Date().getHours()).padStart(2, '0'));
      return { ok: true, data: clone(a) };
    }

    case 'addManual': {
      const p = req.payload || {};
      const now = new Date();
      const a = {
        id: 'APT-' + String(seq++).padStart(4, '0'),
        created_at: `${dayISO(0)}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`,
        name: p.name || '',
        email: (p.email || '').toLowerCase(),
        phone: p.phone || '',
        style: p.style || 'other',
        placement: p.placement || '',
        size: p.size || '',
        description: p.description || '',
        date: p.date || dayISO(0),
        time: p.time || '12:00',
        budget: p.budget || '',
        status: 'confirmed',
        admin_notes: '',
        updated_at: `${dayISO(0)}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`,
        source: 'manual',
      };
      DATA.push(a);
      return { ok: true, data: clone(a) };
    }

    case 'deleteAppointment': {
      const i = DATA.findIndex((x) => x.id === req.id);
      if (i === -1) return notFound();
      DATA.splice(i, 1);
      return { ok: true, data: { id: req.id } };
    }

    case 'blockDate': {
      const p = req.payload || {};
      if (!BLOCKED.some((b) => b.date === p.date)) BLOCKED.push({ date: p.date, reason: p.reason || '' });
      return { ok: true, data: { date: p.date } };
    }

    case 'unblockDate': {
      BLOCKED = BLOCKED.filter((b) => b.date !== (req.payload || {}).date);
      return { ok: true, data: { date: (req.payload || {}).date } };
    }

    default:
      return { ok: false, error: 'bad_request', message: `Unknown action in demo mode: ${action}` };
  }
}
