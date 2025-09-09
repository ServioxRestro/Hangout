import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error = false, leftIcon, rightIcon, ...props }, ref) => {
    const baseClasses = 'block w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition-colors'
    const errorClasses = error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''
    const iconClasses = leftIcon || rightIcon ? 'pl-10' : ''

    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="text-gray-400">{leftIcon}</div>
          </div>
        )}
        <input
          ref={ref}
          className={`${baseClasses} ${errorClasses} ${iconClasses} ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="text-gray-400">{rightIcon}</div>
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input