'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginAdmin } from '@/lib/auth'
import Card from '@/components/admin/Card'
import Button from '@/components/admin/Button'
import FormField from '@/components/admin/FormField'
import Input from '@/components/admin/Input'
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await loginAdmin(email, password)

    if (result.success && result.admin) {
      // Store admin session in httpOnly cookie via API
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId: result.admin.id, email: result.admin.email }),
      })

      if (response.ok) {
        router.push('/admin/dashboard')
      } else {
        setError('Session creation failed')
      }
    } else {
      setError(result.error || 'Login failed')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo and Brand */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-2xl">H</span>
          </div>
        </div>
        
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h2>
          <p className="text-sm text-gray-600">
            Sign in to access your restaurant dashboard
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="shadow-xl border-0">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}

            <FormField label="Email Address" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@hangout.com"
                leftIcon={<Mail className="w-4 h-4" />}
                required
                autoComplete="email"
                error={!!error}
              />
            </FormField>

            <FormField label="Password" required>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
                required
                autoComplete="current-password"
                error={!!error}
              />
            </FormField>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                  Forgot password?
                </a>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
              leftIcon={!loading ? <Lock className="w-4 h-4" /> : undefined}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <div className="text-sm text-gray-500">
                Secure access to{' '}
                <span className="font-semibold text-gray-900">
                  {process.env.NEXT_PUBLIC_RESTAURANT_NAME || 'Restaurant'} Admin
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="text-xs text-gray-500">
            © 2024 Hangout Restaurant System. All rights reserved.
          </div>
          <div className="mt-2 flex justify-center space-x-4 text-xs">
            <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
              Support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}