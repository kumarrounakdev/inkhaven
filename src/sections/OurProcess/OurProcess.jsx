import { useRef } from 'react'
import { useDeferredGsap } from '../../lib/useDeferredGsap'
import './OurProcess.css'

const processSteps = [
  {
    number: '01',
    title: 'YOUR IDEA',
    description:
      "Every tattoo starts somewhere. Bring us the idea, reference, feeling or story that's been sitting in your head.",
    details: ['REFERENCE', 'INSPIRATION', 'STORY'],
  },
  {
    number: '02',
    title: 'CONSULTATION',
    description:
      'We talk through your idea, placement, size, style and expectations to understand exactly what you want.',
    details: ['PLACEMENT', 'SIZE', 'STYLE'],
  },
  {
    number: '03',
    title: 'DESIGN',
    description:
      'Your idea is refined into a custom composition built specifically for you, your body and the way you want the piece to feel.',
    details: ['CUSTOM', 'COMPOSITION', 'REFINEMENT'],
  },
  {
    number: '04',
    title: 'THE SESSION',
    description:
      'Once the design is approved, the appointment begins. Precision, patience and attention to detail turn the design into permanent ink.',
    details: ['PREP', 'TATTOO', 'PRECISION'],
  },
  {
    number: '05',
    title: 'AFTERCARE',
    description:
      "The work doesn't end when you leave the studio. Follow the aftercare process carefully so the tattoo heals cleanly and keeps its detail.",
    details: ['HEAL', 'PROTECT', 'MAINTAIN'],
  },
]

function ProcessPanel({ step, ref }) {
  return (
    <article className="process__panel" ref={ref} aria-label={`Step ${step.number}: ${step.title}`}>
      <span className="process__number" aria-hidden="true">
        {step.number}
      </span>
      <div className="process__content">
        <span className="process__step">Step {step.number} / 05</span>
        <div className="process__body">
          <h3 className="process__title">
            {step.title.split(' ').map((line) => (
              <span key={line} className="process__title-line">
                {line}
              </span>
            ))}
          </h3>
          <p className="process__description">{step.description}</p>
          <ul className="process__details">
            {step.details.map((detail) => (
              <li key={detail} className="process__detail">
                {detail}
              </li>
            ))}
          </ul>
        </div>
        <span className="process__rule" aria-hidden="true" />
      </div>
    </article>
  )
}

function OurProcess() {
  const sectionRef = useRef(null)
  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const panelsRef = useRef([])

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useDeferredGsap(
    (gsap, ScrollTrigger) => {
      // The pinned horizontal scrub is a scroll-jacking experience, so it is
      // skipped entirely for reduced-motion users. OurProcess.css collapses the
      // track into a static vertical stack in that case, keeping the content
      // readable even though no animation is ever created.
      if (reduced) return
      const track = trackRef.current
      if (!track) return

      const getDistance = () => {
        const d = track.scrollWidth - window.innerWidth
        return d > 0 ? d : 0
      }

      gsap.from('.process__intro-item', {
        y: 40,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 75%' },
      })

      const fillEl = sectionRef.current.querySelector('.process__progress-fill')
      const countEl = sectionRef.current.querySelector('.process__progress-current')
      const panels = panelsRef.current.filter(Boolean)
      const total = panels.length

      // The pinned horizontal-scrub experience runs on all screen sizes so the
      // process section scrolls horizontally on mobile just like on desktop.
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => ScrollTrigger.refresh())
      }

      {
        const horizontal = gsap.to(track, {
          x: () => -getDistance(),
          ease: 'none',
          scrollTrigger: {
            trigger: '.process__horizontal',
            start: 'top top',
            end: () => '+=' + getDistance(),
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              if (fillEl) fillEl.style.transform = 'scaleX(' + self.progress + ')'
              if (countEl) {
                const index = Math.min(total - 1, Math.floor(self.progress * total))
                const label = String(index + 1).padStart(2, '0')
                if (countEl.textContent !== label) countEl.textContent = label
              }
            },
          },
        })

        panels.forEach((panel) => {
          const num = panel.querySelector('.process__number')
          const content = panel.querySelector('.process__content')

          if (content) {
            gsap.fromTo(
              content,
              { y: 50, opacity: 0.55 },
              {
                y: 0,
                opacity: 1,
                ease: 'none',
                duration: 1,
                scrollTrigger: {
                  containerAnimation: horizontal,
                  trigger: panel,
                  start: 'left 95%',
                  end: 'left 45%',
                  scrub: true,
                },
              },
            )
          }

          if (num) {
            gsap.fromTo(
              num,
              { xPercent: 4, opacity: 0.6 },
              {
                xPercent: -4,
                opacity: 1,
                ease: 'none',
                duration: 1,
                scrollTrigger: {
                  containerAnimation: horizontal,
                  trigger: panel,
                  start: 'left right',
                  end: 'right left',
                  scrub: true,
                },
              },
            )
          }
        })
      }
    },
    [],
    sectionRef,
  )

  return (
    <section className="process" id="process" ref={sectionRef}>
      <div className="process__intro">
        <span className="label process__intro-item">05 / The Process</span>
        <h2 className="process__intro-item process__heading">
          <span className="process__heading-line">From Idea</span>
          <span className="process__heading-line">To Ink.</span>
        </h2>
        <p className="process__intro-item process__sub">
          A considered process. A personal piece. Something made to stay.
        </p>
        <span className="process__intro-item process__hint">Scroll to explore →</span>
      </div>

      <div className="process__horizontal">
        <div className="process__viewport" ref={viewportRef}>
          <div className="process__track" ref={trackRef}>
            {processSteps.map((step) => (
              <ProcessPanel
                key={step.number}
                step={step}
                ref={(el) => {
                  panelsRef.current[step.number] = el
                }}
              />
            ))}
          </div>
        </div>

        <div className="process__progress" aria-hidden="true">
          <span className="process__progress-label">Step</span>
          <span className="process__progress-current">01</span>
          <span className="process__progress-line">
            <span className="process__progress-fill" />
          </span>
          <span className="process__progress-total">05</span>
        </div>
      </div>
    </section>
  )
}

export default OurProcess