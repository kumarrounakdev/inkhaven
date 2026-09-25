import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import './useScrollReveal.css'

gsap.registerPlugin(useGSAP, ScrollTrigger)

// Reveals every [data-reveal] element inside the section as it scrolls into view.
//
// Performance: scroll reveals (which use many per-element ScrollTriggers and force
// layout measurement) only run on desktop/tablet (>= 768px). On mobile they are
// skipped entirely — content simply shows — because per-element reveals are a
// leading cause of forced reflow and jank on low-end devices.
//
// Each element gets its own ScrollTrigger with toggleActions 'play none none none'
// so the tween only ever plays on scroll-enter. Prefers transform/opacity and
// cleans up via the useGSAP scope + gsap.matchMedia revert.
export default function useScrollReveal(options = {}) {
  const ref = useRef(null)
  const { stagger = 0.1, y = 50, duration = 0.9, start = 'top 90%' } = options

  useGSAP(
    () => {
      const root = ref.current
      if (!root) return

      const mm = gsap.matchMedia()

      mm.add('(min-width: 768px)', () => {
        const targets = root.querySelectorAll('[data-reveal]')
        if (!targets.length) return

        gsap.set(targets, { opacity: 0, y })

        targets.forEach((target, i) => {
          gsap.to(target, {
            opacity: 1,
            y: 0,
            duration,
            delay: i * stagger,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
            scrollTrigger: {
              trigger: target,
              start,
              toggleActions: 'play none none none',
            },
          })
        })
      })

      return () => mm.revert()
    },
    { scope: ref },
  )

  return ref
}
