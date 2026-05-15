import { cn } from '@/lib/utils/cn'

export function Button({
  className,
  disabled,
  title,
  children,
  type = 'button',
}: {
  className?: string
  disabled?: boolean
  title?: string
  children: React.ReactNode
  type?: 'button' | 'submit' | 'reset'
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors',
        'bg-slate-900 text-white hover:bg-slate-800',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  )
}
