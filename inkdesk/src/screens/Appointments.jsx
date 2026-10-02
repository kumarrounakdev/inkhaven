import { useEffect, useMemo, useRef, useState } from 'react';
import { api, isDemo } from '../lib/api';
import { SCOPE_OPTIONS, STATUS_LABEL, STATUS_ORDER, styleLabel, sizeLabel } from '../lib/constants';
import { fmtDate, fmtTime, initials, todayISO } from '../lib/utils';
import ApptDetail from '../components/ApptDetail';
import Modal from '../components/Modal';
import RescheduleModal from '../components/RescheduleModal';
import AddManualModal from '../components/AddManualModal';
import SettingsModal from '../components/SettingsModal';
import StatusBadge from '../components/StatusBadge';
import Toast from '../components/Toast';
import ClientHistory from './ClientHistory';
import './Appointments.css';

export default function Appointments() {
  const [items, setItems] = useState([]);
  const [dash, setDash] = useState(null);
  const [filters, setFilters] = useState({ q: '', status: 'all', scope: 'upcoming' });
  const [debouncedQ, setDebouncedQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [viewId, setViewId] = useState(null); // appointment id shown on the detail page
  const [clientQ, setClientQ] = useState(null); // phone/email shown on the client history page
  const [modal, setModal] = useState(null); // { type: 'reschedule'|'delete'|'add', appt }
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const searchRef = useRef(null);

  /* debounce search */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q.trim()), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  /* load list + dashboard */
  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [list, dashboard] = await Promise.all([
          api.list({ q: debouncedQ, status: filters.status, scope: filters.scope }),
          api.dashboard(),
        ]);
        if (!live) return;
        setItems(list);
        setDash(dashboard);
      } catch (err) {
        if (!live) return;
        setError(err.message || 'Could not load appointments.');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [debouncedQ, filters.status, filters.scope, reloadKey]);

  /* auto-dismiss toast */
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const drawerAppt = useMemo(
    () => items.find((i) => i.id === viewId) || null,
    [items, viewId]
  );

  const sortedItems = useMemo(() => {
    if (!sort.key) return items;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return items
      .slice()
      .sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        if (av == null && bv == null) return 0;
        if (av == null) return 1 * dir;
        if (bv == null) return -1 * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
  }, [items, sort]);

  function toggleSort(key) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    );
  }

  const CSV_HEADERS = [
    'id', 'name', 'email', 'phone', 'date', 'time', 'style', 'placement', 'size',
    'budget', 'description', 'status', 'admin_notes', 'source', 'created_at', 'updated_at',
  ];

  function exportCsv() {
    const esc = (v) => {
      const s = String(v == null ? '' : v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [
      CSV_HEADERS.join(','),
      ...sortedItems.map((a) => CSV_HEADERS.map((h) => esc(a[h])).join(',')),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inkdesk-${todayISO()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /* hash routing — clicking a row opens a real detail page (URL #/appt/<id>)
     or client history (#/client/<q>) so the browser back/forward navigates naturally. */
  useEffect(() => {
    const onHash = () => {
      const appt = window.location.hash.match(/^#\/appt\/(.+)$/);
      const client = window.location.hash.match(/^#\/client\/(.+)$/);
      setViewId(appt ? decodeURIComponent(appt[1]) : null);
      setClientQ(client ? decodeURIComponent(client[1]) : null);
    };
    window.addEventListener('hashchange', onHash);
    onHash();
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  /* keyboard shortcuts — / focus search, n add booking, Esc close */
  useEffect(() => {
    function onKey(e) {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select?.();
      } else if (e.key.toLowerCase() === 'n' && !typing && !viewId) {
        e.preventDefault();
        setModal({ type: 'add' });
      } else if (e.key === 'Escape') {
        if (viewId) closeDetail();
        else setModal(null);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [viewId]);

  function openDetail(id) {
    window.location.hash = `/appt/${encodeURIComponent(id)}`;
  }
  function openClient(q) {
    window.location.hash = `/client/${encodeURIComponent(q)}`;
  }
  function closeDetail() {
    if (window.location.hash) window.location.hash = '';
    else {
      setViewId(null);
      setClientQ(null);
    }
  }

  async function run(action, successMsg) {
    setBusy(true);
    try {
      await action();
      setToast({ type: 'ok', msg: successMsg });
      setModal(null);
      closeDetail();
      setReloadKey((k) => k + 1);
    } catch (err) {
      setToast({ type: 'err', msg: err.message || 'Action failed.' });
    } finally {
      setBusy(false);
    }
  }

  const stats = dash
    ? [
        { label: 'Pending requests', value: dash.counts?.new ?? 0, accent: 'new' },
        { label: 'Upcoming sessions', value: dash.upcoming ?? 0, accent: 'confirmed' },
        { label: 'This week', value: dash.week ?? 0, accent: undefined },
        { label: 'Today', value: dash.today ?? 0, accent: 'rescheduled' },
      ]
    : [];

  const hasActiveFilters = !!filters.q || filters.status !== 'all';

  return (
    <div className="appointments">
      <header className="app-header">
        <div className="app-header__inner">
          <div>
            <h1 className="app-header__title">Bookings</h1>
            <p className="app-header__sub">
              {isDemo() ? 'Demo mode — sample data' : 'Studio appointment manager'}
            </p>
          </div>
          <div className="app-header__actions">
            {isDemo() && (
              <span className="demo-pill" title="Demo mode — data lives only in this browser and is not sent anywhere">
                DEMO
              </span>
            )}
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setReloadKey((k) => k + 1)}
              disabled={loading}
            >
              Refresh
            </button>
            <button className="btn btn--ghost btn--sm" onClick={exportCsv} disabled={sortedItems.length === 0}>
              Export
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowSettings(true)}>
              Settings
            </button>
            <button className="btn btn--solid btn--sm" onClick={() => setModal({ type: 'add' })}>
              + Add booking
            </button>
          </div>
        </div>
      </header>

      {isDemo() && (
        <div className="page">
          <div className="banner">
            <span>
              <strong>Demo mode</strong> — sample data lives only in this browser and is never
              sent anywhere. Open <strong>Settings</strong> to connect your n8n webhook when you
              are ready.
            </span>
          </div>
        </div>
      )}

      {clientQ ? (
        <ClientHistory q={clientQ} openDetail={openDetail} />
      ) : !viewId ? (
        <main className="page">
          <section className="stats" aria-label="Summary">
            {stats.map((s) => (
              <div className="stat-card" key={s.label}>
                <div className="stat-card__label">{s.label}</div>
                <div className={`stat-card__value${s.accent ? ` stat-card__value--${s.accent}` : ''}`}>
                  {s.value}
                </div>
              </div>
            ))}
          </section>

          <div className="filters">
            <input
              className="filters__search"
              type="search"
              placeholder="Search name, phone, email or ID…"
              value={filters.q}
              ref={searchRef}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              aria-label="Search appointments"
            />
            <select
              className="filters__scope"
              value={filters.scope}
              onChange={(e) => setFilters((f) => ({ ...f, scope: e.target.value }))}
              aria-label="Date range"
            >
              {SCOPE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <div className="chips" role="tablist" aria-label="Filter by status">
              <button
                className={`chip${filters.status === 'all' ? ' is-active' : ''}`}
                role="tab"
                aria-selected={filters.status === 'all'}
                onClick={() => setFilters((f) => ({ ...f, status: 'all' }))}
              >
                All{dash ? ` · ${dash.counts.all}` : ''}
              </button>
              {STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  className={`chip${filters.status === s ? ' is-active' : ''}`}
                  role="tab"
                  aria-selected={filters.status === s}
                  onClick={() => setFilters((f) => ({ ...f, status: s }))}
                >
                  {STATUS_LABEL[s]}{dash ? ` · ${dash.counts[s] ?? 0}` : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <table className="appt-table">
              <thead>
                <tr>
                  {[
                    { key: 'name', label: 'Client' },
                    { key: 'style', label: 'Tattoo' },
                    { key: 'date', label: 'Session' },
                    { key: 'status', label: 'Status' },
                    { key: 'created_at', label: 'Requested' },
                  ].map((col) => (
                    <th key={col.key}>
                      <button
                        className={`th-sort${sort.key === col.key ? ' is-sorted' : ''}`}
                        onClick={() => toggleSort(col.key)}
                        aria-label={`Sort by ${col.label}`}
                      >
                        {col.label}
                        <span className="th-sort__arrow" aria-hidden="true">
                          {sort.key === col.key
                            ? sort.dir === 'asc'
                              ? '▲'
                              : '▼'
                            : ''}
                        </span>
                      </button>
                    </th>
                  ))}
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr className="table-state">
                    <td colSpan={6}>Loading…</td>
                  </tr>
                )}
                {!loading && error && (
                  <tr className="table-state is-error">
                    <td colSpan={6}>
                      {error}
                      <button
                        className="btn btn--ghost btn--sm table-state__retry"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReloadKey((k) => k + 1);
                        }}
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                )}
                {!loading && !error && items.length === 0 && (
                  <tr className="table-state">
                    <td colSpan={6}>
                      <div className="empty-state">
                        <span className="empty-state__title">
                          {hasActiveFilters ? 'No appointments match your filters.' : 'No appointments here yet.'}
                        </span>
                        {hasActiveFilters ? (
                          <button
                            className="btn btn--ghost btn--sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFilters((f) => ({ ...f, q: '', status: 'all' }));
                            }}
                          >
                            Clear filters
                          </button>
                        ) : (
                          <button
                            className="btn btn--solid btn--sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setModal({ type: 'add' });
                            }}
                          >
                            + Add booking
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                {!loading &&
                  !error &&
                  sortedItems.map((a) => (
                    <tr
                      key={a.id}
                      className={a.date === todayISO() ? 'row--today' : undefined}
                      onClick={() => openDetail(a.id)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && openDetail(a.id)}
                    >
                      <td>
                        <div className="cell-client">
                          <span className="avatar">{initials(a.name)}</span>
                          <span>
                            <span className="cell-client__name">{a.name}</span>
                            <span className="cell-client__meta">
                              {a.phone}
                              {a.email ? ` · ${a.email}` : ''}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="cell-strong">{styleLabel(a.style)}</span>
                        <span className="cell-sub">
                          {a.placement}
                          {a.size ? ` · ${sizeLabel(a.size)}` : ''}
                        </span>
                      </td>
                      <td>
                        <span className="cell-strong">{fmtDate(a.date)}</span>
                        <span className="cell-sub">{fmtTime(a.time)}</span>
                      </td>
                      <td>
                        <div className="cell-status">
                          <StatusBadge status={a.status} />
                          {a.source === 'manual' && <span className="tag">manual</span>}
                        </div>
                      </td>
                      <td className="cell-muted">{fmtDate((a.created_at || '').slice(0, 10))}</td>
                      <td className="cell-arrow" aria-hidden="true">
                        ›
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
      </main>
      ) : drawerAppt ? (
        <main className="page page--detail">
          <div className="detail-topbar">
            <button className="btn btn--ghost btn--sm" onClick={closeDetail} aria-label="Back to bookings">
              ← Back to bookings
            </button>
            <span className="detail-topbar__id">{drawerAppt.id}</span>
          </div>

          <div className="detail-hero">
            <span className="avatar avatar--lg detail-hero__avatar">{initials(drawerAppt.name)}</span>
            <div className="detail-hero__info">
              <h2 className="detail-hero__name">{drawerAppt.name}</h2>
              <p className="detail-hero__sub">
                {fmtDate(drawerAppt.date)} at {fmtTime(drawerAppt.time)}
              </p>
              <div className="detail-hero__contact">
                {drawerAppt.phone && (
                  <a className="btn btn--ghost btn--sm" href={`tel:${drawerAppt.phone.replace(/\s+/g, '')}`}>
                    {drawerAppt.phone}
                  </a>
                )}
                {drawerAppt.email && (
                  <a className="btn btn--ghost btn--sm" href={`mailto:${drawerAppt.email}`}>
                    {drawerAppt.email}
                  </a>
                )}
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => openClient(drawerAppt.phone || drawerAppt.email)}
                >
                  View client history
                </button>
              </div>
            </div>
            <div className="detail-hero__status">
              <StatusBadge status={drawerAppt.status} />
              {drawerAppt.source === 'manual' && <span className="tag">manual</span>}
            </div>
          </div>

          <div className="detail-card">
            <ApptDetail
              key={drawerAppt.id}
              appt={drawerAppt}
              busy={busy}
              onStatus={(status) =>
                run(
                  () => api.updateStatus(drawerAppt.id, status),
                  status === 'confirmed'
                    ? 'Confirmed — confirmation email sent'
                    : status === 'completed'
                      ? 'Marked completed'
                      : 'Cancelled — client notified by email'
                )
              }
              onReschedule={() => setModal({ type: 'reschedule', appt: drawerAppt })}
              onDelete={() => setModal({ type: 'delete', appt: drawerAppt })}
              onSaveNotes={(notes) =>
                run(() => api.saveNotes(drawerAppt.id, notes), 'Notes saved')
              }
            />
          </div>
        </main>
      ) : (
        <main className="page">
          <div className="detail-missing">
            <h2>Appointment not found</h2>
            <p>The selected appointment could not be found. It may have been removed or is outside the current view.</p>
            <button className="btn btn--ghost btn--sm" onClick={closeDetail}>
              ← Back to bookings
            </button>
          </div>
        </main>
      )}

      {modal?.type === 'reschedule' && (
        <RescheduleModal
          appt={modal.appt}
          busy={busy}
          onClose={() => setModal(null)}
          onConfirm={({ date, time, message }) =>
            run(
              () => api.reschedule(modal.appt.id, { date, time, message }),
              `Moved to ${fmtDate(date)} — client emailed`
            )
          }
        />
      )}

      {modal?.type === 'delete' && (
        <Modal title={`Delete ${modal.appt.id}?`} onClose={() => setModal(null)}>
          <div className="form">
            <p className="form__hint">
              This permanently removes <strong>{modal.appt.name}</strong> ({fmtDate(modal.appt.date)}{' '}
              at {fmtTime(modal.appt.time)}) from your booking data. If you just want to free the
              slot, cancel instead — delete is for spam and mistakes. Keep a backup in your
              workflow if you need an undo.
            </p>
            <div className="form__actions">
              <button className="btn btn--ghost" onClick={() => setModal(null)}>
                Keep it
              </button>
              <button
                className="btn btn--danger"
                disabled={busy}
                onClick={() => run(() => api.deleteAppointment(modal.appt.id), 'Deleted')}
              >
                {busy ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal?.type === 'add' && (
        <AddManualModal
          busy={busy}
          onClose={() => setModal(null)}
          onConfirm={(payload) => run(() => api.addManual(payload), 'Booking added')}
        />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} onEndpointChanged={() => setReloadKey((k) => k + 1)} />
      )}

      <Toast toast={toast} />
    </div>
  );
}
