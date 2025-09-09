import { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  children: ReactNode
  error?: string
  required?: boolean
  description?: string
  className?: string
}

export default function FormField({
  label,
  children,
  error,
  required = false,
  description,
  className = ''
}: FormFieldProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
      {children}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}