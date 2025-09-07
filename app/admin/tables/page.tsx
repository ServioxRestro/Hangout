'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import QRCode from 'qrcode'
import type { Tables } from '@/types/database.types'

type RestaurantTable = Tables<'restaurant_tables'>

export default function TableManagement() {
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTableNumber, setNewTableNumber] = useState('')

  useEffect(() => {
    fetchTables()
  }, [])

  const fetchTables = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .order('table_number', { ascending: true })

      if (error) {
        console.error('Error fetching tables:', error)
        return
      }

      setTables(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = async (tableCode: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const qrUrl = `${baseUrl}/t/${tableCode}`
      return await QRCode.toDataURL(qrUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
    } catch (error) {
      console.error('Error generating QR code:', error)
      return null
    }
  }

  const addTable = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const tableNumber = parseInt(newTableNumber)
    if (isNaN(tableNumber) || tableNumber <= 0) {
      alert('Please enter a valid table number')
      return
    }

    // Check if table number already exists
    const existing = tables.find(t => t.table_number === tableNumber)
    if (existing) {
      alert('Table number already exists')
      return
    }

    try {
      const tableCode = `table_${tableNumber}_${Date.now().toString(36)}`
      const qrCodeDataUrl = await generateQRCode(tableCode)

      const { data, error } = await supabase
        .from('restaurant_tables')
        .insert({
          table_number: tableNumber,
          table_code: tableCode,
          qr_code_url: qrCodeDataUrl,
          is_active: true
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding table:', error)
        alert('Error adding table')
        return
      }

      setTables(prev => [...prev, data])
      setNewTableNumber('')
      setShowAddForm(false)
    } catch (error) {
      console.error('Error:', error)
      alert('Error adding table')
    }
  }

  const toggleTableStatus = async (tableId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('restaurant_tables')
        .update({ is_active: !isActive })
        .eq('id', tableId)

      if (error) {
        console.error('Error updating table:', error)
        return
      }

      setTables(prev => 
        prev.map(table => 
          table.id === tableId 
            ? { ...table, is_active: !isActive }
            : table
        )
      )
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const downloadQRCode = (qrCodeUrl: string, tableNumber: number) => {
    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = `table_${tableNumber}_qr.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <button
                onClick={() => window.location.href = '/admin/dashboard'}
                className="text-blue-600 hover:text-blue-800 mb-2"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Table Management</h1>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Add New Table
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {showAddForm && (
            <div className="mb-6 bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Add New Table</h2>
              <form onSubmit={addTable} className="flex gap-4 items-end">
                <div>
                  <label htmlFor="tableNumber" className="block text-sm font-medium text-gray-700">
                    Table Number
                  </label>
                  <input
                    type="number"
                    id="tableNumber"
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter table number"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                >
                  Add Table
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setNewTableNumber('')
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tables.map((table) => (
              <div key={table.id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold">Table {table.table_number}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    table.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {table.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Table Code:</p>
                  <code className="text-xs bg-gray-100 p-1 rounded">{table.table_code}</code>
                </div>

                {table.qr_code_url && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">QR Code:</p>
                    <div className="flex flex-col items-center space-y-2">
                      <img 
                        src={table.qr_code_url} 
                        alt={`QR Code for Table ${table.table_number}`}
                        className="w-32 h-32 border"
                      />
                      <button
                        onClick={() => downloadQRCode(table.qr_code_url!, table.table_number)}
                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
                      >
                        Download QR
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleTableStatus(table.id, table.is_active || false)}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                      table.is_active 
                        ? 'bg-red-100 text-red-800 hover:bg-red-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {table.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {tables.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">No tables created yet</div>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                Add Your First Table
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}