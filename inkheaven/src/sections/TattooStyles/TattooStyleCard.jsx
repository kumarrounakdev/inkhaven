function PlaceholderArt({ index }) {
  const variants = [
    <path key="a" d="M60 40 C 120 10, 280 10, 340 40 L 340 200 C 280 230, 120 230, 60 200 Z" />,
    <path key="a" d="M180 20 L 340 160 L 180 300 L 20 160 Z" />,
    <path key="a" d="M40 150 C 80 40, 320 40, 360 150 C 320 260, 80 260, 40 150 Z" />,
    <path key="a" d="M20 160 H 340 M180 20 V 300 M60 60 H 300 M60 260 H 300" />,
    <path key="a" d="M180 20 C 340 80, 340 240, 180 300 C 20 240, 20 80, 180 20 Z" />,
    <path key="a" d="M60 20 L 180 300 L 300 20 M60 300 L 300 20" />,
  ]
  const art = variants[index % variants.length]

  return (
    <svg
      className="stylecard__placeholder"
      viewBox="0 0 360 320"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g stroke="var(--text-muted)" strokeWidth="0.75" opacity="0.35">
        {art}
      </g>
    </svg>
  )
}

function TattooStyleCard({ item, index, reveal }) {
  return (
    <li className="stylecard" data-reveal={reveal ? '' : undefined}>
      <div className="stylecard__inner">
        <div className="stylecard__image">
          {item.image ? (
            <img
              className="stylecard__img"
              src={item.image}
              alt={`${item.title} tattoo style`}
              style={{ objectPosition: item.objectPosition }}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
          ) : (
            <PlaceholderArt index={index} />
          )}
          <div className="stylecard__overlay" aria-hidden="true" />
        </div>

        <div className="stylecard__content">
          <span className="stylecard__num">{item.number}</span>
          <h3 className="stylecard__title">{item.title}</h3>
          <p className="stylecard__desc">{item.description}</p>
        </div>
      </div>
    </li>
  )
}

export default TattooStyleCard
