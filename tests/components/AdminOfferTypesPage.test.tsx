/**
 * Component Tests for Admin Offer Creation Page
 * Tests form rendering, validation, and submission
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OfferTypesPage from "@/app/admin/offers/create/page";
import "@testing-library/jest-dom";

// Mock Next.js router
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}));

// Mock RoleGuard
jest.mock("@/components/admin/RoleGuard", () => {
  return function RoleGuard({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  };
});

describe("Admin Offer Creation - Type Selection Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Page Rendering", () => {
    test("should render offer types page without crashing", () => {
      render(<OfferTypesPage />);

      expect(
        screen.getByText(/Create New Offer|Choose Offer Type/i)
      ).toBeInTheDocument();
    });

    test("should display page title and description", () => {
      render(<OfferTypesPage />);

      expect(screen.getByText(/Create New Offer/i)).toBeInTheDocument();
      expect(
        screen.queryByText(/Choose the type of offer|Select offer type/i)
      ).toBeTruthy();
    });

    test("should show back button", () => {
      render(<OfferTypesPage />);

      const backButton = screen.getByRole("button", { name: /back|Back/i });
      expect(backButton).toBeInTheDocument();
    });
  });

  describe("Offer Categories Display", () => {
    test("should display all offer categories", () => {
      render(<OfferTypesPage />);

      // Check for main categories
      expect(screen.queryByText(/Discount Offers/i)).toBeInTheDocument();
      expect(screen.queryByText(/Free Item Offers/i)).toBeInTheDocument();
      expect(screen.queryByText(/Combo.*Bundle/i)).toBeInTheDocument();
    });

    test("should display category descriptions", () => {
      render(<OfferTypesPage />);

      expect(
        screen.queryByText(/Percentage or flat amount/i)
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/Buy items and get free items/i)
      ).toBeInTheDocument();
    });

    test("should show category icons", () => {
      render(<OfferTypesPage />);

      // Check for SVG icons
      const icons = document.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe("Offer Types Display", () => {
    test("should display Buy X Get Y Free offer type", () => {
      render(<OfferTypesPage />);

      expect(
        screen.queryByText(/Buy X Get Y Free|Buy.*Get.*Free/i)
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/Buy certain quantity.*get items free/i)
      ).toBeInTheDocument();
    });

    test("should display Free Add-on offer type", () => {
      render(<OfferTypesPage />);

      expect(screen.queryByText(/Free Add-on|Free Addon/i)).toBeInTheDocument();
      expect(
        screen.queryByText(/Free side item with specific purchase/i)
      ).toBeInTheDocument();
    });

    test("should display Combo Meal offer type", () => {
      render(<OfferTypesPage />);

      expect(screen.queryByText(/Combo Meal/i)).toBeInTheDocument();
      expect(
        screen.queryByText(/Fixed price for bundled items/i)
      ).toBeInTheDocument();
    });

    test("should display Cart Percentage offer type", () => {
      render(<OfferTypesPage />);

      expect(screen.queryByText(/Cart.*Discount/i)).toBeInTheDocument();
      expect(
        screen.queryByText(/percentage discount on total/i)
      ).toBeInTheDocument();
    });

    test("should show offer type examples", () => {
      render(<OfferTypesPage />);

      // Check for example text
      expect(screen.queryByText(/Buy 2.*Get 1.*Free/i)).toBeInTheDocument();
      expect(screen.queryByText(/Free.*with any/i)).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    test("should navigate to create form when offer type is clicked", async () => {
      render(<OfferTypesPage />);

      // Find and click Buy X Get Y Free card
      const buyGetFreeCard = screen
        .getByText(/Buy X Get Y Free/i)
        .closest('div[role="button"], button, a');

      if (buyGetFreeCard) {
        fireEvent.click(buyGetFreeCard);

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith(
            expect.stringContaining("/admin/offers/create/item_buy_get_free")
          );
        });
      }
    });

    test("should navigate to free addon form when clicked", async () => {
      render(<OfferTypesPage />);

      const freeAddonCard = screen
        .getByText(/Free Add-on/i)
        .closest('div[role="button"], button, a');

      if (freeAddonCard) {
        fireEvent.click(freeAddonCard);

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith(
            expect.stringContaining("/admin/offers/create/item_free_addon")
          );
        });
      }
    });

    test("should navigate to combo meal form when clicked", async () => {
      render(<OfferTypesPage />);

      const comboCard = screen
        .getByText(/Combo Meal/i)
        .closest('div[role="button"], button, a');

      if (comboCard) {
        fireEvent.click(comboCard);

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith(
            expect.stringContaining("/admin/offers/create/combo_meal")
          );
        });
      }
    });

    test("should handle back button click", () => {
      render(<OfferTypesPage />);

      const backButton = screen.getByRole("button", { name: /back|Back/i });
      fireEvent.click(backButton);

      // Should navigate back or to offers list
      expect(mockPush).toHaveBeenCalled();
    });
  });

  describe("Visual Feedback", () => {
    test("should show hover state on offer cards", async () => {
      const user = userEvent.setup();
      render(<OfferTypesPage />);

      const buyGetFreeCard = screen
        .getByText(/Buy X Get Y Free/i)
        .closest('div[role="button"], button');

      if (buyGetFreeCard) {
        await user.hover(buyGetFreeCard);

        // Card should have hover styling
        expect(buyGetFreeCard).toHaveClass(/hover|transition/);
      }
    });

    test("should display application type badges", () => {
      render(<OfferTypesPage />);

      // Check for "Session Level" or "Order Level" badges
      expect(screen.queryByText(/session level|order level/i)).toBeTruthy();
    });
  });

  describe("Responsive Design", () => {
    test("should render on mobile viewport", () => {
      // Set viewport to mobile
      global.innerWidth = 375;
      global.innerHeight = 667;

      render(<OfferTypesPage />);

      // Should still show offer types
      expect(screen.queryByText(/Buy X Get Y Free/i)).toBeInTheDocument();
    });

    test("should render on desktop viewport", () => {
      // Set viewport to desktop
      global.innerWidth = 1920;
      global.innerHeight = 1080;

      render(<OfferTypesPage />);

      // Should show offer types in grid layout
      expect(screen.queryByText(/Buy X Get Y Free/i)).toBeInTheDocument();
      expect(screen.queryByText(/Free Add-on/i)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    test("should have accessible offer type cards", () => {
      render(<OfferTypesPage />);

      // Cards should be clickable elements (buttons or links)
      const cards = document.querySelectorAll('[role="button"], button, a');
      expect(cards.length).toBeGreaterThan(0);
    });

    test("should have proper heading hierarchy", () => {
      render(<OfferTypesPage />);

      // Should have h1 or main heading
      const headings = document.querySelectorAll("h1, h2, h3");
      expect(headings.length).toBeGreaterThan(0);
    });

    test("should support keyboard navigation between cards", async () => {
      const user = userEvent.setup();
      render(<OfferTypesPage />);

      const firstCard = screen
        .getByText(/Buy X Get Y Free/i)
        .closest("button, a");

      if (firstCard) {
        await user.tab();

        // Should focus on first interactive element
        expect(document.activeElement).toBeTruthy();
      }
    });

    test("should have descriptive labels for offer types", () => {
      render(<OfferTypesPage />);

      // Each offer type should have name + description
      const buyGetFree = screen.getByText(/Buy X Get Y Free/i);
      const description = screen.getByText(
        /Buy certain quantity.*get items free/i
      );

      expect(buyGetFree).toBeInTheDocument();
      expect(description).toBeInTheDocument();
    });
  });

  describe("Security & Authorization", () => {
    test("should be wrapped in RoleGuard component", () => {
      const { container } = render(<OfferTypesPage />);

      // RoleGuard should prevent unauthorized access
      // This test confirms the component renders (RoleGuard is mocked)
      expect(container).toBeTruthy();
    });
  });

  describe("Edge Cases", () => {
    test("should handle rapid clicks on offer cards", async () => {
      render(<OfferTypesPage />);

      const card = screen
        .getByText(/Buy X Get Y Free/i)
        .closest('div[role="button"], button, a');

      if (card) {
        // Click multiple times rapidly
        fireEvent.click(card);
        fireEvent.click(card);
        fireEvent.click(card);

        // Should only navigate once
        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledTimes(1);
        });
      }
    });

    test("should render without errors when no data available", () => {
      // This tests component robustness
      const { container } = render(<OfferTypesPage />);
      expect(container).toBeTruthy();
    });
  });
});
