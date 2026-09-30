import './Button.css'

function Button({ children, href, variant = 'solid', type = 'button', className = '', ...rest }) {
  const classes = `button button--${variant} ${className}`.trim()

  if (href) {
    return (
      <a className={classes} href={href} {...rest}>
        {children}
      </a>
    )
  }

  return (
    <button className={classes} type={type} {...rest}>
      {children}
    </button>
  )
}

export default Button
