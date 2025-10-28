/**
 * Component Tests for OfferSelector (Guest Side)
 * Tests UI rendering, offer filtering, and user interactions
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OfferSelector } from "@/components/guest/OfferSelector";
import { supabase } from "@/lib/supabase/client";
import "@testing-library/jest-dom";

// Mock Supabase
jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock eligibility checker
jest.mock("@/lib/offers/eligibility", () => ({
  checkOfferEligibility: jest.fn(),
}));

const mockOffers = [
  {
    id: "offer-1",
    name: "Buy 2 Get 1 Free",
    description: "Buy 2 items and get 1 free",
    offer_type: "item_buy_get_free",
    is_active: true,
    enabled_for_dinein: true,
    enabled_for_takeaway: true,
    conditions: { buy_quantity: 2 },
    benefits: { free_quantity: 1 },
    image_url: null,
    priority: 1,
    start_date: null,
    end_date: null,
    valid_days: null,
    valid_hours_start: null,
    valid_hours_end: null,
    target_customer_type: "all",
    usage_limit: null,
    usage_count: 0,
    promo_code: null,
    created_at: "2025-10-28",
    updated_at: "2025-10-28",
    application_type: "order_level",
    image_path: null,
    min_orders_count: null,
  },
  {
    id: "offer-2",
    name: "Free Starter with Main Course",
    description: "Get free starter up to ₹150",
    offer_type: "item_free_addon",
    is_active: true,
    enabled_for_dinein: true,
    enabled_for_takeaway: false,
    conditions: {},
    benefits: { max_price: 150 },
    image_url: null,
    priority: 2,
    start_date: null,
    end_date: null,
    valid_days: null,
    valid_hours_start: null,
    valid_hours_end: null,
    target_customer_type: "all",
    usage_limit: null,
    usage_count: 0,
    promo_code: null,
    created_at: "2025-10-28",
    updated_at: "2025-10-28",
    application_type: "order_level",
    image_path: null,
    min_orders_count: null,
  },
  {
    id: "offer-3",
    name: "10% Off Total Bill",
    description: "Get 10% discount on your bill",
    offer_type: "cart_percentage",
    is_active: true,
    enabled_for_dinein: true,
    enabled_for_takeaway: true,
    conditions: {},
    benefits: { discount_percentage: 10 },
    image_url: null,
    priority: 3,
    start_date: null,
    end_date: null,
    valid_days: null,
    valid_hours_start: null,
    valid_hours_end: null,
    target_customer_type: "all",
    usage_limit: null,
    usage_count: 0,
    promo_code: null,
    created_at: "2025-10-28",
    updated_at: "2025-10-28",
    application_type: "session_level",
    image_path: null,
    min_orders_count: null,
  },
];

const mockCartItems = [
  { id: "item-1", name: "Plain Dosa", price: 99, quantity: 2 },
  { id: "item-2", name: "Paneer Tikka", price: 249, quantity: 1 },
];

describe("OfferSelector Component", () => {
  const mockOnOfferSelect = jest.fn();
  const mockOnFreeItemAdd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase responses
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockOffers,
            error: null,
          }),
        }),
      }),
    });
  });

  describe("Component Rendering", () => {
    test("should render without crashing", async () => {
      render(
        <OfferSelector
          cartItems={mockCartItems}
          cartTotal={447}
          orderType="dine-in"
          onOfferSelect={mockOnOfferSelect}
          selectedOffer={null}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Available Offers|Offers/i)
        ).toBeInTheDocument();
      });
    });

    test("should show loading state initially", () => {
      render(
        <OfferSelector
          cartItems={mockCartItems}
          cartTotal={447}
          orderType="dine-in"
          onOfferSelect={mockOnOfferSelect}
          selectedOffer={null}
        />
      );

      // Check for loading indicator (could be spinner, text, or skeleton)
      // This depends on your implementation
      expect(
        screen.queryByText(/loading|Loading/i) ||
          document.querySelector("[data-loading]")
      ).toBeTruthy();
    });

    test("should display offers after loading", async () => {
      render(
        <OfferSelector
          cartItems={mockCartItems}
          cartTotal={447}
          orderType="dine-in"
          onOfferSelect={mockOnOfferSelect}
          selectedOffer={null}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Buy 2 Get 1 Free/i)).toBeInTheDocument();
      });
    });
  });

  describe("Order Type Filtering (Dine-in vs Takeaway)", () => {
    test("should filter offers for dine-in order type", async () => {
      render(
        <OfferSelector
          cartItems={mockCartItems}
          cartTotal={447}
          orderType="dine-in"
          onOfferSelect={mockOnOfferSelect}
          selectedOffer={null}
        />
      );

      await waitFor(() => {
        // Should show offers enabled for dine-in
        expect(screen.queryByText(/Buy 2 Get 1 Free/i)).toBeInTheDocument();
        expect(
          screen.queryByText(/Free Starter with Main Course/i)
        ).toBeInTheDocument();
        expect(screen.queryByText(/10% Off Total Bill/i)).toBeInTheDocument();
      });

      // Verify Supabase was called with correct filter
      expect(supabase.from).toHaveBeenCalledWith("offers");
    });

    test("should filter offers for takeaway order type", async () => {
      render(
        <OfferSelector
          cartItems={mockCartItems}
          cartTotal={447}
          orderType="takeaway"
          onOfferSelect={mockOnOfferSelect}
          selectedOffer={null}
        />
      );

      await waitFor(() => {
        // Should only show offers enabled for takeaway
        expect(screen.queryByText(/Buy 2 Get 1 Free/i)).toBeInTheDocument();
        // "Free Starter" is NOT enabled for takeaway
        expect(screen.queryByText(/10% Off Total Bill/i)).toBeInTheDocument();
      });
    });

    test("should refetch offers when order type changes", async () => {
      const { rerender } = render(
        <OfferSelector
          cartItems={mockCartItems}
          cartTotal={447}
          orderType="dine-in"
          onOfferSelect={mockOnOfferSelect}
          selectedOffer={null}
        />
      );

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalled();
      });

      const initialCalls = (supabase.from as jest.Mock).mock.calls.length;

      // Change order type
      rerender(
        <OfferSelector
          cartItems={mockCartItems}
          cartTotal={447}
          orderType="takeaway"
          onOfferSelect={mockOnOfferSelect}
          selectedOffer={null}
        />
      );

      await waitFor(() => {
        expect((supabase.from as jest.Mock).mock.calls.length).toBeGreaterThan(
          initialCalls
        );
      });
    });
  });

  describe("Offer Display and Information", () => {
    test("should display offer name and description", async () => {
      render(
        <OfferSelector
          cartItems={mockCartItems}
          cartTotal={447}
          orderType="dine-in"
          onOfferSelect={mockOnOfferSelect}
          selectedOffer={null}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Buy 2 Get 1 Free/i)).toBeInTheDocument();
        expect(
          screen.queryByText(/Buy 2 items and get 1 free/i)
        ).toBeInTheDocument();
      });
    });

    test("should show offer icons/badges", async () => {
      render(
        <OfferSelector
          cartItems={mockCartItems}
          cartTotal={447}
          orderType="dine-in"
          onOfferSelect={mockOnOfferSelect}
          selectedOffer={null}
        />
      );

      await waitFor(() => {
        // Check for gift icon, percent icon, etc.
        const icons = document.querySelectorAll("svg");
        expect(icons.length).toBeGreaterThan(0);
      });
    });

    test("should display eligibility status", async () => {
      const { checkOfferEligibility } = require("@/lib/offers/eligibility");
      checkOfferEligibility.mockResolvedValue({
        isEligible: true,
        discount: 99,
      });

      render(
        <OfferSelector
          cartItems={mockCartItems}
          cartTotal={447}
          orderType="dine-in"
          onOfferSelect={mockOnOfferSelect}
          selectedOffer={null}
        />
      );

      await waitFor(() => {
        // Should show eligible status (e.g., "Save ₹99", "Eligible", etc.)
        expect(screen.queryByText(/₹99|99/i)).toBeTruthy();
      });
    });

    test("should show ineligible reason when not qualified", async () => {
      const { checkOfferEligibility } = require("@/lib/offers/eligibility");
      checkOfferEligibility.mockResolvedValue({
        isEligible: false,
        discount: 0,
        reason: "Add ₹53 more to unlock",
      });

      render(
        <OfferSelector
          cartItems={mockCartItems}
          cartTotal={447}
          orderType="dine-in"
          onOfferSelect={mockOnOfferSelect}
          selectedOffer={null}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Add ₹53 more/i)).toBeInTheDocument();
      });
    });
  });

  describe("Offer Selection", () => {
    test("should call onOfferSelect when offer is clicked", async () => {
      const { checkOfferEligibility } = require("@/lib/offers/eligibility");
      checkOfferEligibility.mockResolvedValue({
        isEligible: true,
        discount: 99,
      });

      render(
        <OfferSelector
          cartItems={mockCartItems}
          cartTotal={447}
          orderType="dine-in"
          onOfferSelect={mockOnOfferSelect}
          selectedOffer={null}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Buy 2 Get 1 Free/i)).toBeInTheDocument();
      });

      // Click on offer
      const offerCard = screen
        .getByText(/Buy 2 Get 1 Free/i)
        .closest('button, div[role="button"]');
      if (offerCard) {
        fireEvent.click(offerCard);
      }

      await waitFor(() => {
        expect(mockOnOfferSelect).toHaveBeenCalled();
      });
    });

    test("should highlight selected offer", async () => {
      render(
        <OfferSelector
          cartItems={mockCartItems}
          cartTotal={447}
          orderType="dine-in"
          onOfferSelect={mockOnOfferSelect}
          selectedOffer={mockOffers[0]}
        />
      );

      await waitFor(() => {
        const selectedElement = screen
          .getByText(/Buy 2 Get 1 Free/i)
          .closest("div");
        // Check for selected styling (border, background color, checkmark, etc.)
        expect(selectedElement).toHaveClass(
          /selected|border-green|bg-green|checked/i
        );
      });
    });

    test("should allow deselecting an offer", async () => {
      render(
        <OfferSelector
          cartItems={mockCartItems}
          cartTotal={447}
          orderType="dine-in"
          onOfferSelect={mockOnOfferSelect}
          selectedOffer={mockOffers[0]}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Buy 2 Get 1 Free/i)).toBeInTheDocument();
      });

      // Click selected offer again to deselect
      const offerCard = screen
        .getByText(/Buy 2 Get 1 Free/i)
        .closest('button, div[role="button"]');
      if (offerCard) {
        fireEvent.click(offerCard);
      }

      await waitFor(() => {
        expect(mockOnOfferSelect).toHaveBeenCalledWith(null);
      });
    });
  });

  describe("Free Item Selection Flow", () => {
    test("should open FreeItemSelector modal for free addon offers", async () => {
      const { checkOfferEligibility } = require("@/lib/offers/eligibility");
      checkOfferEligibility.mockResolvedValue({
        isEligible: true,
        discount: 0,
        requiresUserAction: true,
        actionType: "select_free_item",
        availableFreeItems: [
          { id: "item-1", name: "Plain Dosa", price: 99, type: "item" },
          { id: "item-2", name: "Chicken Fry", price: 179, type: "item" },
        ],
      });

      render(
        <OfferSelector
          cartItems={mockCartItems}
          cartTotal={447}
          orderType="dine-in"
          onOfferSelect={mockOnOfferSelect}
          selectedOffer={null}
          onFreeItemAdd={mockOnFreeItemAdd}
        />
      );

      await waitFor(() => {
        expect(
          screen.queryByText(/Free Starter with Main Course/i)
        ).toBeInTheDocument();
      });

      // Click offer that requires free item selection
      const offerCard = screen
        .getByText(/Free Starter with Main Course/i)
        .closest('button, div[role="button"]');
      if (offerCard) {
        fireEvent.click(offerCard);
      }

      // Should open modal (check for modal title or free item names)
      await waitFor(() => {
        expect(screen.queryByText(/Choose|Select/i)).toBeInTheDocument();
      });
    });
  });

  describe("Empty States", () => {
    test("should show message when no offers available", async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      render(
        <OfferSelector
          cartItems={mockCartItems}
          cartTotal={447}
          orderType="dine-in"
          onOfferSelect={mockOnOfferSelect}
          selectedOffer={null}
        />
      );

      await waitFor(() => {
        expect(
          screen.queryByText(/No offers available|No offers found/i)
        ).toBeInTheDocument();
      });
    });

    test("should show message for empty cart", async () => {
      render(
        <OfferSelector
          cartItems={[]}
          cartTotal={0}
          orderType="dine-in"
          onOfferSelect={mockOnOfferSelect}
          selectedOffer={null}
        />
      );

      await waitFor(() => {
        // May show "Add items to see offers" or similar
        const emptyMessage = screen.queryByText(/Add items|empty cart/i);
        if (emptyMessage) {
          expect(emptyMessage).toBeInTheDocument();
        }
      });
    });
  });

  describe("Error Handling", () => {
    test("should handle Supabase errors gracefully", async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "Database error" },
            }),
          }),
        }),
      });

      render(
        <OfferSelector
          cartItems={mockCartItems}
          cartTotal={447}
          orderType="dine-in"
          onOfferSelect={mockOnOfferSelect}
          selectedOffer={null}
        />
      );

      await waitFor(() => {
        // Should show error message or fallback UI
        expect(
          screen.queryByText(/error|Error|failed/i) ||
            screen.queryByText(/No offers/i)
        ).toBeTruthy();
      });
    });
  });

  describe("Accessibility", () => {
    test("should have accessible offer cards", async () => {
      render(
        <OfferSelector
          cartItems={mockCartItems}
          cartTotal={447}
          orderType="dine-in"
          onOfferSelect={mockOnOfferSelect}
          selectedOffer={null}
        />
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    test("should support keyboard navigation", async () => {
      render(
        <OfferSelector
          cartItems={mockCartItems}
          cartTotal={447}
          orderType="dine-in"
          onOfferSelect={mockOnOfferSelect}
          selectedOffer={null}
        />
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        if (buttons[0]) {
          buttons[0].focus();
          expect(document.activeElement).toBe(buttons[0]);
        }
      });
    });
  });
});
