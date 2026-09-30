import './Footer.css'
import Container from '../Container/Container'
import useScrollReveal from '../../lib/useScrollReveal'

const navigateLinks = [
  { label: 'Work', href: '#work' },
  { label: 'Styles', href: '#styles' },
  { label: 'Artist', href: '#artist' },
  { label: 'Process', href: '#process' },
  { label: 'FAQ', href: '#faq' },
]

const connectLinks = [
  { label: 'Instagram' },
  { label: 'Email' },
  { label: 'WhatsApp' },
]

function ExternalArrow() {
  return (
    <svg
      className="footer__link-arrow"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17L17 7M17 7H9M17 7v8" />
    </svg>
  )
}

function Footer() {
  const year = new Date().getFullYear()
  const footerRef = useScrollReveal()

  return (
    <footer className="footer" ref={footerRef}>
      <div className="footer__masthead">
        <Container>
          <span className="label footer__eyebrow" data-reveal>09 / The End</span>
        </Container>
        <h2 className="footer__wordmark" data-reveal>Inkhaven</h2>
        <Container>
          <p className="footer__tagline" data-reveal>Tattoo / Art / Identity</p>
        </Container>
      </div>

      <Container>
        <div className="footer__grid" data-reveal>
          <div className="footer__group">
            <h3 className="footer__group-title">Navigate</h3>
            <nav aria-label="Footer navigation">
              <ul className="footer__links">
                {navigateLinks.map((link) => (
                  <li key={link.label}>
                    <a className="footer__link" href={link.href}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="footer__group">
            <h3 className="footer__group-title">Studio</h3>
            <p className="footer__text">
              Delhi, India
              <br />
              By appointment
            </p>
            <p className="footer__text">
              Mon — Sat
              <br />
              11:00 — 19:00
            </p>
          </div>

          <div className="footer__group">
            <h3 className="footer__group-title">Connect</h3>
            <ul className="footer__links footer__links--inline">
              {connectLinks.map((link) => (
                <li key={link.label}>
                  <a className="footer__link footer__link--external" href="#">
                    {link.label}
                    <ExternalArrow />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>

      <div className="footer__bottom-bar">
        <Container>
          <div className="footer__bottom">
            <p className="footer__copyright">© {year} Inkhaven</p>
          </div>
        </Container>
      </div>
    </footer>
  )
}

export default Footer