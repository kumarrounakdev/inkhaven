import { useLayoutEffect, useRef } from 'react'

// Loads GSAP + ScrollTrigger asynchronously (code-split) so the ~130KB GSAP
// bundle does NOT sit on the render-blocking critical path. GSAP is only used
// for animations, never for first paint, so blocking the LCP hero image on
// GSAP evaluation is pure waste on mobile (the biggest single script-eval cost).
//
// loadGsap(): shared promise resolving to { gsap, ScrollTrigger } (handlers can
//   await it — it resolves instantly once loaded and cached).
// useDeferredGsap(callback, deps, scope): mirrors @gsap/react's useGSAP — runs
//   `callback(gsap, ScrollTrigger)` inside a gsap.context scoped to `scope`,
//   reverts on change/unmount, re-runs when `deps` change.
let gsapPromise = null

export const loadGsap = () => {
  if (!gsapPromise) {
    gsapPromise = Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ]).then(([gsapMod, stMod]) => {
      gsapMod.gsap.registerPlugin(stMod.ScrollTrigger)
      return { gsap: gsapMod.gsap, ScrollTrigger: stMod.ScrollTrigger }
    })
  }
  return gsapPromise
}

export function useDeferredGsap(callback, deps = [], scope) {
  const cbRef = useRef(callback)

  useLayoutEffect(() => {
    cbRef.current = callback

    let ctx = null
    let alive = true

    loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (!alive) return
      ctx = gsap.context(() => {
        cbRef.current(gsap, ScrollTrigger)
      }, scope)
    })

    return () => {
      alive = false
      if (ctx) ctx.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
