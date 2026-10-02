import { useRef, useState } from 'react'
import './BookingCTA.css'
import Container from '../../components/Container/Container'
import Button from '../../components/Button/Button'
import useScrollReveal from '../../lib/useScrollReveal'
import { getWebhookUrl } from '../../lib/webhookUrl'

const styleOptions = ['Fine Line', 'Blackwork', 'Realism', 'Geometric', 'Abstract', 'Custom']
const placementOptions = [
  'Arm',
  'Forearm',
  'Upper Arm',
  'Wrist',
  'Hand',
  'Chest',
  'Back',
  'Shoulder',
  'Ribs',
  'Leg',
  'Thigh',
  'Calf',
  'Ankle',
  'Other',
]
const sizeOptions = ['Small', 'Medium', 'Large', 'Full Sleeve', 'Large Back Piece', 'Not Sure']
const timeOptions = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']
const budgetOptions = [
  'Under ₹5,000',
  '₹5,000 — ₹10,000',
  '₹10,000 — ₹20,000',
  '₹20,000 — ₹40,000',
  '₹40,000+',
  'Not Sure',
]

// Booking requests go to this same-origin endpoint. The server reads the n8n
// webhook URL from its own environment and forwards, so no webhook URL is
// ever shipped to the browser.
const BOOKING_ENDPOINT = '/api/bookings'

function Field({ id, label, required, error, children }) {
  return (
    <div className={`booking__field${error ? ' is-error' : ''}`}>
      <label className="booking__label" htmlFor={id}>
        {label}
        {required && (
          <span className="booking__label-mark" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <span className="booking__error" id={`${id}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

/** Formats user input into a dd-mm-yyyy mask as they type. */
function formatDateDmy(raw) {
  const digits = String(raw).replace(/\D/g, '').slice(0, 8)
  const parts = []
  if (digits.length > 4) parts.push(digits.slice(0, 2), digits.slice(2, 4), digits.slice(4))
  else if (digits.length > 2) parts.push(digits.slice(0, 2), digits.slice(2))
  else if (digits.length) parts.push(digits)
  return parts.join('-')
}

/** Validates dd-mm-yyyy and returns 'YYYY-MM-DD' for the API (or null when invalid). */
function dateDmyToIso(dmy) {
  const m = String(dmy).match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (!m) return null
  const [, dd, mm, yyyy] = m
  const d = Number(dd)
  const mo = Number(mm)
  const y = Number(yyyy)
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const iso = `${yyyy}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const check = new Date(y, mo - 1, d)
  if (check.getFullYear() !== y || check.getMonth() !== mo - 1 || check.getDate() !== d) return null
  return iso
}

/** Converts 'YYYY-MM-DD' from the native picker to the dd-mm-yyyy display form. */
function isoToDmy(iso) {
  if (!iso) return ''
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso
}

function CalendarIcon() {
  return (
    <svg
      className="booking__calendar-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}

function SelectArrow() {
  return (
    <svg
      className="booking__select-arrow"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function SubmitArrow() {
  return (
    <svg
      className="booking__submit-arrow"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function BookingForm({ onSubmit }) {
  const datePickerRef = useRef(null)
  const [values, setValues] = useState({
    name: '',
    email: '',
    phone: '',
    style: '',
    placement: '',
    size: '',
    description: '',
    date: '',
    time: '',
    budget: '',
  })
  const [errors, setErrors] = useState({})
  const [companyId, setCompanyId] = useState('') // honeypot — humans never see it
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    const nextValue = name === 'date' ? formatDateDmy(value) : value
    setValues((prev) => ({
      ...prev,
      [name]: nextValue,
    }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    const next = {}
    if (!values.name.trim()) next.name = 'Please enter your name.'
    if (!values.email.trim()) next.email = 'Please enter your email address.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      next.email = 'Enter a valid email address.'
    }
    if (!values.phone.trim()) next.phone = 'Please enter your phone or WhatsApp number.'
    if (!values.style) next.style = 'Select a tattoo style.'
    if (!values.placement) next.placement = 'Select a placement.'
    if (!values.size) next.size = 'Select an approximate size.'
    if (!values.description.trim()) next.description = 'Tell us a little about your tattoo.'
    const dateIso = values.date ? dateDmyToIso(values.date) : null
    if (!dateIso) next.date = 'Enter the date as dd-mm-yyyy.'
    if (!values.time) next.time = 'Select a preferred time.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    // Honeypot filled => bot. Pretend it worked so it learns nothing, send nothing.
    if (companyId.trim()) {
      onSubmit()
      return
    }

    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch(BOOKING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Only consulted when the server runs with
          // ALLOW_CLIENT_WEBHOOK_OVERRIDE=1; ignored otherwise.
          ...(getWebhookUrl() ? { 'x-webhook-url': getWebhookUrl() } : {}),
        },
        body: JSON.stringify({
          ...values,
          dateIso,
          budget: values.budget || null,
          // Honeypot: empty for humans, filled by bots. The server drops those
          // silently, so filtering still works for clients bypassing this form.
          company: companyId,
          page: window.location.href,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed (${res.status})`)
      }
      onSubmit()
    } catch (err) {
      setSubmitError(
        err.message && !err.message.startsWith('Failed to fetch')
          ? err.message
          : 'We could not send your request. Please try again, or email us directly.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="booking__form" aria-label="Book an appointment" onSubmit={handleSubmit} noValidate>
      <fieldset className="booking__step">
        <legend className="booking__sr-only">Your details</legend>
        <div className="booking__step-header">
          <span className="booking__step-title">Your details</span>
        </div>
        <div className="booking__grid-2">
          <Field id="booking-name" label="Full name" required error={errors.name}>
            <input
              className="booking__input"
              id="booking-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={values.name}
              onChange={handleChange}
              required
              aria-describedby={errors.name ? 'booking-name-error' : undefined}
            />
          </Field>
          <Field id="booking-email" label="Email" required error={errors.email}>
            <input
              className="booking__input"
              id="booking-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={values.email}
              onChange={handleChange}
              required
              aria-describedby={errors.email ? 'booking-email-error' : undefined}
            />
          </Field>
        </div>
        <div className="booking__fields">
          <Field id="booking-phone" label="Phone / WhatsApp" required error={errors.phone}>
            <input
              className="booking__input"
              id="booking-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="Your number"
              value={values.phone}
              onChange={handleChange}
              required
              aria-describedby={errors.phone ? 'booking-phone-error' : undefined}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="booking__step">
        <legend className="booking__sr-only">Tattoo details</legend>
        <div className="booking__step-header">
          <span className="booking__step-title">Tattoo details</span>
        </div>
        <div className="booking__grid-2">
          <Field id="booking-style" label="Tattoo style" required error={errors.style}>
            <div className="booking__select-wrap">
              <select
                className="booking__select"
                id="booking-style"
                name="style"
                value={values.style}
                onChange={handleChange}
                required
                aria-describedby={errors.style ? 'booking-style-error' : undefined}
              >
                <option value="" disabled>
                  Select a style
                </option>
                {styleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <SelectArrow />
            </div>
          </Field>
          <Field id="booking-placement" label="Placement" required error={errors.placement}>
            <div className="booking__select-wrap">
              <select
                className="booking__select"
                id="booking-placement"
                name="placement"
                value={values.placement}
                onChange={handleChange}
                required
                aria-describedby={errors.placement ? 'booking-placement-error' : undefined}
              >
                <option value="" disabled>
                  Select placement
                </option>
                {placementOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <SelectArrow />
            </div>
          </Field>
        </div>
        <div className="booking__fields">
          <Field id="booking-size" label="Approximate size" required error={errors.size}>
            <div className="booking__select-wrap">
              <select
                className="booking__select"
                id="booking-size"
                name="size"
                value={values.size}
                onChange={handleChange}
                required
                aria-describedby={errors.size ? 'booking-size-error' : undefined}
              >
                <option value="" disabled>
                  Select size
                </option>
                {sizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <SelectArrow />
            </div>
          </Field>
          <Field id="booking-description" label="Tell us about your tattoo" required error={errors.description}>
            <textarea
              className="booking__textarea"
              id="booking-description"
              name="description"
              rows="6"
              placeholder="Describe your idea, references, placement, and anything else you'd like the artist to know..."
              value={values.description}
              onChange={handleChange}
              required
              aria-describedby={errors.description ? 'booking-description-error' : undefined}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="booking__step">
        <legend className="booking__sr-only">Preferences</legend>
        <div className="booking__step-header">
          <span className="booking__step-title">Preferences</span>
        </div>
        <div className="booking__fields">
          <Field id="booking-date" label="Preferred date" required error={errors.date}>
            <div className="booking__date-wrap">
              <input
                className="booking__input booking__date-input"
                id="booking-date"
                name="date"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="DD-MM-YYYY"
                maxLength={10}
                value={values.date}
                onChange={handleChange}
                required
                aria-describedby={errors.date ? 'booking-date-error' : undefined}
              />
              <span className="booking__calendar-icon" aria-hidden="true">
                <CalendarIcon />
              </span>
              <input
                ref={datePickerRef}
                className="booking__date-picker-native"
                type="date"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  const iso = e.target.value
                  if (iso) {
                    setValues((prev) => ({ ...prev, date: isoToDmy(iso) }))
                    setErrors((prev) => (prev.date ? { ...prev, date: undefined } : prev))
                  }
                  e.target.value = ''
                }}
              />
            </div>
          </Field>
        </div>
        <div className="booking__grid-2">
          <Field id="booking-time" label="Preferred time" required error={errors.time}>
            <div className="booking__select-wrap">
              <select
                className="booking__select"
                id="booking-time"
                name="time"
                value={values.time}
                onChange={handleChange}
                required
                aria-describedby={errors.time ? 'booking-time-error' : undefined}
              >
                <option value="" disabled>
                  Select time
                </option>
                {timeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <SelectArrow />
            </div>
          </Field>
          <Field id="booking-budget" label="Budget range">
            <div className="booking__select-wrap">
              <select
                className="booking__select"
                id="booking-budget"
                name="budget"
                value={values.budget}
                onChange={handleChange}
              >
                <option value="" disabled>
                  Optional
                </option>
                {budgetOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <SelectArrow />
            </div>
          </Field>
        </div>
      </fieldset>

      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        value={companyId}
        onChange={(e) => setCompanyId(e.target.value)}
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }}
      />

      <Button type="submit" className="booking__submit" disabled={submitting}>
        {submitting ? 'Sending...' : 'Request Appointment'}
        <SubmitArrow />
      </Button>
      {submitError && (
        <p className="booking__submit-error" role="alert">
          {submitError}
        </p>
      )}
      <div className="booking__fineprint">
        <p>Appointments are confirmed after consultation.</p>
        <p>Submitting this request does not guarantee a booking.</p>
      </div>
    </form>
  )
}

function BookingSuccess({ onReset }) {
  return (
    <div className="booking__success" role="status">
      <span className="label booking__success-eyebrow">Request received</span>
      <p className="booking__success-title">Your request is in.</p>
      <p className="booking__success-text">
        We'll review your tattoo details and contact you with availability and next steps. Your appointment is
        only confirmed after a consultation.
      </p>
      <button className="booking__success-reset" type="button" onClick={onReset}>
        Back to form
      </button>
    </div>
  )
}

function BookingCTA() {
  const [submitted, setSubmitted] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const bookingRef = useScrollReveal()

  return (
    <section className="booking section" id="booking" ref={bookingRef}>
      <Container>
        <div className="booking__layout">
          <div className="booking__intro">
            <span className="label booking__eyebrow" data-reveal>08 / Appointment</span>
            <h2 className="booking__title" data-reveal>
              <span className="booking__title-line">Book an</span>
              <span className="booking__title-line booking__title-line--accent">appointment.</span>
            </h2>
            <p className="booking__lead" data-reveal>Let's create something permanent.</p>
            <p className="booking__description" data-reveal>
              Tell us about your tattoo and we'll get back to you with availability and next steps.
            </p>
            <ul className="booking__notes" data-reveal>
              <li className="booking__notes-item">Studio — Delhi, by appointment</li>
              <li className="booking__notes-item">Mon — Sat · 11:00 — 19:00</li>
              <li className="booking__notes-item">We reply within 24 — 48 hours</li>
            </ul>
          </div>

          <div className="booking__form-wrapper" data-reveal>
            {submitted ? (
              <BookingSuccess
                onReset={() => {
                  setSubmitted(false)
                  setFormKey((key) => key + 1)
                }}
              />
            ) : (
              <BookingForm key={formKey} onSubmit={() => setSubmitted(true)} />
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}

export default BookingCTA