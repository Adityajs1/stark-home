import { cn } from '../../lib/utils'

function Tabs({ className = '', ...props }) {
  return <div className={cn('ui-tabs', className)} {...props} />
}

function TabsList({ className = '', ...props }) {
  return <div className={cn('ui-tabs__list', className)} {...props} />
}

function TabsTrigger({ className = '', active = false, ...props }) {
  return (
    <button
      type="button"
      className={cn('ui-tabs__trigger', active && 'is-active', className)}
      {...props}
    />
  )
}

function TabsContent({ className = '', hidden = false, ...props }) {
  if (hidden) return null
  return <div className={cn('ui-tabs__content', className)} {...props} />
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
