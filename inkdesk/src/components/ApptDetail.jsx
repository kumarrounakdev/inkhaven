import { useState } from 'react';
import { styleLabel, sizeLabel, ACTIVE_STATUSES } from '../lib/constants';
import { fmtDate, fmtTime } from '../lib/utils';

export default function ApptDetail({ appt, busy, onStatus, onReschedule, onDelete, onSaveNotes }) {
  const [notes, setNotes] = useState(appt.admin_notes || '');

  const isActive = ACTIVE_STATUSES.includes(appt.status);
  const notesDirty = notes !== (appt.admin_notes || '');
  // True while the studio has offered times and the client has not answered.
  const awaiting = appt.awaiting_customer === true && appt.status !== 'cancelled';
  const offers = awaiting && Array.isArray(appt.proposed_slots) ? appt.proposed_slots : [];

  return (
    <>
      {awaiting && (
        <section className="detail-section offer">
          <h3 className="detail-section__title">
            Waiting on the client
            <span className="detail-section__hint">offered, not yet moved</span>
          </h3>
          <p className="offer__lead">
            These times were emailed to {appt.name || 'the client'}. The booking still sits on{' '}
            <strong>
              {fmtDate(appt.date)} at {fmtTime(appt.time)}
            </strong>{' '}
            until they pick one through the website form — nothing is double-booked either way.
          </p>
          {offers.length > 0 && (
            <ul className="offer__slots">
              {offers.map((s) => (
                <li key={`${s.date} ${s.time}`} className="offer__slot">
                  <span>{fmtDate(s.date)}</span>
                  <span>{fmtTime(s.time)}</span>
                </li>
              ))}
            </ul>
          )}
          {appt.reschedule_note && <p className="quote">{appt.reschedule_note}</p>}
        </section>
      )}

      <section className="detail-section">
        <h3 className="detail-section__title">Appointment details</h3>
        <div className="detail-grid">
          <div className="detail">
            <div className="detail__label">Session</div>
            <div className="detail__value">
              {fmtDate(appt.date)} · {fmtTime(appt.time)}
            </div>
          </div>
          <div className="detail">
            <div className="detail__label">Style</div>
            <div className="detail__value">{styleLabel(appt.style)}</div>
          </div>
          <div className="detail">
            <div className="detail__label">Placement</div>
            <div className="detail__value">{appt.placement || '—'}</div>
          </div>
          <div className="detail">
            <div className="detail__label">Size</div>
            <div className="detail__value">{sizeLabel(appt.size)}</div>
          </div>
          <div className="detail">
            <div className="detail__label">Budget</div>
            <div className="detail__value">{appt.budget || '—'}</div>
          </div>
          <div className="detail">
            <div className="detail__label">Requested</div>
            <div className="detail__value">{fmtDate((appt.created_at || '').slice(0, 10))}</div>
          </div>
          {appt.description && (
            <div className="detail detail--full">
              <div className="detail__label">The idea</div>
              <p className="quote">{appt.description}</p>
            </div>
          )}
        </div>
      </section>

      <section className="detail-section">
        <h3 className="detail-section__title">
          Internal notes
          <span className="detail-section__hint">never shown to the client</span>
        </h3>
        <textarea
          className="detail__notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Deposit paid, healed well, wants a touch-up…"
        />
        <div className="form__actions">
          <button
            className="btn btn--ghost btn--sm"
            disabled={!notesDirty || busy}
            onClick={() => onSaveNotes(notes)}
          >
            {busy && notesDirty ? 'Saving…' : 'Save notes'}
          </button>
        </div>
      </section>

      <div className="detail__actions">
        {appt.status === 'new' && (
          <button className="btn btn--solid" disabled={busy} onClick={() => onStatus('confirmed')}>
            Confirm booking
          </button>
        )}
        {isActive && (
          <button className="btn btn--ghost" disabled={busy} onClick={onReschedule}>
            Reschedule
          </button>
        )}
        {isActive && appt.status !== 'new' && (
          <button className="btn btn--ghost" disabled={busy} onClick={() => onStatus('completed')}>
            Mark completed
          </button>
        )}
        {isActive && (
          <button className="btn btn--danger" disabled={busy} onClick={() => onStatus('cancelled')}>
            Cancel booking
          </button>
        )}
        <button className="btn btn--ghost btn--danger-ghost" disabled={busy} onClick={onDelete}>
          Delete
        </button>
      </div>
    </>
  );
}
