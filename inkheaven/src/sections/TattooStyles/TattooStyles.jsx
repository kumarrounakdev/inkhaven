import './TattooStyles.css'
import './TattooStyleCard.css'
import Container from '../../components/Container/Container'
import TattooStyleCard from './TattooStyleCard'
import tattooStyles from './tattooStylesData'
import useScrollReveal from '../../lib/useScrollReveal'

const headlineLines = ['Find Your', 'Style.']

function TattooStyles() {
  const stylesRef = useScrollReveal()
  return (
    <section className="styles section" id="styles" ref={stylesRef}>
      <Container>
        <div className="styles__header">
          <span className="styles__meta" data-reveal>03 / Tattoo Styles</span>
          <h2 className="styles__heading" data-reveal>
            {headlineLines.map((line) => (
              <span className="styles__line-mask" key={line}>
                <span className="styles__line">{line}</span>
              </span>
            ))}
          </h2>
          <p className="styles__desc" data-reveal>
            From precise fine lines to bold blackwork, every piece starts with a
            style that feels like you.
          </p>
        </div>

        <ul className="styles__list">
          {tattooStyles.map((style, i) => (
            <TattooStyleCard key={style.number} item={style} index={i} reveal />
          ))}
        </ul>
      </Container>
    </section>
  )
}

export default TattooStyles
