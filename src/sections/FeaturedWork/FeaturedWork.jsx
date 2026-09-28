import { useRef, useState } from 'react'
import { loadGsap, useDeferredGsap } from '../../lib/useDeferredGsap'
import './FeaturedWork.css'
import Container from '../../components/Container/Container'
import WorkItem from './WorkItem'
import { categories, workItems } from './workData'

const headlineLines = ['The Work', 'Speaks for', 'Itself.']

function FeaturedWork() {
  const root = useRef(null)
  const galleryRef = useRef(null)
  const [active, setActive] = useState('all')

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useDeferredGsap(
    (gsap) => {
      if (reduced) return
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('.work__header > *', { y: 24, opacity: 0, duration: 0.7, stagger: 0.08 })
        .from('.work__line', { yPercent: 115, duration: 0.9, stagger: 0.08, ease: 'power4.out' }, '-=0.2')
        .from('.work__filter', { y: 16, opacity: 0, duration: 0.6 }, '-=0.4')
    },
    [],
    root,
  )

  const animateItems = (gsap, items) => {
    if (reduced) return
    gsap.fromTo(
      items,
      {
        opacity: 0,
        y: 22,
        clipPath: 'inset(0 0 12% 0)',
      },
      {
        opacity: 1,
        y: 0,
        clipPath: 'inset(0 0 0% 0)',
        duration: 0.5,
        stagger: 0.05,
        ease: 'power2.out',
        clearProps: 'clipPath',
      },
    )
  }

  const handleFilter = (id) => {
    if (id === active) return
    const current = galleryRef.current ? galleryRef.current.querySelectorAll('.workitem') : []
    if (current.length && !reduced) {
      loadGsap().then(({ gsap }) => {
        gsap.to(current, {
          opacity: 0,
          y: 14,
          duration: 0.25,
          ease: 'power2.in',
          onComplete: () => {
            setActive(id)
          },
        })
      })
    } else {
      setActive(id)
    }
  }

  const filtered = active === 'all' ? workItems : workItems.filter((w) => w.category === active)

  useDeferredGsap(
    (gsap, ScrollTrigger) => {
      animateItems(gsap, galleryRef.current ? galleryRef.current.querySelectorAll('.workitem') : [])
      // The filter changes the gallery height (fewer/more cards), which shifts
      // the document height — and therefore the scroll positions of every pinned
      // ScrollTrigger below it (e.g. OurProcess). Re-measure once, after React has
      // committed the filtered layout, so pins/start/end stay synchronized.
      ScrollTrigger.refresh()
    },
    [active],
    root,
  )

  return (
    <section className="work section" id="work" ref={root}>
      <Container>
        <div className="work__header">
          <span className="work__meta">02 / Selected Work</span>
          <h2 className="work__heading">
            {headlineLines.map((line) => (
              <span className="work__line-mask" key={line}>
                <span className="work__line">{line}</span>
              </span>
            ))}
          </h2>
          <p className="work__desc">
            Every piece is designed around the person wearing it.
          </p>
        </div>

        <div className="work__filter" role="group" aria-label="Filter work by category">
          {categories.map((cat) => {
            const count = cat.id === 'all' ? workItems.length : workItems.filter((w) => w.category === cat.id).length
            return (
              <button
                key={cat.id}
                className={`work__filter-btn${active === cat.id ? ' is-active' : ''}`}
                aria-pressed={active === cat.id}
                onClick={() => handleFilter(cat.id)}
              >
                {cat.label}
                <span className="work__filter-count" aria-hidden="true">
                  ({count})
                </span>
              </button>
            )
          })}
        </div>

        <ul className="work__gallery" ref={galleryRef}>
          {filtered.map((item) => (
            <WorkItem key={item.id} item={item} index={item.id} />
          ))}
        </ul>
      </Container>
    </section>
  )
}

export default FeaturedWork
