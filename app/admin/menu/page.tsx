'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/database.types'

type MenuCategory = Tables<'menu_categories'>
type MenuItem = Tables<'menu_items'> & {
  menu_categories: MenuCategory | null
}

export default function MenuManagement() {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'categories' | 'items'>('categories')
  
  // Category form state
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: ''
  })

  // Menu item form state
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: '',
    is_available: true,
    is_veg: true,
    subcategory: 'veg' as 'veg' | 'non-veg'
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('menu_categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError)
        return
      }

      // Fetch menu items with categories
      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_items')
        .select(`
          *,
          menu_categories (*)
        `)
        .order('display_order', { ascending: true })

      if (itemsError) {
        console.error('Error fetching menu items:', itemsError)
        return
      }

      setCategories(categoriesData || [])
      setMenuItems(itemsData as MenuItem[] || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Category functions
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!categoryForm.name.trim()) {
      alert('Category name is required')
      return
    }

    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('menu_categories')
          .update({
            name: categoryForm.name,
            description: categoryForm.description
          })
          .eq('id', editingCategory.id)

        if (error) {
          console.error('Error updating category:', error)
          alert('Error updating category')
          return
        }
      } else {
        // Create new category
        const { error } = await supabase
          .from('menu_categories')
          .insert({
            name: categoryForm.name,
            description: categoryForm.description,
            display_order: categories.length
          })

        if (error) {
          console.error('Error creating category:', error)
          alert('Error creating category')
          return
        }
      }

      // Reset form and refresh data
      setCategoryForm({ name: '', description: '' })
      setEditingCategory(null)
      setShowCategoryForm(false)
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      alert('Error saving category')
    }
  }

  const editCategory = (category: MenuCategory) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description || ''
    })
    setShowCategoryForm(true)
  }

  const deleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? All menu items in this category will also be deleted.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('menu_categories')
        .delete()
        .eq('id', categoryId)

      if (error) {
        console.error('Error deleting category:', error)
        alert('Error deleting category')
        return
      }

      fetchData()
    } catch (error) {
      console.error('Error:', error)
      alert('Error deleting category')
    }
  }

  // Menu item functions
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!itemForm.name.trim() || !itemForm.price || !itemForm.category_id) {
      alert('Name, price, and category are required')
      return
    }

    const price = parseFloat(itemForm.price)
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price')
      return
    }

    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('menu_items')
          .update({
            name: itemForm.name,
            description: itemForm.description,
            price: price,
            category_id: itemForm.category_id,
            image_url: itemForm.image_url || null,
            is_available: itemForm.is_available,
            is_veg: itemForm.is_veg,
            subcategory: itemForm.subcategory
          })
          .eq('id', editingItem.id)

        if (error) {
          console.error('Error updating item:', error)
          alert('Error updating menu item')
          return
        }
      } else {
        // Create new item
        const categoryItems = menuItems.filter(item => item.category_id === itemForm.category_id)
        
        const { error } = await supabase
          .from('menu_items')
          .insert({
            name: itemForm.name,
            description: itemForm.description,
            price: price,
            category_id: itemForm.category_id,
            image_url: itemForm.image_url || null,
            is_available: itemForm.is_available,
            is_veg: itemForm.is_veg,
            subcategory: itemForm.subcategory,
            display_order: categoryItems.length
          })

        if (error) {
          console.error('Error creating item:', error)
          alert('Error creating menu item')
          return
        }
      }

      // Reset form and refresh data
      setItemForm({
        name: '',
        description: '',
        price: '',
        category_id: '',
        image_url: '',
        is_available: true,
        is_veg: true,
        subcategory: 'veg'
      })
      setEditingItem(null)
      setShowItemForm(false)
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      alert('Error saving menu item')
    }
  }

  const editItem = (item: MenuItem) => {
    setEditingItem(item)
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category_id: item.category_id || '',
      image_url: item.image_url || '',
      is_available: item.is_available || true,
      is_veg: item.is_veg || true,
      subcategory: (item.subcategory as 'veg' | 'non-veg') || 'veg'
    })
    setShowItemForm(true)
  }

  const deleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId)

      if (error) {
        console.error('Error deleting item:', error)
        alert('Error deleting menu item')
        return
      }

      fetchData()
    } catch (error) {
      console.error('Error:', error)
      alert('Error deleting menu item')
    }
  }

  const toggleItemAvailability = async (itemId: string, isAvailable: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !isAvailable })
        .eq('id', itemId)

      if (error) {
        console.error('Error updating item availability:', error)
        return
      }

      fetchData()
    } catch (error) {
      console.error('Error:', error)
    }
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
              <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('categories')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'categories'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Categories ({categories.length})
              </button>
              <button
                onClick={() => setActiveTab('items')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'items'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Menu Items ({menuItems.length})
              </button>
            </nav>
          </div>

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Menu Categories</h2>
                <button
                  onClick={() => {
                    setCategoryForm({ name: '', description: '' })
                    setEditingCategory(null)
                    setShowCategoryForm(true)
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  Add Category
                </button>
              </div>

              {/* Category Form */}
              {showCategoryForm && (
                <div className="mb-6 bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">
                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                  </h3>
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div>
                      <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700">
                        Category Name *
                      </label>
                      <input
                        type="text"
                        id="categoryName"
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Appetizers, Main Courses, Desserts"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="categoryDescription" className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        id="categoryDescription"
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Optional description for this category"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                      >
                        {editingCategory ? 'Update Category' : 'Add Category'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCategoryForm(false)
                          setEditingCategory(null)
                          setCategoryForm({ name: '', description: '' })
                        }}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Categories List */}
              <div className="grid gap-4">
                {categories.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg">
                    <div className="text-gray-500 mb-4">No categories created yet</div>
                    <button
                      onClick={() => setShowCategoryForm(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                    >
                      Create Your First Category
                    </button>
                  </div>
                ) : (
                  categories.map((category) => (
                    <div key={category.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-lg">{category.name}</h3>
                        {category.description && (
                          <p className="text-gray-600 text-sm">{category.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {menuItems.filter(item => item.category_id === category.id).length} items
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => editCategory(category)}
                          className="text-blue-600 hover:text-blue-800 px-3 py-1 border border-blue-600 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteCategory(category.id)}
                          className="text-red-600 hover:text-red-800 px-3 py-1 border border-red-600 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Menu Items Tab */}
          {activeTab === 'items' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Menu Items</h2>
                <button
                  onClick={() => {
                    if (categories.length === 0) {
                      alert('Please create at least one category before adding menu items')
                      return
                    }
                    setItemForm({
                      name: '',
                      description: '',
                      price: '',
                      category_id: categories[0]?.id || '',
                      image_url: '',
                      is_available: true,
                      is_veg: true,
                      subcategory: 'veg'
                    })
                    setEditingItem(null)
                    setShowItemForm(true)
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  Add Menu Item
                </button>
              </div>

              {/* Menu Item Form */}
              {showItemForm && (
                <div className="mb-6 bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">
                    {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                  </h3>
                  <form onSubmit={handleItemSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="itemName" className="block text-sm font-medium text-gray-700">
                          Item Name *
                        </label>
                        <input
                          type="text"
                          id="itemName"
                          value={itemForm.name}
                          onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Chicken Tikka Masala"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="itemPrice" className="block text-sm font-medium text-gray-700">
                          Price *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          id="itemPrice"
                          value={itemForm.price}
                          onChange={(e) => setItemForm(prev => ({ ...prev, price: e.target.value }))}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="itemCategory" className="block text-sm font-medium text-gray-700">
                          Category *
                        </label>
                        <select
                          id="itemCategory"
                          value={itemForm.category_id}
                          onChange={(e) => setItemForm(prev => ({ ...prev, category_id: e.target.value }))}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">Select a category</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Type *
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="vegType"
                              value="veg"
                              checked={itemForm.subcategory === 'veg'}
                              onChange={(e) => setItemForm(prev => ({ 
                                ...prev, 
                                subcategory: 'veg',
                                is_veg: true 
                              }))}
                              className="mr-2"
                            />
                            <span className="text-green-600 mr-1">🟢</span>
                            Veg
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="vegType"
                              value="non-veg"
                              checked={itemForm.subcategory === 'non-veg'}
                              onChange={(e) => setItemForm(prev => ({ 
                                ...prev, 
                                subcategory: 'non-veg',
                                is_veg: false 
                              }))}
                              className="mr-2"
                            />
                            <span className="text-red-600 mr-1">🔴</span>
                            Non-Veg
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="itemDescription" className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        id="itemDescription"
                        value={itemForm.description}
                        onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Describe this menu item..."
                      />
                    </div>

                    <div>
                      <label htmlFor="itemImage" className="block text-sm font-medium text-gray-700">
                        Image URL
                      </label>
                      <input
                        type="url"
                        id="itemImage"
                        value={itemForm.image_url}
                        onChange={(e) => setItemForm(prev => ({ ...prev, image_url: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="itemAvailable"
                        checked={itemForm.is_available}
                        onChange={(e) => setItemForm(prev => ({ ...prev, is_available: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="itemAvailable" className="ml-2 block text-sm text-gray-700">
                        Available for ordering
                      </label>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                      >
                        {editingItem ? 'Update Item' : 'Add Item'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowItemForm(false)
                          setEditingItem(null)
                          setItemForm({
                            name: '',
                            description: '',
                            price: '',
                            category_id: '',
                            image_url: '',
                            is_available: true,
                            is_veg: true,
                            subcategory: 'veg'
                          })
                        }}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Menu Items List */}
              <div className="space-y-6">
                {categories.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg">
                    <div className="text-gray-500 mb-4">Create categories first to add menu items</div>
                    <button
                      onClick={() => setActiveTab('categories')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                    >
                      Go to Categories
                    </button>
                  </div>
                ) : (
                  categories.map((category) => {
                    const categoryItems = menuItems.filter(item => item.category_id === category.id)
                    
                    return (
                      <div key={category.id} className="bg-white rounded-lg shadow">
                        <div className="p-4 border-b border-gray-200">
                          <h3 className="text-lg font-semibold">{category.name}</h3>
                          {category.description && (
                            <p className="text-gray-600 text-sm">{category.description}</p>
                          )}
                        </div>
                        
                        {categoryItems.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            No items in this category
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-200">
                            {categoryItems.map((item) => (
                              <div key={item.id} className="p-4 flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    {item.image_url && (
                                      <img
                                        src={item.image_url}
                                        alt={item.name}
                                        className="w-16 h-16 object-cover rounded"
                                      />
                                    )}
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className={item.is_veg ? 'text-green-600' : 'text-red-600'}>
                                          {item.is_veg ? '🟢' : '🔴'}
                                        </span>
                                        <h4 className="font-semibold">{item.name}</h4>
                                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                                          {item.subcategory}
                                        </span>
                                      </div>
                                      {item.description && (
                                        <p className="text-gray-600 text-sm">{item.description}</p>
                                      )}
                                      <div className="flex items-center gap-4 mt-1">
                                        <span className="font-semibold text-green-600">
                                          ₹{item.price.toFixed(2)}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          item.is_available 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                          {item.is_available ? 'Available' : 'Unavailable'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2 ml-4">
                                  <button
                                    onClick={() => toggleItemAvailability(item.id, item.is_available || false)}
                                    className={`px-3 py-1 rounded text-xs font-medium ${
                                      item.is_available
                                        ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                                    }`}
                                  >
                                    {item.is_available ? 'Disable' : 'Enable'}
                                  </button>
                                  <button
                                    onClick={() => editItem(item)}
                                    className="text-blue-600 hover:text-blue-800 px-3 py-1 border border-blue-600 rounded text-xs"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteItem(item.id)}
                                    className="text-red-600 hover:text-red-800 px-3 py-1 border border-red-600 rounded text-xs"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}