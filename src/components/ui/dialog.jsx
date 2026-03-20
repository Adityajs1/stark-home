import { cn } from '../../lib/utils'

function Dialog({ open, children }) {
  if (!open) return null
  return <div className="ui-dialog">{children}</div>
}

function DialogOverlay({ className = '', ...props }) {
  return <div className={cn('ui-dialog__overlay', className)} {...props} />
}

function DialogContent({ className = '', ...props }) {
  return <div className={cn('ui-dialog__content', className)} {...props} />
}

function DialogHeader({ className = '', ...props }) {
  return <div className={cn('ui-dialog__header', className)} {...props} />
}

function DialogTitle({ className = '', ...props }) {
  return <h3 className={cn('ui-dialog__title', className)} {...props} />
}

function DialogDescription({ className = '', ...props }) {
  return <p className={cn('ui-dialog__description', className)} {...props} />
}

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
}
