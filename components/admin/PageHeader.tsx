import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
  breadcrumbs?: Array<{
    name: string
    href?: string
  }>
}

export default function PageHeader({ 
  title, 
  description, 
  children,
  breadcrumbs 
}: PageHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          {breadcrumbs && (
            <nav className="flex mb-4" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                {breadcrumbs.map((breadcrumb, index) => (
                  <li key={breadcrumb.name} className="inline-flex items-center">
                    {index > 0 && (
                      <span className="text-gray-400 mx-2">/</span>
                    )}
                    {breadcrumb.href ? (
                      <a
                        href={breadcrumb.href}
                        className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {breadcrumb.name}
                      </a>
                    ) : (
                      <span className="text-sm font-medium text-gray-900">
                        {breadcrumb.name}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">
                {title}
              </h1>
              {description && (
                <p className="mt-1 text-sm text-gray-600">{description}</p>
              )}
            </div>
            {children && (
              <div className="mt-4 flex space-x-3 sm:mt-0 sm:ml-4">
                {children}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}