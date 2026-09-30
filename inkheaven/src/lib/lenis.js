import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import './lenis.css'

gsap.registerPlugin(ScrollTrigger)

// Mobile perf: avoid re-measuring all ScrollTriggers when the mobile browser
// shows/hides its UI (address bar swipe), which is a leading cause of jank.
if (typeof window !== 'undefined') {
  ScrollTrigger.config({ ignoreMobileResize: true })
}

let lenis = null
let onTick = null

function handleAnchorClick(event) {
  const anchor = event.target.closest('a[href^="#"]')
  if (!anchor) return
  const hash = anchor.getAttribute('href')
  if (!hash || hash === '#') return
  const target = document.querySelector(hash)
  if (!target) return
  event.preventDefault()
  lenis.scrollTo(target, { offset: 0 })
}

export function enableSmoothScroll() {
  if (lenis) return lenis

  lenis = new Lenis({
    duration: 2.5,
    smoothWheel: true,
    syncTouch: false,
    touchMultiplier: 1.2,
    wheelMultiplier: 0.8,
    autoRaf: false,
  })

  // Lenis -> ScrollTrigger: every Lenis scroll frame refreshes ScrollTrigger
  // state, keeping the pinned/scrubbed sections (e.g. OurProcess) in sync.
  lenis.on('scroll', ScrollTrigger.update)

  // Single animation loop: GSAP's ticker drives Lenis. There is no separate
  // requestAnimationFrame loop, so exactly one loop runs the whole page.
  onTick = (time) => lenis.raf(time * 1000)
  gsap.ticker.add(onTick)
  gsap.ticker.lagSmoothing(0)

  // One controlled measurement pass once layout is committed.
  requestAnimationFrame(() => ScrollTrigger.refresh())

  // Anchor links (navbar, footer) -> smooth lenis.scrollTo, pin-safe.
  document.addEventListener('click', handleAnchorClick)

  return lenis
}

export function disableSmoothScroll() {
  document.removeEventListener('click', handleAnchorClick)
  if (onTick) {
    gsap.ticker.remove(onTick)
    onTick = null
  }
  if (lenis) {
    lenis.destroy()
    lenis = null
  }
}