import { ReactNode } from 'react'

interface Column {
  key: string
  title: string
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (value: any, record: any) => ReactNode
}

interface TableProps {
  data: any[]
  columns: Column[]
  loading?: boolean
  emptyText?: string
  className?: string
}

export default function Table({
  data,
  columns,
  loading = false,
  emptyText = 'No data available',
  className = ''
}: TableProps) {
  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
        <div className="p-8 text-center">
          <div className="text-gray-400 text-4xl mb-4">📄</div>
          <p className="text-gray-500">{emptyText}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={column.width ? { width: column.width } : undefined}
                  className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.align === 'center'
                      ? 'text-center'
                      : column.align === 'right'
                      ? 'text-right'
                      : 'text-left'
                  }`}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((record, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-6 py-4 whitespace-nowrap text-sm ${
                      column.align === 'center'
                        ? 'text-center'
                        : column.align === 'right'
                        ? 'text-right'
                        : 'text-left'
                    }`}
                  >
                    {column.render
                      ? column.render(record[column.key], record)
                      : record[column.key]
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}