/**
 * Comprehensive UI Tests for Admin Offer Creation Form
 * Tests form rendering, validation, user input, and submission
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateOfferFormPage from "@/app/admin/offers/create/[offerType]/page";
import "@testing-library/jest-dom";

// Mock Next.js navigation
const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams = { offerType: "item_buy_get_free" };
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
  useParams: () => mockParams,
  useSearchParams: () => mockSearchParams,
}));

// Mock Supabase client
const mockSupabaseInsert = jest.fn();
const mockSupabaseUpdate = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseEq = jest.fn();
const mockSupabaseSingle = jest.fn();
const mockSupabaseFrom = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: jest.fn((table: string) => {
      mockSupabaseFrom(table);
      return {
        select: jest.fn(() => {
          mockSupabaseSelect();
          return {
            eq: jest.fn(() => {
              mockSupabaseEq();
              return {
                data:
                  table === "menu_items"
                    ? [
                        {
                          id: "item-1",
                          name: "Plain Dosa",
                          price: 99,
                          category_id: "cat-1",
                        },
                        {
                          id: "item-2",
                          name: "Masala Dosa",
                          price: 139,
                          category_id: "cat-1",
                        },
                      ]
                    : table === "menu_categories"
                    ? [
                        { id: "cat-1", name: "Dosas" },
                        { id: "cat-2", name: "Rolls" },
                      ]
                    : [],
                error: null,
              };
            }),
            data:
              table === "menu_items"
                ? [
                    {
                      id: "item-1",
                      name: "Plain Dosa",
                      price: 99,
                      category_id: "cat-1",
                    },
                    {
                      id: "item-2",
                      name: "Masala Dosa",
                      price: 139,
                      category_id: "cat-1",
                    },
                  ]
                : table === "menu_categories"
                ? [
                    { id: "cat-1", name: "Dosas" },
                    { id: "cat-2", name: "Rolls" },
                  ]
                : [],
            error: null,
          };
        }),
        insert: jest.fn(() => {
          mockSupabaseInsert();
          return {
            select: jest.fn(() => ({
              single: jest.fn(() => {
                mockSupabaseSingle();
                return {
                  data: { id: "new-offer-id", name: "Test Offer" },
                  error: null,
                };
              }),
            })),
          };
        }),
        update: jest.fn(() => {
          mockSupabaseUpdate();
          return {
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => {
                  mockSupabaseSingle();
                  return {
                    data: { id: "existing-offer-id", name: "Updated Offer" },
                    error: null,
                  };
                }),
              })),
            })),
          };
        }),
      };
    }),
  },
}));

// Mock RoleGuard
jest.mock("@/components/admin/RoleGuard", () => {
  return function RoleGuard({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  };
});

describe("Admin Offer Creation Form - UI Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { offerType: "item_buy_get_free" };
    mockSearchParams = new URLSearchParams();
  });

  describe("Form Rendering - Buy X Get Y Free", () => {
    test("should render form with all required fields", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/offer name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      });
    });

    test("should display correct offer type title", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        expect(screen.getByText(/Buy X Get Y Free/i)).toBeInTheDocument();
      });
    });

    test("should show priority field with default value", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        const priorityInput = screen.getByLabelText(
          /priority/i
        ) as HTMLInputElement;
        expect(priorityInput).toBeInTheDocument();
        expect(priorityInput.value).toBe("5");
      });
    });

    test("should display active status toggle", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        const activeToggle = screen.getByLabelText(/active|is active/i);
        expect(activeToggle).toBeInTheDocument();
      });
    });

    test("should show buy quantity field for Buy X Get Y offer", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        expect(
          screen.getByLabelText(/buy quantity|minimum quantity to buy/i)
        ).toBeInTheDocument();
      });
    });

    test("should show get quantity field for Buy X Get Y offer", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        expect(
          screen.getByLabelText(/get quantity|free quantity/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Form Rendering - Free Add-on", () => {
    beforeEach(() => {
      mockParams = { offerType: "item_free_addon" };
    });

    test("should render free addon form", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        expect(screen.getByText(/Free Add-on/i)).toBeInTheDocument();
      });
    });

    test("should show max price field", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        expect(
          screen.getByLabelText(/max.*price|maximum.*price/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Form Rendering - Combo Meal", () => {
    beforeEach(() => {
      mockParams = { offerType: "combo_meal" };
    });

    test("should render combo meal form", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        expect(screen.getByText(/Combo Meal/i)).toBeInTheDocument();
      });
    });

    test("should show combo price field", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        expect(
          screen.getByLabelText(/combo price|bundle price/i)
        ).toBeInTheDocument();
      });
    });

    test("should show customizable option", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/customizable/i)).toBeInTheDocument();
      });
    });
  });

  describe("Form Rendering - Cart Percentage Discount", () => {
    beforeEach(() => {
      mockParams = { offerType: "cart_percentage" };
    });

    test("should render cart percentage form", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        expect(screen.getByText(/Cart.*Discount/i)).toBeInTheDocument();
      });
    });

    test("should show discount percentage field", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        expect(
          screen.getByLabelText(/discount.*percentage/i)
        ).toBeInTheDocument();
      });
    });

    test("should show max discount amount field", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        expect(
          screen.getByLabelText(/max.*discount|maximum.*discount/i)
        ).toBeInTheDocument();
      });
    });

    test("should show minimum amount field", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        expect(
          screen.getByLabelText(/min.*amount|minimum.*amount/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("User Input - Text Fields", () => {
    test("should allow typing in offer name field", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const nameInput = screen.getByLabelText(/offer name/i);
        await user.type(nameInput, "Buy 2 Get 1 Free - Dosas");
        expect(nameInput).toHaveValue("Buy 2 Get 1 Free - Dosas");
      });
    });

    test("should allow typing in description field", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const descInput = screen.getByLabelText(/description/i);
        await user.type(descInput, "Buy 2 dosas and get 1 free");
        expect(descInput).toHaveValue("Buy 2 dosas and get 1 free");
      });
    });

    test("should allow entering promo code", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const promoInput = screen.getByLabelText(/promo.*code/i);
        await user.type(promoInput, "DOSA2023");
        expect(promoInput).toHaveValue("DOSA2023");
      });
    });
  });

  describe("User Input - Number Fields", () => {
    test("should accept valid numbers in buy quantity", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const buyQtyInput = screen.getByLabelText(
          /buy quantity|minimum quantity to buy/i
        );
        await user.clear(buyQtyInput);
        await user.type(buyQtyInput, "2");
        expect(buyQtyInput).toHaveValue(2);
      });
    });

    test("should accept valid numbers in get quantity", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const getQtyInput = screen.getByLabelText(
          /get quantity|free quantity/i
        );
        await user.clear(getQtyInput);
        await user.type(getQtyInput, "1");
        expect(getQtyInput).toHaveValue(1);
      });
    });

    test("should accept decimal in discount percentage", async () => {
      mockParams = { offerType: "cart_percentage" };
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const percentInput = screen.getByLabelText(/discount.*percentage/i);
        await user.type(percentInput, "15.5");
        expect(percentInput).toHaveValue(15.5);
      });
    });

    test("should accept usage limit value", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const usageInput = screen.getByLabelText(/usage.*limit/i);
        await user.type(usageInput, "100");
        expect(usageInput).toHaveValue(100);
      });
    });
  });

  describe("User Input - Toggle/Checkbox Fields", () => {
    test("should toggle active status", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const activeToggle = screen.getByLabelText(
          /active|is active/i
        ) as HTMLInputElement;
        expect(activeToggle.checked).toBe(true);

        await user.click(activeToggle);
        expect(activeToggle.checked).toBe(false);
      });
    });

    test("should toggle get same item option", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const sameItemToggle = screen.getByLabelText(
          /same.*item|get same/i
        ) as HTMLInputElement;
        await user.click(sameItemToggle);
        expect(sameItemToggle.checked).toBe(true);
      });
    });

    test("should toggle customizable for combo meal", async () => {
      mockParams = { offerType: "combo_meal" };
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const customToggle = screen.getByLabelText(
          /customizable/i
        ) as HTMLInputElement;
        await user.click(customToggle);
        expect(customToggle.checked).toBe(true);
      });
    });
  });

  describe("User Input - Date/Time Fields", () => {
    test("should allow selecting start date", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const startDateInput = screen.getByLabelText(/start.*date/i);
        await user.type(startDateInput, "2025-01-01");
        expect(startDateInput).toHaveValue("2025-01-01");
      });
    });

    test("should allow selecting end date", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const endDateInput = screen.getByLabelText(/end.*date/i);
        await user.type(endDateInput, "2025-12-31");
        expect(endDateInput).toHaveValue("2025-12-31");
      });
    });

    test("should allow setting valid hours", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const startTimeInput = screen.getByLabelText(
          /start.*time|valid.*hours.*start/i
        );
        await user.type(startTimeInput, "09:00");
        expect(startTimeInput).toHaveValue("09:00");
      });
    });
  });

  describe("Menu Item Selection", () => {
    test("should load and display menu items", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        // Check that Supabase was called to fetch menu items
        expect(mockSupabaseFrom).toHaveBeenCalledWith("menu_items");
      });
    });

    test("should load and display menu categories", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        // Check that Supabase was called to fetch categories
        expect(mockSupabaseFrom).toHaveBeenCalledWith("menu_categories");
      });
    });

    test("should allow selecting menu items", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        // Look for item selection dropdown or button
        const itemSelector = screen.getByText(/add.*item|select.*item/i);
        expect(itemSelector).toBeInTheDocument();
      });
    });

    test("should show selected items in list", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        // After selecting items, they should appear in a list
        expect(
          screen.queryByText(/selected.*item|items to buy/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Form Validation", () => {
    test("should show error when submitting without offer name", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const submitButton = screen.getByText(/create.*offer|save.*offer/i);
        await user.click(submitButton);

        // Should show validation error
        await waitFor(() => {
          expect(
            screen.queryByText(/name.*required|please.*enter.*name/i)
          ).toBeTruthy();
        });
      });
    });

    test("should validate discount percentage range (1-100)", async () => {
      mockParams = { offerType: "cart_percentage" };
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const percentInput = screen.getByLabelText(/discount.*percentage/i);
        await user.type(percentInput, "150");

        const submitButton = screen.getByText(/create.*offer|save.*offer/i);
        await user.click(submitButton);

        // Should show validation error
        await waitFor(() => {
          expect(
            screen.queryByText(/percentage.*between|invalid.*percentage/i)
          ).toBeTruthy();
        });
      });
    });

    test("should validate minimum quantity is positive", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const buyQtyInput = screen.getByLabelText(
          /buy quantity|minimum quantity to buy/i
        );
        await user.clear(buyQtyInput);
        await user.type(buyQtyInput, "0");

        const submitButton = screen.getByText(/create.*offer|save.*offer/i);
        await user.click(submitButton);

        // Should show validation error
        await waitFor(() => {
          expect(
            screen.queryByText(/quantity.*greater|must be positive/i)
          ).toBeTruthy();
        });
      });
    });

    test("should validate end date is after start date", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const startDateInput = screen.getByLabelText(/start.*date/i);
        await user.type(startDateInput, "2025-12-31");

        const endDateInput = screen.getByLabelText(/end.*date/i);
        await user.type(endDateInput, "2025-01-01");

        const submitButton = screen.getByText(/create.*offer|save.*offer/i);
        await user.click(submitButton);

        // Should show validation error
        await waitFor(() => {
          expect(
            screen.queryByText(/end.*after.*start|invalid.*date/i)
          ).toBeTruthy();
        });
      });
    });

    test("should require at least one menu item for item-based offers", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const nameInput = screen.getByLabelText(/offer name/i);
        await user.type(nameInput, "Test Offer");

        const buyQtyInput = screen.getByLabelText(/buy quantity/i);
        await user.type(buyQtyInput, "2");

        const getQtyInput = screen.getByLabelText(/get quantity/i);
        await user.type(getQtyInput, "1");

        const submitButton = screen.getByText(/create.*offer|save.*offer/i);
        await user.click(submitButton);

        // Should show validation error
        await waitFor(() => {
          expect(screen.queryByText(/select.*item|add.*item/i)).toBeTruthy();
        });
      });
    });
  });

  describe("Form Submission - Create Mode", () => {
    test("should call Supabase insert when creating new offer", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        // Fill required fields
        const nameInput = screen.getByLabelText(/offer name/i);
        await user.type(nameInput, "Buy 2 Get 1 Free");

        const descInput = screen.getByLabelText(/description/i);
        await user.type(descInput, "Buy 2 items get 1 free");

        const buyQtyInput = screen.getByLabelText(/buy quantity/i);
        await user.type(buyQtyInput, "2");

        const getQtyInput = screen.getByLabelText(/get quantity/i);
        await user.type(getQtyInput, "1");

        // Submit form
        const submitButton = screen.getByText(/create.*offer|save.*offer/i);
        await user.click(submitButton);

        // Should call insert
        await waitFor(() => {
          expect(mockSupabaseInsert).toHaveBeenCalled();
        });
      });
    });

    test("should navigate to offers list after successful creation", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const nameInput = screen.getByLabelText(/offer name/i);
        await user.type(nameInput, "Test Offer");

        const buyQtyInput = screen.getByLabelText(/buy quantity/i);
        await user.type(buyQtyInput, "2");

        const getQtyInput = screen.getByLabelText(/get quantity/i);
        await user.type(getQtyInput, "1");

        const submitButton = screen.getByText(/create.*offer|save.*offer/i);
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith(
            expect.stringContaining("/admin/offers")
          );
        });
      });
    });

    test("should show success message after creation", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const nameInput = screen.getByLabelText(/offer name/i);
        await user.type(nameInput, "Test Offer");

        const submitButton = screen.getByText(/create.*offer|save.*offer/i);
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.queryByText(/success|created/i)).toBeTruthy();
        });
      });
    });
  });

  describe("Form Submission - Edit Mode", () => {
    beforeEach(() => {
      mockSearchParams = new URLSearchParams({
        edit: "true",
        id: "existing-offer-id",
        name: "Existing Offer",
        description: "Test description",
      });
    });

    test("should pre-fill form in edit mode", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(
          /offer name/i
        ) as HTMLInputElement;
        expect(nameInput.value).toBe("Existing Offer");
      });
    });

    test("should call Supabase update when editing", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const nameInput = screen.getByLabelText(/offer name/i);
        await user.clear(nameInput);
        await user.type(nameInput, "Updated Offer Name");

        const submitButton = screen.getByText(/update.*offer|save.*offer/i);
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockSupabaseUpdate).toHaveBeenCalled();
        });
      });
    });

    test("should show update button in edit mode", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/update.*offer|save.*changes/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    test("should display error message on submission failure", async () => {
      // Mock Supabase to return error
      mockSupabaseInsert.mockImplementationOnce(() => ({
        select: () => ({
          single: () => ({
            data: null,
            error: { message: "Database error" },
          }),
        }),
      }));

      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const nameInput = screen.getByLabelText(/offer name/i);
        await user.type(nameInput, "Test Offer");

        const submitButton = screen.getByText(/create.*offer/i);
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.queryByText(/error|failed/i)).toBeTruthy();
        });
      });
    });

    test("should handle network errors gracefully", async () => {
      // Mock network error
      mockSupabaseFrom.mockImplementationOnce(() => {
        throw new Error("Network error");
      });

      render(<CreateOfferFormPage />);

      await waitFor(() => {
        // Should not crash
        expect(screen.getByText(/Buy X Get Y Free/i)).toBeInTheDocument();
      });
    });
  });

  describe("Cancel/Back Actions", () => {
    test("should have cancel button", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        expect(screen.getByText(/cancel|back/i)).toBeInTheDocument();
      });
    });

    test("should navigate back when cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const cancelButton = screen.getByText(/cancel|back/i);
        await user.click(cancelButton);

        expect(mockBack).toHaveBeenCalled();
      });
    });

    test("should not save data when cancelling", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const nameInput = screen.getByLabelText(/offer name/i);
        await user.type(nameInput, "Test Offer");

        const cancelButton = screen.getByText(/cancel|back/i);
        await user.click(cancelButton);

        expect(mockSupabaseInsert).not.toHaveBeenCalled();
      });
    });
  });

  describe("Accessibility", () => {
    test("should have proper form labels", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/offer name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      });
    });

    test("should support keyboard navigation", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        await user.tab();

        const activeElement = document.activeElement;
        expect(activeElement?.tagName).toMatch(/INPUT|BUTTON|TEXTAREA|SELECT/);
      });
    });

    test("should have submit button accessible by keyboard", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const submitButton = screen.getByText(/create.*offer|save.*offer/i);
        submitButton.focus();

        expect(document.activeElement).toBe(submitButton);
      });
    });
  });

  describe("Loading States", () => {
    test("should show loading state during submission", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const nameInput = screen.getByLabelText(/offer name/i);
        await user.type(nameInput, "Test Offer");

        const submitButton = screen.getByText(/create.*offer/i);
        await user.click(submitButton);

        // Should show loading indicator
        expect(screen.queryByText(/creating|saving|loading/i)).toBeTruthy();
      });
    });

    test("should disable submit button while loading", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const submitButton = screen.getByText(/create.*offer/i);
        await user.click(submitButton);

        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe("Image Upload", () => {
    test("should have image upload component", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        expect(screen.getByText(/image|upload.*image/i)).toBeInTheDocument();
      });
    });

    test("should display uploaded image preview", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        // Image upload component should be present
        const imageSection = screen.getByText(/image/i);
        expect(imageSection).toBeInTheDocument();
      });
    });
  });

  describe("Valid Days Selection", () => {
    test("should allow selecting valid days of week", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        // Look for day checkboxes
        const mondayCheckbox = screen.getByLabelText(
          /monday/i
        ) as HTMLInputElement;
        await user.click(mondayCheckbox);

        expect(mondayCheckbox.checked).toBe(true);
      });
    });

    test("should allow selecting multiple days", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const mondayCheckbox = screen.getByLabelText(
          /monday/i
        ) as HTMLInputElement;
        const fridayCheckbox = screen.getByLabelText(
          /friday/i
        ) as HTMLInputElement;

        await user.click(mondayCheckbox);
        await user.click(fridayCheckbox);

        expect(mondayCheckbox.checked).toBe(true);
        expect(fridayCheckbox.checked).toBe(true);
      });
    });
  });

  describe("Customer Type Targeting", () => {
    test("should show customer type selection", async () => {
      render(<CreateOfferFormPage />);

      await waitFor(() => {
        expect(
          screen.getByLabelText(/customer.*type|target.*customer/i)
        ).toBeInTheDocument();
      });
    });

    test("should allow selecting customer types", async () => {
      const user = userEvent.setup();
      render(<CreateOfferFormPage />);

      await waitFor(async () => {
        const customerTypeSelect = screen.getByLabelText(
          /customer.*type|target.*customer/i
        );
        await user.selectOptions(customerTypeSelect, "new");

        expect(customerTypeSelect).toHaveValue("new");
      });
    });
  });
});
