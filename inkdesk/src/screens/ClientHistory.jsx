import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { STATUS_LABEL, styleLabel, sizeLabel } from '../lib/constants';
import { fmtDate, fmtTime, initials, todayISO } from '../lib/utils';
import StatusBadge from '../components/StatusBadge';
import './ClientHistory.css';

export default function ClientHistory({ q, openDetail }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.clientHistory(q);
        if (live) setData(res);
      } catch (err) {
        if (live) setError(err.message || 'Could not load client history.');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [q]);

  const counts = (data?.items || []).reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <main className="page page--client">
      <div className="detail-topbar">
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => {
            window.history.back();
          }}
          aria-label="Back"
        >
          ← Back
        </button>
        <span className="detail-topbar__id">Client</span>
      </div>

      {loading ? (
        <div className="client-state">Loading client history…</div>
      ) : error ? (
        <div className="client-state is-error">{error}</div>
      ) : !data?.client ? (
        <div className="client-missing">
          <h2>No client found</h2>
          <p>No appointments match “{q}”. Try a phone or email that has booked before.</p>
          <button className="btn btn--ghost btn--sm" onClick={() => window.history.back()}>
            ← Back to bookings
          </button>
        </div>
      ) : (
        <>
          <div className="client-hero">
            <span className="avatar avatar--lg">{initials(data.client.name)}</span>
            <div className="client-hero__info">
              <h2 className="client-hero__name">
                {data.client.name}
                {data.count > 1 && <span className="client-hero__tag">Returning client</span>}
              </h2>
              <div className="client-hero__contact">
                {data.client.phone && (
                  <a className="btn btn--ghost btn--sm" href={`tel:${data.client.phone.replace(/\s+/g, '')}`}>
                    {data.client.phone}
                  </a>
                )}
                {data.client.email && (
                  <a className="btn btn--ghost btn--sm" href={`mailto:${data.client.email}`}>
                    {data.client.email}
                  </a>
                )}
              </div>
            </div>
            <div className="client-hero__meta">
              <span className="client-hero__count">{data.count} appointment{data.count === 1 ? '' : 's'}</span>
            </div>
          </div>

          <div className="client-strip">
            {['new', 'confirmed', 'rescheduled', 'completed', 'cancelled'].map((s) =>
              counts[s] ? (
                <span className="client-strip__item" key={s}>
                  <span className={`cd-dot cd-dot--${s}`} /> {STATUS_LABEL[s]}: {counts[s]}
                </span>
              ) : null
            )}
          </div>

          <div className="table-wrap">
            <table className="appt-table">
              <thead>
                <tr>
                  <th>Tattoo</th>
                  <th>Session</th>
                  <th>Status</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => (
                  <tr
                    key={a.id}
                    className={a.date === todayISO() ? 'row--today' : undefined}
                    onClick={() => openDetail(a.id)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && openDetail(a.id)}
                  >
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
                    <td className="cell-arrow" aria-hidden="true">
                      ›
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}