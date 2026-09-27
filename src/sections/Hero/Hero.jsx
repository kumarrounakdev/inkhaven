import { useRef } from 'react'
import { useDeferredGsap } from '../../lib/useDeferredGsap'
import './Hero.css'

const headlineLines = ['Your story.', 'Inked for', 'life.']

function Hero() {
  const root = useRef(null)

  useDeferredGsap(
    (gsap) => {
      if (
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return
      }

      const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 1 } })
      tl.from('.hero__num', { opacity: 0, duration: 1.4 }, 0.2)
        .from(
          '.hero__line',
          { yPercent: 115, duration: 1.1, stagger: 0.09, ease: 'power4.out' },
          0,
        )
        .from(
          '.hero__image-inner',
          { scale: 1.07, duration: 1.4, ease: 'power2.out' },
          0.1,
        )
        .from(
          '.hero__sub',
          { y: 24, opacity: 0, duration: 0.9 },
          0.75,
        )
        .from(
          '.hero__actions > *',
          { y: 18, opacity: 0, duration: 0.8, stagger: 0.08 },
          0.85,
        )
        .from(
          '.hero__top',
          { opacity: 0, duration: 0.8 },
          0.9,
        )
    },
    [],
    root,
  )

  return (
    <section className="hero" id="top" ref={root}>
      <span className="hero__num" aria-hidden="true">01</span>

      <div className="hero__top">
        <span className="hero__meta">Inkhaven®</span>
        <span className="hero__meta hero__meta--right">
          Delhi / India · Est. 2018
        </span>
      </div>

      <div className="hero__main">
        <div className="hero__copy">
          <h1 className="hero__headline">
            {headlineLines.map((line) => (
              <span className="hero__line-mask" key={line}>
                <span className="hero__line">{line}</span>
              </span>
            ))}
          </h1>

          <p className="hero__sub">
            Custom tattoos, designed with intention and crafted to last.
          </p>

          <div className="hero__actions">
            <a className="hero__cta hero__cta--primary" href="#booking">
              Book a Session
              <span className="hero__arrow" aria-hidden="true">→</span>
            </a>
            <a className="hero__cta hero__cta--secondary" href="#work">
              View Our Work
              <span className="hero__arrow" aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        <figure className="hero__image">
          <div className="hero__image-inner">
            <picture>
              <source
                srcSet="/images/hero-section/hero-image-480.webp 480w, /images/hero-section/hero-image-800.webp 800w, /images/hero-section/hero-image.webp 928w"
                type="image/webp"
                sizes="(min-width: 768px) 56vw, 100vw"
              />
              <img
                className="hero__img"
                src="/images/hero-section/hero-image.webp"
                alt="Artist hand at work applying fine-line blackwork ink during a studio session"
                width="928"
                height="1152"
                fetchPriority="high"
                loading="eager"
                decoding="async"
              />
            </picture>
          </div>
        </figure>
      </div>
    </section>
  )
}

export default Hero
