import './AboutArtist.css'
import Container from '../../components/Container/Container'
import useScrollReveal from '../../lib/useScrollReveal'

function AboutArtist() {
  const artistRef = useScrollReveal()
  return (
    <section className="artist section" id="artist" ref={artistRef}>
      <Container className="artist__inner">
        <figure className="artist__portrait" data-reveal>
          <picture>
            <img
              className="artist__img"
              src="/images/about-section/artist.webp"
              alt="Inkhaven tattoo artist at work in the studio"
              width="600"
              height="750"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
          </picture>
        </figure>
        <div className="artist__body" data-reveal>
          <span className="artist__label label" data-reveal>About the Artist</span>
          <h2 className="artist__heading">The hand behind the machine</h2>
          <p className="artist__text">
            A decade of tattooing, a singular obsession with clean linework and full-saturation blackwork.
            Every piece is treated as an editorial composition — deliberate, balanced, and built to last.
          </p>
        </div>
      </Container>
    </section>
  )
}

export default AboutArtist
