import './WorkItem.css'

function WorkItem({ item, index }) {
  return (
    <li className={`workitem workitem--${item.size}`}>
      <a className="workitem__link" href="#work">
        <div className="workitem__media workitem__media--image">
          <picture>
            {item.imageAvif && (
              <source srcSet={item.imageAvif} sizes={item.sizes} type="image/avif" />
            )}
            <source srcSet={item.imageSet} sizes={item.sizes} type="image/webp" />
            <img
              className="workitem__img"
              src={item.image}
              alt={`${item.title} — ${item.category} tattoo`}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
          </picture>
          <span className="workitem__num">{String(index + 1).padStart(2, '0')}</span>
        </div>
        <div className="workitem__meta">
          <span className="workitem__cat">{item.category}</span>
          <span className="workitem__title">{item.title}</span>
        </div>
      </a>
    </li>
  )
}

export default WorkItem
