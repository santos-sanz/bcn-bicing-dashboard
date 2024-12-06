"use client"

import { useState } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'

interface Column<T> {
  key: keyof T
  header: string
  render?: (value: any) => React.ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  className?: string
  itemsPerPage?: number
  onRowClick?: (item: T) => void
}

type SortDirection = 'asc' | 'desc' | null

export function DataTable<T>({ 
  data, 
  columns, 
  className = '',
  itemsPerPage = 10,
  onRowClick
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | null
    direction: SortDirection
  }>({
    key: null,
    direction: null,
  })
  const [currentPage, setCurrentPage] = useState(1)

  const handleSort = (key: keyof T) => {
    let direction: SortDirection = 'asc'
    
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc'
      } else if (sortConfig.direction === 'desc') {
        direction = null
      }
    }

    setSortConfig({ key, direction })
  }

  const getSortedData = () => {
    if (!sortConfig.key || !sortConfig.direction) {
      return data
    }

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key!]
      const bValue = b[sortConfig.key!]

      if (aValue === bValue) return 0
      
      const comparison = aValue < bValue ? -1 : 1
      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
  }

  const getPaginatedData = () => {
    const sortedData = getSortedData()
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedData.slice(startIndex, startIndex + itemsPerPage)
  }

  const totalPages = Math.ceil(data.length / itemsPerPage)

  const getSortIcon = (columnKey: keyof T) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="w-4 h-4 ml-1" />
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-4 h-4 ml-1" /> : 
      <ChevronDown className="w-4 h-4 ml-1" />
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            {columns.map((column, index) => (
              <th
                key={String(column.key)}
                className={`px-4 py-2 cursor-pointer hover:bg-gray-200 transition-colors ${
                  index === 0 ? 'text-left' : 'text-center'
                }`}
                onClick={() => handleSort(column.key)}
              >
                <div className={`flex ${index === 0 ? 'justify-start' : 'justify-center'} items-center`}>
                  {column.header}
                  {getSortIcon(column.key)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {getPaginatedData().map((item, rowIndex) => (
            <tr 
              key={rowIndex}
              className="border-b border-gray-200 hover:bg-gray-50"
            >
              {columns.map((column, colIndex) => (
                <td 
                  key={String(column.key)} 
                  className={`px-4 py-2 ${colIndex === 0 ? 'text-left cursor-pointer' : 'text-center'}`}
                  onClick={colIndex === 0 && onRowClick ? () => onRowClick(item) : undefined}
                >
                  {column.render ? 
                    column.render(item[column.key]) : 
                    String(item[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="First page"
            >
              <div className="flex items-center">
                <ChevronLeft className="w-4 h-4" />
                <ChevronLeft className="w-4 h-4 -ml-2" />
              </div>
            </button>
            
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 10, 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              title="Previous 10 pages"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="ml-1">10</span>
            </button>

            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="px-4 py-1 rounded bg-gray-50">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 10, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              title="Next 10 pages"
            >
              <span className="mr-1">10</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Last page"
            >
              <div className="flex items-center">
                <ChevronRight className="w-4 h-4" />
                <ChevronRight className="w-4 h-4 -ml-2" />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}