import { cn } from '../../lib/utils'

function Card({ className = '', ...props }) {
  return <section className={cn('ui-card', className)} {...props} />
}

function CardHeader({ className = '', ...props }) {
  return <div className={cn('ui-card__header', className)} {...props} />
}

function CardTitle({ className = '', ...props }) {
  return <h3 className={cn('ui-card__title', className)} {...props} />
}

function CardDescription({ className = '', ...props }) {
  return <p className={cn('ui-card__description', className)} {...props} />
}

function CardContent({ className = '', ...props }) {
  return <div className={cn('ui-card__content', className)} {...props} />
}

export { Card, CardContent, CardDescription, CardHeader, CardTitle }
