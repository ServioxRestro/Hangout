restaurant-qr-system/
│
├── app/ # Next.js 13+ App Router
│ ├── (guest)/ # Guest-facing routes (restaurant.com)
│ │ ├── layout.tsx # Guest layout with minimal UI
│ │ ├── page.tsx # Landing page (optional)
│ │ ├── t/ # Table routes
│ │ │ └── [tableCode]/ # Dynamic route for QR codes
│ │ │ ├── page.tsx # Menu display page
│ │ │ ├── loading.tsx # Loading state
│ │ │ └── error.tsx # Error boundary
│ │ ├── menu/ # Standalone menu
│ │ │ └── page.tsx
│ │ ├── cart/ # Cart page
│ │ │ └── page.tsx
│ │ ├── orders/ # Order tracking
│ │ │ ├── page.tsx # Orders list
│ │ │ └── [orderId]/
│ │ │ └── page.tsx # Order details/tracking
│ │ └── auth/ # Guest auth flow
│ │ ├── verify/
│ │ │ └── page.tsx # OTP verification
│ │ └── error/
│ │ └── page.tsx
│ │
│ ├── admin/ # Admin routes (restaurant.admin.com or /admin)
│ │ ├── layout.tsx # Admin layout with sidebar
│ │ ├── page.tsx # Redirect to login or dashboard
│ │ ├── login/ # Admin login
│ │ │ └── page.tsx
│ │ ├── dashboard/ # Main dashboard
│ │ │ ├── page.tsx # Overview/stats
│ │ │ └── loading.tsx
│ │ ├── orders/ # Order management
│ │ │ ├── page.tsx # Active orders (realtime)
│ │ │ ├── history/ # Order history
│ │ │ │ └── page.tsx
│ │ │ └── [orderId]/
│ │ │ └── page.tsx # Order details
│ │ ├── tables/ # Table management
│ │ │ ├── page.tsx # Tables list
│ │ │ ├── new/
│ │ │ │ └── page.tsx # Add new table
│ │ │ └── [tableId]/
│ │ │ ├── page.tsx # Edit table
│ │ │ └── qr/
│ │ │ └── page.tsx # Generate/view QR
│ │ ├── menu/ # Menu management
│ │ │ ├── page.tsx # Menu items list
│ │ │ ├── categories/
│ │ │ │ ├── page.tsx # Categories list
│ │ │ │ └── new/
│ │ │ │ └── page.tsx
│ │ │ ├── items/
│ │ │ │ ├── new/
│ │ │ │ │ └── page.tsx # Add new item
│ │ │ │ └── [itemId]/
│ │ │ │ └── page.tsx # Edit item
│ │ │ └── import/
│ │ │ └── page.tsx # Bulk import
│ │ ├── analytics/ # Reports & analytics
│ │ │ └── page.tsx
│ │ └── settings/ # Restaurant settings
│ │ ├── page.tsx
│ │ ├── staff/
│ │ │ └── page.tsx # Staff management
│ │ └── profile/
│ │ └── page.tsx
│ │
│ ├── api/ # API routes
│ │ ├── auth/
│ │ │ ├── send-otp/
│ │ │ │ └── route.ts # Send OTP via Twilio
│ │ │ └── verify-otp/
│ │ │ └── route.ts # Verify OTP
│ │ ├── webhooks/
│ │ │ ├── twilio/
│ │ │ │ └── route.ts # Twilio webhooks
│ │ │ └── stripe/
│ │ │ └── route.ts # Payment webhooks
│ │ └── admin/
│ │ └── reports/
│ │ └── route.ts # Generate reports
│ │
│ ├── layout.tsx # Root layout
│ ├── globals.css # Global styles
│ └── providers.tsx # Client providers wrapper
│
