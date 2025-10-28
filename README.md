# Restaurant QR System

A modern QR-based ordering system for restaurants built with Next.js 14, Supabase, and TypeScript.

## Features

### Guest Side (Customer Experience)

- **QR Code Scanning**: Each table has a unique QR code that opens `/t/[tableCode]`
- **Mobile-Optimized Menu**: Browse categories and menu items
- **Shopping Cart**: Add items with quantities and special instructions
- **OTP Authentication**: Secure login using phone number OTP
- **Order Tracking**: Real-time order status updates

### Admin Side (Restaurant Management)

- **Secure Authentication**: Supabase Auth for admin access
- **Dashboard**: Real-time overview of orders, tables, and revenue
- **Table Management**: Add/edit tables and generate QR codes
- **Menu Management**: Manage categories and menu items
- **Order Management**: Update order status in real-time
- **Analytics**: Track sales and performance metrics

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Styling**: Tailwind CSS, shadcn/ui
- **State Management**: Zustand
- **OTP Service**: Twilio WhatsApp API
- **QR Generation**: qrcode library

## Getting Started

### Prerequisites

1. **Node.js** 18.17 or later
2. **Supabase Account** - Create at [supabase.com](https://supabase.com)
3. **MSG91 ACCOUNR** - For Phone OTP

### Installation

1. **Clone and Install Dependencies**

   ```bash
   npm install
   ```

2. **Environment Setup**

   ```bash
   cp .env.example .env.local
   ```

   Fill in your environment variables in `.env.local`

3. **Database Setup**

   Run the SQL schema in your Supabase SQL editor (see full setup in project files)

4. **Run Development Server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)
