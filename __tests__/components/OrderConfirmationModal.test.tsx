import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrderConfirmationModal from '@/components/guest/OrderConfirmationModal'

// Mock timers
jest.useFakeTimers()

describe('OrderConfirmationModal', () => {
  const mockCartItems = [
    { id: '1', name: 'Pizza', price: 200, quantity: 2, is_veg: true },
    { id: '2', name: 'Burger', price: 150, quantity: 1, is_veg: false },
  ]

  const defaultProps = {
    isOpen: true,
    cartItems: mockCartItems,
    totalAmount: 550,
    discount: 50,
    finalAmount: 500,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    countdownSeconds: 30,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
  })

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers()
    })
  })

  it('should render modal when isOpen is true', () => {
    render(<OrderConfirmationModal {...defaultProps} />)

    expect(screen.getByText('Confirming Your Order')).toBeInTheDocument()
    expect(screen.getByText('Place Order Now')).toBeInTheDocument()
    expect(screen.getByText('Cancel Order')).toBeInTheDocument()
  })

  it('should not render when isOpen is false', () => {
    render(<OrderConfirmationModal {...defaultProps} isOpen={false} />)

    expect(screen.queryByText('Confirming Your Order')).not.toBeInTheDocument()
  })

  it('should display cart items in order summary', () => {
    render(<OrderConfirmationModal {...defaultProps} />)

    expect(screen.getByText('Pizza')).toBeInTheDocument()
    expect(screen.getByText('Burger')).toBeInTheDocument()
    expect(screen.getByText(/₹\s*200.*×.*2/)).toBeInTheDocument()
    expect(screen.getAllByText(/₹\s*150/)).toHaveLength(2) // Appears in unit price and total
  })

  it('should display correct total and discount', () => {
    render(<OrderConfirmationModal {...defaultProps} />)

    expect(screen.getByText(/₹\s*550/)).toBeInTheDocument() // Subtotal
    expect(screen.getByText(/-₹\s*50/)).toBeInTheDocument() // Discount
    expect(screen.getByText(/₹\s*500/)).toBeInTheDocument() // Final amount
  })

  it('should show countdown timer (30s)', () => {
    render(<OrderConfirmationModal {...defaultProps} />)

    expect(screen.getByText(/\(30s\)/)).toBeInTheDocument()
  })

  it('should decrement countdown every second', async () => {
    render(<OrderConfirmationModal {...defaultProps} />)

    expect(screen.getByText(/\(30s\)/)).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(screen.getByText(/\(29s\)/)).toBeInTheDocument()
    })

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(screen.getByText(/\(28s\)/)).toBeInTheDocument()
    })
  })

  it('should call onConfirm when "Place Order Now" is clicked', async () => {
    const user = userEvent.setup({ delay: null })
    render(<OrderConfirmationModal {...defaultProps} />)

    const confirmButton = screen.getByText('Place Order Now')
    await user.click(confirmButton)

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1)
  })

  it('should call onCancel when "Cancel Order" is clicked', async () => {
    const user = userEvent.setup({ delay: null })
    render(<OrderConfirmationModal {...defaultProps} />)

    const cancelButton = screen.getByText('Cancel Order')
    await user.click(cancelButton)

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
  })

  it('should disable cancel button when order is being placed', async () => {
    const user = userEvent.setup({ delay: null })
    render(<OrderConfirmationModal {...defaultProps} isPlacingOrder={true} />)

    const cancelButton = screen.getByText('Processing order...')
    expect(cancelButton).toBeDisabled()

    // Try to click - should not call onCancel
    await user.click(cancelButton)
    expect(defaultProps.onCancel).not.toHaveBeenCalled()
  })

  it('should allow cancel when order is not being placed', async () => {
    const user = userEvent.setup({ delay: null })
    render(<OrderConfirmationModal {...defaultProps} isPlacingOrder={false} />)

    const cancelButton = screen.getByText('Cancel Order')
    expect(cancelButton).not.toBeDisabled()

    await user.click(cancelButton)
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
  })

  it('should auto-submit when countdown reaches 0', async () => {
    render(<OrderConfirmationModal {...defaultProps} />)

    // Fast-forward 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000)
    })

    await waitFor(() => {
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1)
    })
  })

  it('should update progress bar from 0% to 100%', async () => {
    const { container } = render(<OrderConfirmationModal {...defaultProps} />)

    // Get progress bar element by finding the one with width style
    const progressBars = container.querySelectorAll('[style*="width"]')
    const progressBar = Array.from(progressBars).find(el =>
      el.className.includes('bg-gradient-to-r')
    ) as HTMLElement

    expect(progressBar).toBeTruthy()

    // Progress should start at 0%
    const initialStyle = progressBar.getAttribute('style')
    expect(initialStyle).toContain('0%')

    // After 15 seconds, should be around 50%
    act(() => {
      jest.advanceTimersByTime(15000)
    })

    await waitFor(() => {
      const style = progressBar.getAttribute('style')
      expect(style).toContain('width')
      // Progress should be close to 50% (allowing for some variance)
      const widthMatch = style?.match(/width:\s*(\d+(?:\.\d+)?)%/)
      if (widthMatch) {
        const width = parseFloat(widthMatch[1])
        expect(width).toBeGreaterThan(40)
        expect(width).toBeLessThan(60)
      }
    })
  })

  it('should display veg and non-veg indicators', () => {
    const { container } = render(<OrderConfirmationModal {...defaultProps} />)

    // Check that veg emoji appears (Pizza is veg)
    expect(container.innerHTML).toContain('🟢')

    // Check that non-veg emoji appears (Burger is non-veg)
    expect(container.innerHTML).toContain('🔴')
  })

  it('should reset countdown when modal reopens', async () => {
    const { rerender } = render(<OrderConfirmationModal {...defaultProps} />)

    // Advance time
    act(() => {
      jest.advanceTimersByTime(10000)
    })

    await waitFor(() => {
      expect(screen.getByText(/\(20s\)/)).toBeInTheDocument()
    })

    // Close modal
    rerender(<OrderConfirmationModal {...defaultProps} isOpen={false} />)

    // Reopen modal
    rerender(<OrderConfirmationModal {...defaultProps} isOpen={true} />)

    // Countdown should reset to 30
    expect(screen.getByText(/\(30s\)/)).toBeInTheDocument()
  })

  it('should display correct item quantities', () => {
    render(<OrderConfirmationModal {...defaultProps} />)

    expect(screen.getByText(/₹\s*200.*×.*2/)).toBeInTheDocument() // Pizza x2
    expect(screen.getByText(/₹\s*150.*×.*1/)).toBeInTheDocument() // Burger x1
  })

  it('should calculate and display item totals correctly', () => {
    render(<OrderConfirmationModal {...defaultProps} />)

    // Pizza: 200 × 2 = 400
    expect(screen.getByText(/₹\s*400/)).toBeInTheDocument()

    // Burger: 150 × 1 = 150 (appears in line item detail)
    expect(screen.getByText(/₹\s*150.*×/)).toBeInTheDocument()
  })
})
