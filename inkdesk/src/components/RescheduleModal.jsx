import { useState } from 'react';
import Modal from './Modal';
import { fmtDate, fmtTime, todayISO } from '../lib/utils';

export default function RescheduleModal({ appt, busy, onConfirm, onClose }) {
  const [date, setDate] = useState(appt.date);
  const [time, setTime] = useState(appt.time);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!date || !time) {
      setError('Pick a new date and time.');
      return;
    }
    if (date === appt.date && time === appt.time) {
      setError('That is already the current slot.');
      return;
    }
    setError('');
    onConfirm({ date, time, message: message.trim() });
  }

  return (
    <Modal title={`Reschedule ${appt.id}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <p className="form__hint">
          Currently: <strong>{fmtDate(appt.date)} at {fmtTime(appt.time)}</strong>. The client is
          emailed automatically with the new slot.
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
        <label className="field">
          Note to client (optional — included in the email)
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Artist unavailable that day — moved you to the next open slot."
          />
        </label>
        {error && <p className="form__error">{error}</p>}
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Keep current slot
          </button>
          <button type="submit" className="btn btn--solid" disabled={busy}>
            {busy ? 'Saving…' : 'Confirm new slot'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
