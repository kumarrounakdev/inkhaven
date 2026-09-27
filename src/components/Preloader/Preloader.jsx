import { useLayoutEffect, useRef, useState } from 'react'
import { useDeferredGsap } from '../../lib/useDeferredGsap'
import './Preloader.css'

// Hard ceiling: never stuck at 0% / 50% / 99%, even if a resource fails.
const MAX_WAIT = 3200
// Floor: keep the reveal from reading as a blink on cached/hot loads.
// MIN_SHOW + finalize + hold + exits ≈ 2.4s total.
const MIN_SHOW = 1200
const pad = (n) => String(n).padStart(3, '0')

function Preloader() {
  const overlay = useRef(null)
  const content = useRef(null)
  const pct = useRef(null)
  const bar = useRef(null)
  const readyRef = useRef(null)
  const prevOverflow = useRef('')
  const cancelledRef = useRef(true)
  const [hidden, setHidden] = useState(false)

  // Scroll lock + the "critical resources are in" signal. Runs once; never
  // touches Lenis. The preloader itself is the only global side-effects owner.
  // MUST be a layout effect declared BEFORE useGSAP: useGSAP also uses a layout
  // effect, and it depends on readyRef.current being populated here first.
  useLayoutEffect(() => {
    cancelledRef.current = false
    prevOverflow.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    let timers = []
    const gates = new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve()
        return
      }
      let settled = false
      const done = () => {
        if (settled) return
        settled = true
        resolve()
      }
      window.addEventListener('load', done, { once: true })
      const guard = window.setTimeout(done, MAX_WAIT)
      timers.push(() => window.clearTimeout(guard))
    })
    // Font readiness is deliberately advisory: font-display: swap already lets
    // the brand paint, and fonts.ready resolves near-instantly on cached loads,
    // which used to shortcut the whole gate. The load event + MIN_SHOW floor
    // are the real release criteria (plus MAX_WAIT as the hard ceiling).
    document.fonts?.ready?.catch(() => {})
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
    const minShow = new Promise((resolve) => {
      if (reduce) {
        resolve()
        return
      }
      const floorTimer = window.setTimeout(resolve, MIN_SHOW)
      timers.push(() => window.clearTimeout(floorTimer))
    })
    readyRef.current = Promise.all([gates, minShow])

    return () => {
      cancelledRef.current = true
      timers.forEach((clear) => clear())
      document.body.style.overflow = prevOverflow.current
    }
  }, [])

  useDeferredGsap(
    (gsap, ScrollTrigger) => {
      const root = overlay.current
      const ready = readyRef.current
      if (!root || !ready) return

      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
      const readyInstant = document.readyState === 'complete'
      const proxy = { v: 0 }

      const write = (finalize = false) => {
        if (pct.current) {
          pct.current.textContent = `${pad(Math.round((finalize ? 1 : proxy.v) * 100))}%`
        }
        if (bar.current) {
          bar.current.style.transform = `scaleX(${(finalize ? 1 : proxy.v).toFixed(4)})`
        }
      }

      // Fast path for reduced motion: jump to 100%, skip counting/brand motion.
      const D = {
        brand: reduce ? 0 : 0.55,
        // Scale the count so the bar fills most of the MIN_SHOW floor instead
        // of finishing early and holding on a static value.
        count: reduce ? 0 : readyInstant ? MIN_SHOW / 1000 : (MIN_SHOW / 1000) * 0.85,
        finalize: reduce ? 0 : 0.3,
        hold: reduce ? 0 : 0.1,
        contentExit: reduce ? 0.2 : 0.25,
        curtain: reduce ? 0.15 : 0.4,
        curtainDelay: reduce ? 0 : 0.1,
      }

      const pullCurtain = () => {
        if (cancelledRef.current) return
        document.body.style.overflow = prevOverflow.current
        if (content.current) {
          gsap.to(content.current, { autoAlpha: 0, y: -10, duration: D.contentExit, ease: 'power2.in' })
        }
        gsap.to(root, {
          autoAlpha: 0,
          duration: D.curtain,
          ease: 'power2.inOut',
          delay: D.curtainDelay,
          onComplete: () => {
            if (cancelledRef.current) return
            setHidden(true)
            // Single measurement pass AFTER the overlay is gone and layout has
            // settled, so pinned/scrubbed ScrollTriggers (OurProcess) stay aligned.
            requestAnimationFrame(() => {
              try {
                ScrollTrigger.refresh()
              } catch {
                /* noop */
              }
            })
          },
        })
      }

      if (!reduce) {
        gsap.fromTo(
          '.preloader__brand',
          { y: 16, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: D.brand,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
          },
        )
      }

      if (reduce) {
        proxy.v = 1
        write(true)
      } else {
        // Count smoothly toward 84% — never claims completion while the
        // critical resources are still in flight. The final 16% lands in
        // the same tween the moment `ready` resolves.
        const target = readyInstant ? 1 : 0.84
        gsap.to(proxy, {
          v: target,
          duration: D.count,
          ease: 'power1.out',
          onUpdate: write,
          onComplete: () => write(),
        })
      }

      // Guaranteed completion path: ready always resolves (load / fonts / guard).
      ready.then(() => {
        if (cancelledRef.current) return
        if (reduce) {
          pullCurtain()
          return
        }
        gsap.to(proxy, {
          v: 1,
          duration: D.finalize,
          ease: 'power1.out',
          overwrite: true,
          onUpdate: write,
          onComplete: () => {
            if (cancelledRef.current) return
            gsap.delayedCall(D.hold, pullCurtain)
          },
        })
      })
    },
    [],
    overlay,
  )

  if (hidden) return null

  return (
    <div className="preloader" ref={overlay} role="status" aria-label="Loading Inkhaven">
      <div className="preloader__content" ref={content}>
        <span className="preloader__brand">Inkhaven</span>
        <span className="preloader__pct" aria-hidden="true">
          <span ref={pct}>000%</span>
        </span>
        <span className="preloader__bar" aria-hidden="true">
          <span className="preloader__bar-fill" ref={bar} />
        </span>
      </div>
    </div>
  )
}

export default Preloader
