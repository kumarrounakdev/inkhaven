import { useEffect, useState } from 'react';
import Modal from './Modal';
import { api } from '../lib/api';
import { fmtDate, fmtTime, todayISO } from '../lib/utils';

const MAX_PICKS = 3;
const keyOf = (s) => `${s.date} ${s.time}`;

/**
 * Rescheduling has two very different shapes, and mixing them up is how clients
 * end up double-booked:
 *
 *   Offer (default) — suggest a few slots and let the client choose. Their
 *     current slot is left untouched until they answer, so the calendar is not
 *     left with a hole if they never reply.
 *
 *   Move — book the new slot directly. Useful when the client has already
 *     agreed to a time over the phone and re-confirming would be noise.
 */
export default function RescheduleModal({ appt, busy, onOffer, onMove, onClose }) {
  const [suggested, setSuggested] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [picked, setPicked] = useState([]);
  const [note, setNote] = useState('');

  const [date, setDate] = useState(appt.date);
  const [time, setTime] = useState(appt.time);
  const [moveError, setMoveError] = useState('');

  useEffect(() => {
    let live = true;
    setLoading(true);
    api
      .suggestSlots(appt.date)
      .then((items) => {
        if (!live) return;
        setSuggested(items || []);
        setLoadError('');
        // Pre-select the first suggestion: sending the offer is usually a
        // one-click action, and the admin can uncheck what they don't want.
        setPicked(items?.length ? [items[0]] : []);
      })
      .catch((err) => {
        if (!live) return;
        setLoadError(err.message || 'Could not load open slots.');
        setSuggested([]);
        setPicked([]);
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [appt.id, appt.date]);

  function toggle(slot) {
    const k = keyOf(slot);
    setPicked((cur) =>
      cur.some((s) => keyOf(s) === k)
        ? cur.filter((s) => keyOf(s) !== k)
        : cur.length >= MAX_PICKS
          ? cur
          : [...cur, slot]
    );
  }

  function submitOffer(e) {
    e.preventDefault();
    if (!picked.length) return;
    onOffer(picked, note.trim());
  }

  function submitMove(e) {
    e.preventDefault();
    if (!date || !time) {
      setMoveError('Pick a new date and time.');
      return;
    }
    if (date === appt.date && time === appt.time) {
      setMoveError('That is already the current slot.');
      return;
    }
    setMoveError('');
    onMove(date, time, note.trim());
  }

  return (
    <Modal title={`Reschedule ${appt.id}`} onClose={onClose}>
      <form className="form" onSubmit={submitOffer}>
        <p className="form__hint">
          Currently: <strong>{fmtDate(appt.date)} at {fmtTime(appt.time)}</strong>. Pick the times
          to offer and the client picks one from the booking form.
        </p>

        {loading && <p className="form__hint">Finding open slots…</p>}

        {!loading && loadError && (
          <p className="form__error">
            {loadError} You can still move the booking directly below.
          </p>
        )}

        {!loading && !loadError && !suggested.length && (
          <p className="form__hint">
            No open slots found in the next few months. Block some dates, or move the booking
            directly below.
          </p>
        )}

        {suggested.length > 0 && (
          <>
            <p className="form__label">
              Offer these times <span className="form__label-hint">(up to {MAX_PICKS})</span>
            </p>
            <div className="slot-picker">
              {suggested.map((s) => {
                const on = picked.some((p) => keyOf(p) === keyOf(s));
                return (
                  <button
                    type="button"
                    key={keyOf(s)}
                    className={`slot-picker__slot${on ? ' is-picked' : ''}`}
                    aria-pressed={on}
                    onClick={() => toggle(s)}
                  >
                    <span className="slot-picker__date">{fmtDate(s.date)}</span>
                    <span className="slot-picker__time">{fmtTime(s.time)}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <label className="field">
          Note to client (optional — included in the email)
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Artist unavailable that week — here are the next open slots."
            maxLength={600}
          />
        </label>

        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--solid" disabled={busy || !picked.length}>
            {busy ? 'Sending…' : `Email ${picked.length || ''} time${picked.length === 1 ? '' : 's'} to client`}
          </button>
        </div>
      </form>

      <details className="reschedule-move">
        <summary>Move it without asking</summary>
        <form className="form" onSubmit={submitMove}>
          <p className="form__hint">
            Books the new slot straight away. Use this only when the client has already agreed to a
            time — no email is sent.
          </p>
          <div className="form__row">
            <label className="field">
              New date
              <input type="date" value={date} min={todayISO()} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label className="field">
              New time
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </label>
          </div>
          {moveError && <p className="form__error">{moveError}</p>}
          <div className="form__actions">
            <button type="submit" className="btn btn--ghost" disabled={busy}>
              {busy ? 'Saving…' : 'Move without emailing'}
            </button>
          </div>
        </form>
      </details>
    </Modal>
  );
}
