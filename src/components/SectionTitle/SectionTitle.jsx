import './SectionTitle.css'

function SectionTitle({ label, title, align = 'left', id }) {
  return (
    <header className={`section-title section-title--${align}`} id={id}>
      {label && <span className="section-title__label label">{label}</span>}
      <h2 className="section-title__heading">{title}</h2>
    </header>
  )
}

export default SectionTitle
