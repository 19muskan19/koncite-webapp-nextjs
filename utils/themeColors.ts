// Theme color constants matching HomePage
export const THEME_COLORS = {
  primary: '#6B8E23', // Green/olive color
  primaryHover: '#5a7a1e', // Darker green for hover
  primaryLight: '#6B8E23', // Same as primary
  primaryDark: '#5a7a1e', // Darker variant
  
  // Background colors
  darkBg: '#0a0a0a',
  lightBg: '#ffffff',
  lightBgAlt: '#faf9f6', // Cream/off-white
  lightBgCream: '#fefcf8', // Warm off-white
  
  // Text colors
  darkTextPrimary: 'text-slate-100',
  darkTextSecondary: 'text-slate-400',
  lightTextPrimary: 'text-slate-900',
  lightTextSecondary: 'text-slate-600',
  
  // Border colors
  darkBorder: 'border-slate-800',
  lightBorder: 'border-slate-200',
  
  // Card colors
  darkCard: 'bg-slate-800',
  lightCard: 'bg-white',
} as const;

// Helper function to get primary color classes
export const getPrimaryColorClasses = (isDark: boolean) => ({
  bg: `bg-[${THEME_COLORS.primary}]`,
  bgHover: `hover:bg-[${THEME_COLORS.primaryHover}]`,
  text: `text-[${THEME_COLORS.primary}]`,
  textHover: `hover:text-[${THEME_COLORS.primary}]`,
  border: `border-[${THEME_COLORS.primary}]`,
  borderHover: `hover:border-[${THEME_COLORS.primary}]`,
  bgOpacity: (opacity: number) => `bg-[${THEME_COLORS.primary}]/${opacity * 100}`,
  textOpacity: (opacity: number) => `text-[${THEME_COLORS.primary}]/${opacity * 100}`,
});

// Button styles matching HomePage
export const getButtonStyles = (variant: 'primary' | 'secondary' | 'outline' = 'primary', isDark?: boolean) => {
  const baseStyles = 'px-6 py-3 rounded-lg font-semibold transition-all';
  
  switch (variant) {
    case 'primary':
      return `${baseStyles} bg-[${THEME_COLORS.primary}] border-2 border-[${THEME_COLORS.primary}] text-white hover:bg-[${THEME_COLORS.primaryHover}] hover:border-[${THEME_COLORS.primaryHover}] shadow-lg hover:shadow-xl`;
    case 'secondary':
      return `${baseStyles} border-2 border-[${THEME_COLORS.primary}] text-[${THEME_COLORS.primary}] hover:bg-[${THEME_COLORS.primary}] hover:text-white`;
    case 'outline':
      return `${baseStyles} ${isDark ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'} border-2`;
    default:
      return baseStyles;
  }
};
