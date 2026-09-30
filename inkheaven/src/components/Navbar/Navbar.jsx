import { useEffect, useRef, useState, useCallback } from 'react'
import './Navbar.css'

const desktopLinks = [
  { id: 'work', label: 'Work', anchor: '#work' },
  { id: 'styles', label: 'Styles', anchor: '#styles' },
  { id: 'artist', label: 'Artist', anchor: '#artist' },
  { id: 'process', label: 'Process', anchor: '#process' },
  { id: 'faq', label: 'FAQ', anchor: '#faq' },
]

const mobileLinks = [
  { id: 'top', label: 'Home', icon: 'home' },
  { id: 'work', label: 'Work', icon: 'work' },
  { id: 'styles', label: 'Styles', icon: 'styles' },
  { id: 'artist', label: 'Artist', icon: 'artist' },
  { id: 'booking', label: 'Booking', icon: 'booking' },
]

function Icon({ name }) {
  const paths = {
    home: (
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </>
    ),
    work: (
      <>
        <path d="M20 13.5H4v6h16z" />
        <path d="M8 13.5v-4a4 4 0 0 1 8 0v4" />
      </>
    ),
    styles: (
      <>
        <circle cx="12" cy="10" r="3" />
        <path d="M10 13l-3 7M14 13l3 7" />
      </>
    ),
    artist: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c.8-3.4 3.6-5 7-5s6.2 1.6 7 5" />
      </>
    ),
    booking: (
      <>
        <rect x="6" y="4" width="12" height="16" rx="2" />
        <path d="M9 4V2m6 2V2M8 11h8M8 15h5" />
      </>
    ),
  }
  return (
    <svg className="mob__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function Navbar() {
  const dockerRef = useRef(null)
  const [active, setActive] = useState('top')
  const reduced = useRef(false)

  useEffect(() => {
    reduced.current =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    const ids = ['top', ...desktopLinks.map((l) => l.id), 'booking']
    const visible = new Map()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio)
          } else {
            visible.delete(entry.target.id)
          }
        }
        let best = null
        let bestRatio = 0
        for (const [id, ratio] of visible) {
          if (ratio > bestRatio) {
            bestRatio = ratio
            best = id
          }
        }
        setActive(best || 'top')
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    )

    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  const handleDockMove = useCallback((e) => {
    if (reduced.current) return
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: none)').matches) return
    const dock = dockerRef.current
    if (!dock) return
    const links = dock.querySelectorAll('.dock__link, .dock__cta')
    const rect = dock.getBoundingClientRect()
    const cursorX = e.clientX

    for (const link of links) {
      const lr = link.getBoundingClientRect()
      const lc = lr.left + lr.width / 2
      const dist = Math.abs(lc - cursorX)
      const maxDist = rect.width * 0.6
      const t = Math.max(0, 1 - dist / maxDist)
      const scale = 1 + t * 0.16
      link.style.setProperty('--s', scale.toFixed(3))
    }
  }, [])

  const handleDockLeave = useCallback(() => {
    const dock = dockerRef.current
    if (!dock) return
    dock.querySelectorAll('.dock__link, .dock__cta').forEach((link) => {
      link.style.setProperty('--s', '1')
    })
  }, [])

  return (
    <>
      <nav className="dock" aria-label="Primary" ref={dockerRef}>
        <div className="dock__inner" onMouseMove={handleDockMove} onMouseLeave={handleDockLeave}>
          <a className="dock__brand" href="#top">Inkhaven</a>
          <span className="dock__divider" aria-hidden="true" />
          <ul className="dock__list">
            {desktopLinks.map((link) => (
              <li key={link.id} className="dock__item">
                <a
                  className={`dock__link${active === link.id ? ' is-active' : ''}`}
                  href={link.anchor}
                  aria-current={active === link.id ? 'true' : undefined}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <span className="dock__divider" aria-hidden="true" />
          <a className="dock__cta" href="#booking">Book</a>
        </div>
      </nav>

      <nav className="mob" aria-label="Primary mobile">
        <div className="mob__inner">
          {mobileLinks.map((link) => (
            <a
              key={link.id}
              className={`mob__link${active === link.id ? ' is-active' : ''}`}
              href={'#' + link.id}
              aria-label={link.label}
              aria-current={active === link.id ? 'true' : undefined}
            >
              <Icon name={link.icon} />
              <span className="mob__label">{link.label}</span>
            </a>
          ))}
        </div>
      </nav>
    </>
  )
}

export default Navbar
