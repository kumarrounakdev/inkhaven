import { useState } from 'react'
import './FAQ.css'
import Container from '../../components/Container/Container'
import useScrollReveal from '../../lib/useScrollReveal'

const faqItems = [
  {
    id: 1,
    question: 'How do I book an appointment?',
    answer:
      'Use the booking form below and we will respond within 48 hours. Share your preferred style, placement, approximate size and the idea you have in mind so the consultation can start prepared.',
  },
  {
    id: 2,
    question: 'Do you take custom tattoo requests?',
    answer:
      'Yes — custom work is our focus. Every piece is developed around your idea, placement and preferred style, and refined into a design that is built specifically for you.',
  },
  {
    id: 3,
    question: 'How much does a tattoo cost?',
    answer:
      'Pricing depends on factors such as size, placement, style, level of detail and session time. Every quote is tailored to your specific piece — we will confirm the estimate during consultation.',
  },
  {
    id: 4,
    question: 'How should I prepare for my appointment?',
    answer:
      'Arrive rested and well hydrated, have eaten properly beforehand, and wear clothing that gives easy access to the area being tattooed.',
  },
  {
    id: 5,
    question: 'How long does a tattoo session take?',
    answer:
      'Session length varies depending on size, detail, placement and complexity. We will give you a clear idea of the expected duration when we plan your piece.',
  },
  {
    id: 6,
    question: 'Do you offer touch-ups?',
    answer:
      'Touch-ups depend on healing and the final condition of the tattoo. Talk to the studio about your piece and we will assess what is needed together.',
  },
  {
    id: 7,
    question: 'What tattoo styles do you specialize in?',
    answer:
      'We work across Fine Line, Blackwork, Realism, Geometric, Abstract and fully Custom designs.',
  },
  {
    id: 8,
    question: 'What should I do after getting tattooed?',
    answer:
      'Follow the studio’s specific aftercare instructions for cleaning and protection while the piece heals. If anything feels off, reach out and we will guide you through it.',
  },
]

function FAQItem({ item, isOpen, onToggle, reveal }) {
  const number = String(item.id).padStart(2, '0')
  const questionId = `faq-question-${item.id}`
  const answerId = `faq-answer-${item.id}`

  return (
    <li className={`faq__item${isOpen ? ' is-open' : ''}`} data-reveal={reveal ? '' : undefined}>
      <button
        id={questionId}
        className="faq__question"
        type="button"
        aria-expanded={isOpen}
        aria-controls={answerId}
        onClick={onToggle}
      >
        <span className="faq__number" aria-hidden="true">
          {number}
        </span>
        <span className="faq__question-text">{item.question}</span>
        <span className="faq__icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </button>

      <div className="faq__answer" id={answerId} role="region" aria-labelledby={questionId}>
        <div className="faq__answer-inner">
          <p className="faq__answer-text">{item.answer}</p>
        </div>
      </div>
    </li>
  )
}

function FAQ() {
  const [openId, setOpenId] = useState(null)
  const faqRef = useScrollReveal()

  const handleToggle = (id) => {
    setOpenId((prev) => (prev === id ? null : id))
  }

  return (
    <section className="faq section" id="faq" ref={faqRef}>
      <Container>
        <div className="faq__layout">
          <div className="faq__intro">
            <span className="label faq__eyebrow" data-reveal>07 / FAQ</span>
            <h2 className="faq__heading" data-reveal>
              <span className="faq__heading-line">Questions,</span>
              <span className="faq__heading-line faq__heading-line--alt">Answered.</span>
            </h2>
            <p className="faq__desc" data-reveal>Everything you need to know before getting inked.</p>
          </div>

          <ul className="faq__list">
            {faqItems.map((item) => (
              <FAQItem
                key={item.id}
                item={item}
                isOpen={openId === item.id}
                onToggle={() => handleToggle(item.id)}
                reveal
              />
            ))}
          </ul>
        </div>
      </Container>
    </section>
  )
}

export default FAQ