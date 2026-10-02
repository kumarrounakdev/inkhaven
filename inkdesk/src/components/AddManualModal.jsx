import { useState } from 'react';
import Modal from './Modal';
import { STYLE_OPTIONS, SIZE_OPTIONS } from '../lib/constants';
import { todayISO } from '../lib/utils';

const INITIAL = {
  name: '',
  phone: '',
  email: '',
  style: 'blackwork',
  placement: '',
  size: 'medium',
  date: todayISO(),
  time: '13:00',
  budget: '',
  description: '',
};

export default function AddManualModal({ busy, onConfirm, onClose }) {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Client name is required.';
    if (form.phone.replace(/\D/g, '').length < 7) errs.phone = 'Enter a valid phone number.';
    if (form.placement.trim().length < 2) errs.placement = 'Placement is required.';
    if (!form.date) errs.date = 'Pick a date.';
    if (!form.time) errs.time = 'Pick a time.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onConfirm(form);
  }

  return (
    <Modal title="Add booking manually" onClose={onClose} wide>
      <form className="form" onSubmit={submit}>
        <p className="form__hint">
          For walk-ins, phone bookings and Instagram DMs. Saved as{' '}
          <strong>confirmed</strong> — a confirmation email goes out if you add an email.
        </p>
        <div className="form__row">
          <label className="field">
            Client name *
            <input value={form.name} onChange={set('name')} placeholder="Full name" autoFocus />
          </label>
          <label className="field">
            Phone *
            <input value={form.phone} onChange={set('phone')} placeholder="+91 98xxx xxxxx" inputMode="tel" />
          </label>
        </div>
        <div className="form__row">
          <label className="field">
            Email (optional)
            <input value={form.email} onChange={set('email')} placeholder="name@email.com" inputMode="email" />
          </label>
          <label className="field">
            Style
            <select value={form.style} onChange={set('style')}>
              {STYLE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form__row">
          <label className="field">
            Placement *
            <input value={form.placement} onChange={set('placement')} placeholder="Forearm, ribcage…" />
          </label>
          <label className="field">
            Size
            <select value={form.size} onChange={set('size')}>
              {SIZE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form__row">
          <label className="field">
            Date *
            <input type="date" value={form.date} onChange={set('date')} />
          </label>
          <label className="field">
            Time *
            <input type="time" value={form.time} onChange={set('time')} />
          </label>
        </div>
        <label className="field">
          Budget note (optional)
          <input value={form.budget} onChange={set('budget')} placeholder="₹15k–20k" />
        </label>
        <label className="field">
          Description (optional)
          <textarea
            rows={3}
            value={form.description}
            onChange={set('description')}
            placeholder="What they want — references discussed, sizing…"
          />
        </label>
        {Object.keys(errors).length > 0 && (
          <p className="form__error">{Object.values(errors).join(' ')}</p>
        )}
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--solid" disabled={busy}>
            {busy ? 'Saving…' : 'Add booking'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
