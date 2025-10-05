// Guest Side Color Scheme for Indian Restaurant
// Warm, food-focused colors with traditional Indian influences

export const guestColors = {
  // Primary Colors - Orange/Saffron theme (traditional Indian)
  primary: {
    50: 'bg-orange-50',
    100: 'bg-orange-100',
    500: 'bg-orange-500',
    600: 'bg-orange-600',
    700: 'bg-orange-700',
    text: {
      50: 'text-orange-50',
      100: 'text-orange-100',
      500: 'text-orange-500',
      600: 'text-orange-600',
      700: 'text-orange-700',
      800: 'text-orange-800',
      900: 'text-orange-900'
    },
    border: {
      200: 'border-orange-200',
      300: 'border-orange-300',
      500: 'border-orange-500',
      600: 'border-orange-600'
    },
    hover: {
      50: 'hover:bg-orange-50',
      100: 'hover:bg-orange-100',
      700: 'hover:bg-orange-700'
    }
  },

  // Veg Items - Emerald Green
  veg: {
    50: 'bg-emerald-50',
    100: 'bg-emerald-100',
    500: 'bg-emerald-500',
    600: 'bg-emerald-600',
    text: {
      600: 'text-emerald-600',
      700: 'text-emerald-700',
      800: 'text-emerald-800'
    },
    border: {
      200: 'border-emerald-200',
      300: 'border-emerald-300',
      500: 'border-emerald-500'
    },
    hover: {
      50: 'hover:bg-emerald-50'
    }
  },

  // Non-Veg Items - Deep Red
  nonVeg: {
    50: 'bg-red-50',
    100: 'bg-red-100',
    500: 'bg-red-500',
    600: 'bg-red-600',
    text: {
      600: 'text-red-600',
      700: 'text-red-700',
      800: 'text-red-800'
    },
    border: {
      200: 'border-red-200',
      300: 'border-red-300',
      500: 'border-red-500'
    },
    hover: {
      50: 'hover:bg-red-50'
    }
  },

  // Neutral/Background - Warm Grays
  neutral: {
    50: 'bg-gray-50',
    100: 'bg-gray-100',
    200: 'bg-gray-200',
    white: 'bg-white',
    text: {
      600: 'text-gray-600',
      700: 'text-gray-700',
      800: 'text-gray-800',
      900: 'text-gray-900'
    },
    border: {
      200: 'border-gray-200',
      300: 'border-gray-300'
    },
    hover: {
      50: 'hover:bg-gray-50',
      100: 'hover:bg-gray-100',
      200: 'hover:bg-gray-200'
    }
  }
};

// Helper function to get consistent button styles
export const getButtonStyles = (variant: 'primary' | 'secondary' | 'veg' | 'nonVeg' | 'neutral', active = false) => {
  const baseStyles = "transition-all duration-200 font-medium rounded-lg border";

  switch (variant) {
    case 'primary':
      return active
        ? `${baseStyles} ${guestColors.primary[600]} text-white ${guestColors.primary.border[600]} shadow-sm`
        : `${baseStyles} ${guestColors.neutral.white} ${guestColors.primary.text[700]} ${guestColors.primary.border[300]} ${guestColors.primary.hover[50]}`;

    case 'veg':
      return active
        ? `${baseStyles} ${guestColors.veg[500]} text-white ${guestColors.veg.border[500]} shadow-md ring-2 ring-emerald-200`
        : `${baseStyles} ${guestColors.neutral.white} ${guestColors.neutral.text[600]} ${guestColors.neutral.border[200]} ${guestColors.veg.hover[50]}`;

    case 'nonVeg':
      return active
        ? `${baseStyles} ${guestColors.nonVeg[500]} text-white ${guestColors.nonVeg.border[500]} shadow-md ring-2 ring-red-200`
        : `${baseStyles} ${guestColors.neutral.white} ${guestColors.neutral.text[600]} ${guestColors.neutral.border[200]} ${guestColors.nonVeg.hover[50]}`;

    case 'secondary':
      return `${baseStyles} ${guestColors.neutral[100]} ${guestColors.neutral.text[700]} ${guestColors.neutral.border[200]} ${guestColors.neutral.hover[200]}`;

    case 'neutral':
    default:
      return `${baseStyles} ${guestColors.neutral[50]} ${guestColors.neutral.text[700]} ${guestColors.neutral.border[200]} ${guestColors.neutral.hover[100]}`;
  }
};

// Helper for add to cart button - primary orange
export const getAddButtonStyles = (hasItems = false) => {
  return hasItems
    ? `${guestColors.primary[600]} text-white hover:${guestColors.primary[700]} shadow-sm active:scale-95`
    : `${guestColors.primary[600]} text-white hover:${guestColors.primary[700]} shadow-sm active:scale-95`;
};