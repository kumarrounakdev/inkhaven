import { Suspense, lazy, useEffect } from 'react'
import Navbar from './components/Navbar/Navbar'
import Footer from './components/Footer/Footer'
import Preloader from './components/Preloader/Preloader'
import Hero from './sections/Hero/Hero'
import FeaturedWork from './sections/FeaturedWork/FeaturedWork'
import TattooStyles from './sections/TattooStyles/TattooStyles'
import AboutArtist from './sections/AboutArtist/AboutArtist'
import OurProcess from './sections/OurProcess/OurProcess'
import { enableSmoothScroll, disableSmoothScroll } from './lib/lenis'

const Testimonials = lazy(() => import('./sections/Testimonials/Testimonials'))
const FAQ = lazy(() => import('./sections/FAQ/FAQ'))
const BookingCTA = lazy(() => import('./sections/BookingCTA/BookingCTA'))

function App() {
  useEffect(() => {
    enableSmoothScroll()
    return () => disableSmoothScroll()
  }, [])

  return (
    <>
      <Preloader />
      <Navbar />
      <main>
        <Hero />
        <hr className="section-divider" />
        <FeaturedWork />
        <hr className="section-divider" />
        <TattooStyles />
        <hr className="section-divider" />
        <AboutArtist />
        <hr className="section-divider" />
        <OurProcess />
        <hr className="section-divider" />
        <Suspense fallback={<div className="lazy-placeholder lazy-placeholder--testimonials" aria-hidden="true" />}>
          <Testimonials />
        </Suspense>
        <hr className="section-divider" />
        <Suspense fallback={<div className="lazy-placeholder lazy-placeholder--faq" aria-hidden="true" />}>
          <FAQ />
        </Suspense>
        <hr className="section-divider" />
        <Suspense fallback={<div className="lazy-placeholder lazy-placeholder--booking" aria-hidden="true" />}>
          <BookingCTA />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}

export default App