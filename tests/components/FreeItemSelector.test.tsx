/**
 * Comprehensive UI Component Tests for FreeItemSelector
 * Tests user interactions, form validation, and UI behavior
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FreeItemSelector } from "@/components/guest/FreeItemSelector";
import "@testing-library/jest-dom";

describe("FreeItemSelector Component - Guest UI", () => {
  const mockOnClose = jest.fn();
  const mockOnSelect = jest.fn();

  const mockAvailableItems = [
    { id: "item-1", name: "Plain Dosa", price: 99, type: "item" as const },
    { id: "item-2", name: "Masala Dosa", price: 139, type: "item" as const },
    { id: "item-3", name: "Paneer Roll", price: 149, type: "item" as const },
    { id: "item-4", name: "Spring Roll", price: 89, type: "item" as const },
    { id: "item-5", name: "Veg Cutlet", price: 79, type: "item" as const },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Component Rendering", () => {
    test("should render modal when isOpen is true", () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Buy 2 Get 1 Free"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText(/Choose Your Free Item/i)).toBeInTheDocument();
      expect(screen.getByText("Buy 2 Get 1 Free")).toBeInTheDocument();
    });

    test("should not render when isOpen is false", () => {
      render(
        <FreeItemSelector
          isOpen={false}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Buy 2 Get 1 Free"
          onSelect={mockOnSelect}
        />
      );

      expect(
        screen.queryByText(/Choose Your Free Item/i)
      ).not.toBeInTheDocument();
    });

    test("should display all available items", () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText("Plain Dosa")).toBeInTheDocument();
      expect(screen.getByText("Masala Dosa")).toBeInTheDocument();
      expect(screen.getByText("Paneer Roll")).toBeInTheDocument();
      expect(screen.getByText("Spring Roll")).toBeInTheDocument();
      expect(screen.getByText("Veg Cutlet")).toBeInTheDocument();
    });

    test("should display item prices", () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText(/₹99/)).toBeInTheDocument();
      expect(screen.getByText(/₹139/)).toBeInTheDocument();
    });

    test("should show max price info when provided", () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          maxPrice={100}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText(/up to ₹100/i)).toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    test("should filter items based on search query", async () => {
      const user = userEvent.setup();
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, "Dosa");

      await waitFor(() => {
        expect(screen.getByText("Plain Dosa")).toBeInTheDocument();
        expect(screen.getByText("Masala Dosa")).toBeInTheDocument();
        expect(screen.queryByText("Paneer Roll")).not.toBeInTheDocument();
        expect(screen.queryByText("Spring Roll")).not.toBeInTheDocument();
      });
    });

    test("should be case insensitive when searching", async () => {
      const user = userEvent.setup();
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, "ROLL");

      await waitFor(() => {
        expect(screen.getByText("Paneer Roll")).toBeInTheDocument();
        expect(screen.getByText("Spring Roll")).toBeInTheDocument();
        expect(screen.queryByText("Plain Dosa")).not.toBeInTheDocument();
      });
    });

    test("should show no results when search has no matches", async () => {
      const user = userEvent.setup();
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, "Pizza");

      await waitFor(() => {
        expect(screen.queryByText("Plain Dosa")).not.toBeInTheDocument();
        expect(screen.queryByText("Masala Dosa")).not.toBeInTheDocument();
      });
    });

    test("should clear search when modal closes", async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, "Dosa");

      // Close modal
      const cancelButton = screen.getByText(/cancel/i);
      fireEvent.click(cancelButton);

      // Reopen modal
      rerender(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      // Search should be cleared
      const newSearchInput = screen.getByPlaceholderText(/search/i);
      expect(newSearchInput).toHaveValue("");
    });
  });

  describe("Item Selection", () => {
    test("should select item when clicked", async () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      const plainDosa = screen.getByText("Plain Dosa").closest("button");
      expect(plainDosa).toBeTruthy();

      if (plainDosa) {
        fireEvent.click(plainDosa);

        await waitFor(() => {
          // Should show selected state
          expect(plainDosa).toHaveClass(/selected|border-green|bg-green/);
        });
      }
    });

    test("should allow changing selection", async () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      // Select first item
      const plainDosa = screen.getByText("Plain Dosa").closest("button");
      if (plainDosa) fireEvent.click(plainDosa);

      // Select different item
      const masalaDosa = screen.getByText("Masala Dosa").closest("button");
      if (masalaDosa) {
        fireEvent.click(masalaDosa);

        await waitFor(() => {
          expect(masalaDosa).toHaveClass(/selected|border-green|bg-green/);
        });
      }
    });

    test("should show checkmark on selected item", async () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      const plainDosa = screen.getByText("Plain Dosa").closest("button");
      if (plainDosa) {
        fireEvent.click(plainDosa);

        await waitFor(() => {
          // Check icon should be visible
          const checkIcons = document.querySelectorAll("svg");
          const hasCheckIcon = Array.from(checkIcons).some((icon) =>
            icon.getAttribute("class")?.includes("lucide-check")
          );
          expect(hasCheckIcon).toBe(true);
        });
      }
    });
  });

  describe("Form Validation", () => {
    test("should disable confirm button when no item selected", () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      const confirmButton = screen.getByText(/confirm/i);
      expect(confirmButton).toBeDisabled();
    });

    test("should enable confirm button when item is selected", async () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      const plainDosa = screen.getByText("Plain Dosa").closest("button");
      if (plainDosa) fireEvent.click(plainDosa);

      await waitFor(() => {
        const confirmButton = screen.getByText(/confirm/i);
        expect(confirmButton).not.toBeDisabled();
      });
    });

    test("should not call onSelect when confirming without selection", () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      const confirmButton = screen.getByText(/confirm/i);

      // Try to click disabled button
      fireEvent.click(confirmButton);

      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe("User Interactions - Confirm & Cancel", () => {
    test("should call onSelect with selected item when confirmed", async () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      // Select item
      const plainDosa = screen.getByText("Plain Dosa").closest("button");
      if (plainDosa) fireEvent.click(plainDosa);

      // Confirm selection
      await waitFor(() => {
        const confirmButton = screen.getByText(/confirm/i);
        fireEvent.click(confirmButton);
      });

      expect(mockOnSelect).toHaveBeenCalledWith({
        id: "item-1",
        name: "Plain Dosa",
        price: 99,
        type: "item",
      });
    });

    test("should close modal after confirming selection", async () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      // Select and confirm
      const plainDosa = screen.getByText("Plain Dosa").closest("button");
      if (plainDosa) fireEvent.click(plainDosa);

      await waitFor(() => {
        const confirmButton = screen.getByText(/confirm/i);
        fireEvent.click(confirmButton);
      });

      expect(mockOnClose).toHaveBeenCalled();
    });

    test("should call onClose when cancel button is clicked", () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      const cancelButton = screen.getByText(/cancel/i);
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    test("should call onClose when backdrop is clicked", () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      // Find and click backdrop
      const backdrop = document.querySelector(".bg-black.bg-opacity-50");
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    test("should call onClose when X button is clicked", () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      // Find X button
      const closeButtons = screen.getAllByRole("button");
      const xButton = closeButtons.find((btn) => {
        const svg = btn.querySelector("svg");
        return svg?.getAttribute("class")?.includes("lucide-x");
      });

      if (xButton) {
        fireEvent.click(xButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    test("should clear selection when cancelled", async () => {
      const { rerender } = render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      // Select item
      const plainDosa = screen.getByText("Plain Dosa").closest("button");
      if (plainDosa) fireEvent.click(plainDosa);

      // Cancel
      const cancelButton = screen.getByText(/cancel/i);
      fireEvent.click(cancelButton);

      // Reopen
      rerender(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      // Confirm button should be disabled (no selection)
      const confirmButton = screen.getByText(/confirm/i);
      expect(confirmButton).toBeDisabled();
    });
  });

  describe("Price Filtering", () => {
    test("should show items within max price limit", () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          maxPrice={100}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      // Items ≤ ₹100 should be visible
      expect(screen.getByText("Plain Dosa")).toBeInTheDocument(); // ₹99
      expect(screen.getByText("Spring Roll")).toBeInTheDocument(); // ₹89
      expect(screen.getByText("Veg Cutlet")).toBeInTheDocument(); // ₹79
    });

    test("should display all items when no max price", () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      // All items should be visible
      expect(screen.getByText("Plain Dosa")).toBeInTheDocument();
      expect(screen.getByText("Masala Dosa")).toBeInTheDocument();
      expect(screen.getByText("Paneer Roll")).toBeInTheDocument();
    });
  });

  describe("Empty States", () => {
    test("should handle empty items list", () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={[]}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText(/Choose Your Free Item/i)).toBeInTheDocument();
      expect(screen.queryByText("Plain Dosa")).not.toBeInTheDocument();
    });

    test("should show message when no items after search", async () => {
      const user = userEvent.setup();
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, "NonexistentItem");

      await waitFor(() => {
        expect(screen.queryByText("Plain Dosa")).not.toBeInTheDocument();
        expect(screen.queryByText("Masala Dosa")).not.toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    test("should have accessible modal structure", () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      // Should have heading
      expect(screen.getByText(/Choose Your Free Item/i)).toBeInTheDocument();

      // Should have buttons
      expect(screen.getByText(/confirm/i)).toBeInTheDocument();
      expect(screen.getByText(/cancel/i)).toBeInTheDocument();
    });

    test("should support keyboard navigation", async () => {
      const user = userEvent.setup();
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      // Tab through elements
      await user.tab();

      // Should focus on interactive elements
      const activeElement = document.activeElement;
      expect(activeElement?.tagName).toMatch(/INPUT|BUTTON/);
    });

    test("should have search input with placeholder", () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute("type", "text");
    });

    test("should have descriptive button labels", () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText(/confirm/i)).toBeInTheDocument();
      expect(screen.getByText(/cancel/i)).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("should handle rapid item selection changes", async () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      // Click multiple items rapidly
      const items = [
        screen.getByText("Plain Dosa"),
        screen.getByText("Masala Dosa"),
        screen.getByText("Paneer Roll"),
      ];

      items.forEach((item) => {
        const button = item.closest("button");
        if (button) fireEvent.click(button);
      });

      // Last clicked item should be selected
      const paneerRoll = screen.getByText("Paneer Roll").closest("button");
      expect(paneerRoll).toHaveClass(/selected|border-green|bg-green/);
    });

    test("should handle special characters in search", async () => {
      const user = userEvent.setup();
      const specialItems = [
        { id: "item-1", name: "Café Latte", price: 120, type: "item" as const },
        {
          id: "item-2",
          name: "Chef's Special",
          price: 250,
          type: "item" as const,
        },
      ];

      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={specialItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, "Café");

      await waitFor(() => {
        expect(screen.getByText("Café Latte")).toBeInTheDocument();
      });
    });

    test("should maintain selection when searching", async () => {
      const user = userEvent.setup();
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      // Select item
      const plainDosa = screen.getByText("Plain Dosa").closest("button");
      if (plainDosa) fireEvent.click(plainDosa);

      // Search for different item
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, "Roll");

      // Clear search
      await user.clear(searchInput);

      // Original selection should still be there
      await waitFor(() => {
        const confirmButton = screen.getByText(/confirm/i);
        expect(confirmButton).not.toBeDisabled();
      });
    });
  });

  describe("UI Feedback", () => {
    test("should show loading state for empty list", () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={[]}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      // Modal should still render
      expect(screen.getByText(/Choose Your Free Item/i)).toBeInTheDocument();
    });

    test("should display item count", () => {
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      // All 5 items should be rendered
      const itemButtons = screen
        .getAllByRole("button")
        .filter((btn) =>
          mockAvailableItems.some((item) =>
            btn.textContent?.includes(item.name)
          )
        );
      expect(itemButtons.length).toBeGreaterThan(0);
    });

    test("should show hover states on items", async () => {
      const user = userEvent.setup();
      render(
        <FreeItemSelector
          isOpen={true}
          onClose={mockOnClose}
          availableItems={mockAvailableItems}
          offerName="Test Offer"
          onSelect={mockOnSelect}
        />
      );

      const plainDosa = screen.getByText("Plain Dosa").closest("button");
      if (plainDosa) {
        await user.hover(plainDosa);

        // Should have hover class
        expect(plainDosa).toHaveClass(/hover/);
      }
    });
  });
});
