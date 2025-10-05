# Dynamic Admin Navigation System

## Overview

The admin navigation system has been enhanced with dynamic, role-based sub-tabs that provide easy access to all admin functionality while respecting user permissions.

## Features

### 🔐 Role-Based Access Control

The navigation automatically adjusts based on user roles:

- **Super Admin**: Full access to all features including staff management
- **Manager**: Access to most features except staff management
- **Waiter**: Limited access to orders and table sessions only

### 🎯 Smart Navigation

- **Sub-tabs in Main Navigation**: Sub-routes are now visible directly in the sidebar
- **Auto-expand**: When visiting a sub-route, the parent section automatically expands
- **Smart Redirects**: If a user can't access a main route but can access sub-routes, clicking the main item redirects to the first accessible sub-route

### 📱 Mobile Responsive

- Full functionality on mobile devices
- Collapsible sidebar with touch-friendly interactions
- Automatic sidebar close on mobile navigation

## Navigation Structure

### Orders Section

- **Active Orders** (`/admin/orders`)
- **Create Order** (`/admin/orders/create`)
- **Order History** (`/admin/orders/history`)

### Tables Section

- **Table Management** (`/admin/tables`)
- **Table Sessions** (`/admin/tables/sessions`)

### Single Pages

- **Dashboard** (`/admin/dashboard`)
- **Menu** (`/admin/menu`)
- **Offers** (`/admin/offers`)
- **Staff** (`/admin/staff`) - Super Admin only

## Role-Specific Examples

### Waiter Role

```
✅ Orders
  ✅ Active Orders
  ✅ Create Order
  ✅ Order History
✅ Tables (redirects to Table Sessions)
  ✅ Table Sessions
❌ Dashboard
❌ Menu
❌ Offers
❌ Staff
```

### Manager Role

```
✅ Dashboard
✅ Orders
  ✅ Active Orders
  ✅ Create Order
  ✅ Order History
✅ Tables
  ✅ Table Management
  ✅ Table Sessions
✅ Menu
✅ Offers
❌ Staff
```

### Super Admin Role

```
✅ Dashboard
✅ Orders (all sub-routes)
✅ Tables (all sub-routes)
✅ Menu
✅ Offers
✅ Staff
```

## Implementation Details

### Components

- **`DynamicNavbar.tsx`**: Main navigation component with role-based filtering
- **`AdminLayout.tsx`**: Updated to use the new dynamic navigation system

### Key Features

1. **Expandable Sections**: Sections with sub-routes can be expanded/collapsed
2. **Visual Indicators**: Active routes and sub-routes are clearly highlighted
3. **Permission Handling**: Seamless handling of partial access (e.g., sub-routes without main route access)
4. **Mobile Support**: Optimized for mobile with sidebar auto-close

### Usage

The navigation system automatically works based on the authenticated user's role. No additional configuration is needed - it reads permissions from the existing `canAccessRoute()` function in `lib/auth.ts`.

## Benefits

1. **Better UX**: Users can quickly navigate to any sub-page without multiple clicks
2. **Role Clarity**: Clear visual indication of what each role can access
3. **Efficiency**: Direct access to frequently used pages like "Create Order" and "Table Sessions"
4. **Maintainable**: Easy to add new routes or modify permissions
5. **Responsive**: Works seamlessly across all device sizes

## Adding New Routes

To add new routes to the navigation:

1. Add the route to `allNavigation` array in `DynamicNavbar.tsx`
2. Update role permissions in `lib/auth.ts`
3. The navigation will automatically handle the new route based on permissions

Example:

```typescript
{
  name: "Reports",
  href: "/admin/reports",
  icon: BarChart,
  subItems: [
    {
      name: "Sales Report",
      href: "/admin/reports/sales",
      icon: TrendingUp,
    },
    {
      name: "Inventory Report",
      href: "/admin/reports/inventory",
      icon: Package,
    }
  ]
}
```
