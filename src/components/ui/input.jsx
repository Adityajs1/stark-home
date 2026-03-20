import { cn } from '../../lib/utils'

function Input({ className = '', ...props }) {
  return <input className={cn('ui-input', className)} {...props} />
}

export { Input }
