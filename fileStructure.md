# Restaurant QR System — Current Overview

A concise overview of the current codebase structure (guest + admin, unified cart/checkout, Supabase auth).

restaurant-qr-system/
│
├── app/ # Next.js App routes (App Router)
│ ├── globals.css # Global styles / design tokens
│ ├── layout.tsx # Root layout / providers
│ ├── providers.tsx # Client providers (Zustand, Supabase, etc.)
│ │
│ ├── (guest)/ # Guest-facing routes (mobile-first)
│ │ ├── layout.tsx # Guest layout wrapper (minimal / modern)
│ │ ├── page.tsx # Optional landing page
│ │ ├── t/ # Table (QR) routes
│ │ │ └── [tableCode]/ # Dynamic table route
│ │ │ ├── page.tsx # Menu display page (table)
│ │ │ ├── loading.tsx
│ │ │ ├── error.tsx
│ │ │ └── cart/ # Unified cart + checkout (single page)
│ │ │ └── page.tsx # UnifiedCartPage — cart, email OTP, place order
│ │ │
│ │ ├── menu/ # Standalone menu route
│ │ │ └── page.tsx
│ │
│ │ ├── cart/ # legacy cart folder (kept/redirected to unified)
│ │ │ └── page.tsx # (may be replaced by unified cart under t/[tableCode])
│ │
│ │ ├── orders/ # Guest order tracking
│ │ │ ├── page.tsx # Order list / status
│ │ │ └── [orderId]/page.tsx # Order detail / tracking
│ │
│ │ └── auth/ # Guest auth helpers / verify flow (OTP)
│ │ ├── verify/page.tsx # OTP verification (if used separately)
│ │ └── ... # API-driven OTP hooks / helpers
│
├── app/admin/ # Admin area (dashboard)
│ ├── layout.tsx # Admin layout with sidebar (see components/admin/AdminLayout.tsx)
│ ├── page.tsx # Redirect to login/dashboard
│ ├── login/page.tsx # Admin login
│ ├── dashboard/
│ │ └── page.tsx # Admin dashboard (stats, realtime orders)
│ ├── orders/
│ │ ├── page.tsx # Active orders (realtime)
│ │ └── history/page.tsx # Order history
│ ├── menu/ # Menu management UI
│ │ └── page.tsx
│ └── tables/ # Table management + QR
│ └── [tableId]/page.tsx
│
├── components/ # Reusable UI and layout components
│ ├── guest/
│ │ ├── ModernGuestLayout.tsx # Modern guest layout wrapper (auth + cart count)
│ │ ├── GuestNavigation.tsx # Top / bottom nav for guest
│ │ ├── GuestAuth.tsx # Inline email -> OTP login component (Supabase)
│ │ ├── CartSummary.tsx # Cart bottom bar / summary
│ │ └── ... # MenuItemCard, CategoryTabs, GuestHeader, etc.
│ │
│ ├── admin/
│ │ ├── AdminLayout.tsx # Admin sidebar + top nav (logout, mobile nav)
│ │ ├── StatsCard.tsx
│ │ ├── Card.tsx
│ │ └── ... # admin ui components
│ │
│ └── ui/ # shared UI primitives (Button, Input, Modal, Badge)
│ ├── Button.tsx
│ ├── Input.tsx
│ ├── Modal.tsx
│ └── LoadingSpinner.tsx
│
├── lib/ # Shared libraries / clients
│ ├── supabase/
│ │ └── client.ts # Supabase client initialization (see: lib/supabase/client)
│ ├── auth/
│ │ └── email-auth.ts # Email OTP helpers (send, verify, signOut)
│ └── constants.ts # formatting helpers (formatCurrency, etc.)
│
├── pages-api/ or app/api/ # API routes (OTP send/verify, webhooks)
│ ├── api/auth/send-otp/route.ts # send OTP (Twilio or Supabase)
│ ├── api/auth/verify-otp/route.ts # verify OTP
│ └── api/webhooks/twilio/route.ts
│
├── styles/ # optional extra styles
│ └── ...
│
├── public/ # static assets
│ └── ...
│
├── next.config.js
├── tailwind.config.ts
├── package.json
└── README.md

Key files to inspect:

- Unified cart (guest): [app/(guest)/t/[tableCode]/cart/page.tsx](<app/(guest)/t/[tableCode]/cart/page.tsx>)
- Modern guest layout: [components/guest/ModernGuestLayout.tsx](components/guest/ModernGuestLayout.tsx)
- Guest auth (email OTP): [components/guest/GuestAuth.tsx](components/guest/GuestAuth.tsx)
- Admin layout: [components/admin/AdminLayout.tsx](components/admin/AdminLayout.tsx)
- Supabase client: [lib/supabase/client.ts](lib/supabase/client.ts)
- Global styles: [app/globals.css](app/globals.css)

Notes:

- Cart + checkout are consolidated into the unified cart page under each table route to provide inline email → OTP → place-order flow.
- Supabase Auth is used for guest email/OTP and persists session; logged-in guests skip OTP when placing orders.
- Admin area uses a dedicated sidebar layout with mobile logout and
