import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ColorScheme = 'maroon' | 'blue' | 'green' | 'purple';

interface ColorSchemeContextType {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ColorSchemeContext = createContext<ColorSchemeContextType | undefined>(undefined);

const COLOR_SCHEME_KEY = 'ecomex-color-scheme';

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(COLOR_SCHEME_KEY) as ColorScheme) || 'maroon';
    }
    return 'maroon';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all color scheme classes
    root.classList.remove('scheme-maroon', 'scheme-blue', 'scheme-green', 'scheme-purple');
    
    // Add the current color scheme class
    root.classList.add(`scheme-${colorScheme}`);
    
    // Save to localStorage
    localStorage.setItem(COLOR_SCHEME_KEY, colorScheme);
  }, [colorScheme]);

  const setColorScheme = (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
  };

  return (
    <ColorSchemeContext.Provider value={{ colorScheme, setColorScheme }}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorScheme() {
  const context = useContext(ColorSchemeContext);
  if (context === undefined) {
    throw new Error('useColorScheme must be used within a ColorSchemeProvider');
  }
  return context;
}
