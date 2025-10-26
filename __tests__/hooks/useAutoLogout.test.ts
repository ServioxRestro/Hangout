import { renderHook, waitFor } from '@testing-library/react'
import { useAutoLogout } from '@/hooks/useAutoLogout'
import { supabase } from '@/lib/supabase/client'
import { signOut } from '@/lib/auth/msg91-widget'
import { useRouter } from 'next/navigation'

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

jest.mock('@/lib/auth/msg91-widget', () => ({
  signOut: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useParams: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock timers
jest.useFakeTimers()

describe('useAutoLogout', () => {
  const mockPush = jest.fn()
  const mockRouter = {
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }

  const mockSupabaseQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(supabase.from as jest.Mock).mockReturnValue(mockSupabaseQuery)
    ;(signOut as jest.Mock).mockResolvedValue({ success: true, message: 'Signed out' })

    // Mock localStorage
    Storage.prototype.removeItem = jest.fn()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
  })

  it('should not check session when disabled', () => {
    renderHook(() =>
      useAutoLogout({
        tableCode: 'TBL001',
        customerPhone: '919999999999',
        enabled: false,
        logoutDelayMinutes: 15,
      })
    )

    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('should not check session without tableCode', () => {
    renderHook(() =>
      useAutoLogout({
        tableCode: undefined,
        customerPhone: '919999999999',
        enabled: true,
        logoutDelayMinutes: 15,
      })
    )

    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('should not check session without customerPhone', () => {
    renderHook(() =>
      useAutoLogout({
        tableCode: 'TBL001',
        customerPhone: undefined,
        enabled: true,
        logoutDelayMinutes: 15,
      })
    )

    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('should check session status on mount', async () => {
    mockSupabaseQuery.maybeSingle.mockResolvedValue({
      data: {
        id: 'session-123',
        status: 'active',
        customer_phone: '919999999999',
        session_ended_at: null,
      },
      error: null,
    })

    renderHook(() =>
      useAutoLogout({
        tableCode: 'TBL001',
        customerPhone: '919999999999',
        enabled: true,
        logoutDelayMinutes: 15,
      })
    )

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('table_sessions')
    })
  })

  it('should NOT logout for active session', async () => {
    mockSupabaseQuery.maybeSingle.mockResolvedValue({
      data: {
        id: 'session-123',
        status: 'active',
        customer_phone: '919999999999',
        session_ended_at: null,
      },
      error: null,
    })

    renderHook(() =>
      useAutoLogout({
        tableCode: 'TBL001',
        customerPhone: '919999999999',
        enabled: true,
        logoutDelayMinutes: 15,
      })
    )

    // Fast-forward time
    jest.advanceTimersByTime(60000)

    await waitFor(() => {
      expect(signOut).not.toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  it('should NOT logout if session ended less than 15 minutes ago', async () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

    mockSupabaseQuery.maybeSingle.mockResolvedValue({
      data: {
        id: 'session-123',
        status: 'completed',
        customer_phone: '919999999999',
        session_ended_at: tenMinutesAgo,
      },
      error: null,
    })

    renderHook(() =>
      useAutoLogout({
        tableCode: 'TBL001',
        customerPhone: '919999999999',
        enabled: true,
        logoutDelayMinutes: 15,
      })
    )

    // Wait for check
    jest.advanceTimersByTime(1000)

    await waitFor(() => {
      expect(signOut).not.toHaveBeenCalled()
    })
  })

  it('should logout if session ended more than 15 minutes ago', async () => {
    const sixteenMinutesAgo = new Date(Date.now() - 16 * 60 * 1000).toISOString()

    mockSupabaseQuery.maybeSingle.mockResolvedValue({
      data: {
        id: 'session-123',
        status: 'completed',
        customer_phone: '919999999999',
        session_ended_at: sixteenMinutesAgo,
      },
      error: null,
    })

    renderHook(() =>
      useAutoLogout({
        tableCode: 'TBL001',
        customerPhone: '919999999999',
        enabled: true,
        logoutDelayMinutes: 15,
      })
    )

    // Wait for initial check
    await waitFor(() => {
      expect(signOut).toHaveBeenCalled()
      expect(localStorage.removeItem).toHaveBeenCalledWith('cart_TBL001')
      expect(mockPush).toHaveBeenCalledWith('/t/TBL001')
    })
  })

  it('should check session every 60 seconds', async () => {
    mockSupabaseQuery.maybeSingle.mockResolvedValue({
      data: {
        id: 'session-123',
        status: 'active',
        customer_phone: '919999999999',
        session_ended_at: null,
      },
      error: null,
    })

    renderHook(() =>
      useAutoLogout({
        tableCode: 'TBL001',
        customerPhone: '919999999999',
        enabled: true,
        logoutDelayMinutes: 15,
      })
    )

    // Initial check
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledTimes(1)
    })

    // After 60 seconds
    jest.advanceTimersByTime(60000)

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledTimes(2)
    })

    // After another 60 seconds
    jest.advanceTimersByTime(60000)

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledTimes(3)
    })
  })

  it('should handle custom logout delay minutes', async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    mockSupabaseQuery.maybeSingle.mockResolvedValue({
      data: {
        id: 'session-123',
        status: 'completed',
        customer_phone: '919999999999',
        session_ended_at: fiveMinutesAgo,
      },
      error: null,
    })

    // Set logout delay to 3 minutes
    renderHook(() =>
      useAutoLogout({
        tableCode: 'TBL001',
        customerPhone: '919999999999',
        enabled: true,
        logoutDelayMinutes: 3,
      })
    )

    // Should logout because 5 minutes > 3 minutes
    await waitFor(() => {
      expect(signOut).toHaveBeenCalled()
    })
  })

  it('should handle database errors gracefully', async () => {
    mockSupabaseQuery.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    })

    renderHook(() =>
      useAutoLogout({
        tableCode: 'TBL001',
        customerPhone: '919999999999',
        enabled: true,
        logoutDelayMinutes: 15,
      })
    )

    // Should not crash
    jest.advanceTimersByTime(1000)

    await waitFor(() => {
      expect(signOut).not.toHaveBeenCalled()
    })
  })

  it('should handle no session found', async () => {
    mockSupabaseQuery.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    })

    renderHook(() =>
      useAutoLogout({
        tableCode: 'TBL001',
        customerPhone: '919999999999',
        enabled: true,
        logoutDelayMinutes: 15,
      })
    )

    jest.advanceTimersByTime(1000)

    await waitFor(() => {
      expect(signOut).not.toHaveBeenCalled()
    })
  })

  it('should cleanup interval on unmount', async () => {
    mockSupabaseQuery.maybeSingle.mockResolvedValue({
      data: {
        id: 'session-123',
        status: 'active',
        customer_phone: '919999999999',
        session_ended_at: null,
      },
      error: null,
    })

    const { unmount } = renderHook(() =>
      useAutoLogout({
        tableCode: 'TBL001',
        customerPhone: '919999999999',
        enabled: true,
        logoutDelayMinutes: 15,
      })
    )

    const callCountBeforeUnmount = (supabase.from as jest.Mock).mock.calls.length

    unmount()

    // Advance time after unmount
    jest.advanceTimersByTime(120000)

    // Should not make any more calls
    expect((supabase.from as jest.Mock).mock.calls.length).toBe(callCountBeforeUnmount)
  })
})
