import { useId } from 'react'
import './Testimonials.css'
import Container from '../../components/Container/Container'
import useScrollReveal from '../../lib/useScrollReveal'

const testimonials = [
  {
    id: 1,
    name: 'Arjun Sharma',
    rating: 5,
    text: 'The design came out even better than I imagined. Incredible attention to detail.',
  },
  {
    id: 2,
    name: 'Riya Mehra',
    rating: 4.5,
    text: 'The entire experience felt incredibly professional from start to finish.',
  },
  {
    id: 3,
    name: 'Karan Malhotra',
    rating: 5,
    text: 'Exactly what I wanted. The final tattoo feels completely personal.',
  },
  {
    id: 4,
    name: 'Aisha Kapoor',
    rating: 5,
    text: 'The consultation made everything feel easy and well thought out.',
  },
  {
    id: 5,
    name: 'Dev Khanna',
    rating: 4.5,
    text: 'Clean studio, great communication and an amazing final piece.',
  },
  {
    id: 6,
    name: 'Mehak Arora',
    rating: 5,
    text: 'From the first idea to the final tattoo, everything felt intentional.',
  },
  {
    id: 7,
    name: 'Aditya Rao',
    rating: 5,
    text: "One of the best tattoo experiences I've had. Would absolutely return.",
  },
  {
    id: 8,
    name: 'Simran Bedi',
    rating: 4.5,
    text: 'The attention to detail was seriously impressive.',
  },
]

const rowForward = [
  testimonials[0],
  testimonials[2],
  testimonials[4],
  testimonials[6],
  testimonials[1],
  testimonials[3],
  testimonials[5],
  testimonials[7],
]

const rowReverse = [
  testimonials[7],
  testimonials[5],
  testimonials[3],
  testimonials[1],
  testimonials[6],
  testimonials[4],
  testimonials[2],
  testimonials[0],
]

const STAR_PATH =
  'M12 2.5l2.9 6.1 6.6.6-5 4.4 1.5 6.5L12 16.8 5.9 20.6l1.5-6.5-5-4.4 6.6-.6L12 2.5z'

function StarIcon({ state, gradientId }) {
  const className = `testimonial-card__star testimonial-card__star--${state}`
  const style = state === 'half' ? { '--star-fill': `url(#${gradientId})` } : undefined

  return (
    <svg className={className} style={style} viewBox="0 0 24 24" aria-hidden="true">
      <path d={STAR_PATH} />
    </svg>
  )
}

function StarRating({ rating }) {
  const rawId = useId()
  const gradientId = 'testimonial-star' + rawId.replace(/[^a-zA-Z0-9]/g, '')
  const fullStars = Math.floor(rating)
  const hasHalf = rating - fullStars >= 0.5

  const states = Array.from({ length: 5 }, (_, i) => {
    if (i < fullStars) return 'full'
    if (i === fullStars && hasHalf) return 'half'
    return 'empty'
  })

  return (
    <div className="testimonial-card__stars" role="img" aria-label={`${rating.toFixed(1)} out of 5`}>
      {states.map((state, i) => (
        <StarIcon key={i} state={state} gradientId={gradientId} />
      ))}
      {hasHalf && (
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <defs>
            <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
              <stop offset="50%" style={{ stopColor: 'var(--accent)' }} />
              <stop offset="50%" style={{ stopColor: 'var(--text-muted)', stopOpacity: 0.35 }} />
            </linearGradient>
          </defs>
        </svg>
      )}
    </div>
  )
}

function TestimonialCard({ item }) {
  return (
    <article className="testimonial-card">
      <div className="testimonial-card__top">
        <StarRating rating={item.rating} />
        <span className="testimonial-card__rating">{item.rating.toFixed(1)} / 5</span>
      </div>
      <p className="testimonial-card__text">“{item.text}”</p>
      <cite className="testimonial-card__name">— {item.name}</cite>
    </article>
  )
}

function MarqueeRow({ items, direction }) {
  return (
    <div className={`testimonials__row testimonials__row--${direction}`}>
      <div className="testimonials__track">
        <div className="testimonials__set">
          {items.map((item) => (
            <TestimonialCard key={item.id} item={item} />
          ))}
        </div>
        <div className="testimonials__set" aria-hidden="true">
          {items.map((item) => (
            <TestimonialCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Testimonials() {
  const sectionRef = useScrollReveal()
  return (
    <section className="testimonials section" id="testimonials" ref={sectionRef}>
      <Container>
        <header className="testimonials__header">
          <span className="label testimonials__eyebrow" data-reveal>06 / Testimonials</span>
          <h2 className="testimonials__title" data-reveal>
            <span className="testimonials__line">Words from</span>
            <span className="testimonials__line testimonials__line--alt">The People.</span>
          </h2>
          <p className="testimonials__desc" data-reveal>
            Real experiences from people who trusted us with their skin.
          </p>
        </header>
      </Container>

      <div className="testimonials__marquee" data-reveal>
        <MarqueeRow items={rowForward} direction="forward" />
        <MarqueeRow items={rowReverse} direction="reverse" />
      </div>
    </section>
  )
}

export default Testimonials