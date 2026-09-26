import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { STUDIO_THEMES } from '../utils/studioThemes';
import { extractThemeColors, generateThemeStyleString, DEFAULT_PALETTE_RGB } from '../utils/themeEngine';

const ThemeContext = createContext({
  pageEffect: 'none',
  setPageEffect: () => {},
  studioTheme: 'default',
  setStudioTheme: () => {},
  isDarkGlobal: true, // We'll assume true since it's mainly for dark mode
  themeStyles: {},
  taskbarStyle: 'mac',
  setTaskbarStyle: () => {},
  macAnimation: 'flat',
  setMacAnimation: () => {},
  laserEnabled: false,
  setLaserEnabled: () => {},
  laserColor: '#06b6d4',
  setLaserColor: () => {}
});

export const FONT_OPTIONS = [
  { id: 'sans', name: 'System Sans' },
  { id: 'serif', name: 'System Serif' },
  { id: 'mono', name: 'System Mono' },
  { id: 'arial', name: 'Arial' },
  { id: 'helvetica', name: 'Helvetica' },
  { id: 'georgia', name: 'Georgia' },
  { id: 'times', name: 'Times New Roman' },
  { id: 'verdana', name: 'Verdana' },
  { id: 'trebuchet', name: 'Trebuchet MS' },
  { id: 'courier', name: 'Courier New' },
  { id: 'consolas', name: 'Consolas' },
];

export const getFontFamily = (f) => {
  switch(f) {
    case 'sans': return 'system-ui, sans-serif'
    case 'serif': return 'ui-serif, Georgia, serif'
    case 'mono': return 'ui-monospace, monospace'
    case 'arial': return 'Arial, sans-serif'
    case 'helvetica': return 'Helvetica, Arial, sans-serif'
    case 'georgia': return 'Georgia, serif'
    case 'times': return '"Times New Roman", Times, serif'
    case 'verdana': return 'Verdana, Geneva, sans-serif'
    case 'trebuchet': return '"Trebuchet MS", sans-serif'
    case 'courier': return '"Courier New", Courier, monospace'
    case 'consolas': return 'Consolas, "JetBrains Mono", "Cascadia Code", monospace'
    default: return 'system-ui, sans-serif'
  }
}

export const getFontSize = (fs) => {
  switch(fs) {
    case 'sm': return '0.875rem'
    case 'base': return '1rem'
    case 'lg': return '1.125rem'
    case 'xl': return '1.25rem'
    default: return '1rem'
  }
}

export const getLineHeight = (lh) => {
  switch(lh) {
    case 'compact': 
    case 'tight': return '1.4'
    case 'standard':
    case 'normal': return '1.6'
    case 'relaxed': return '1.8'
    case 'loose': return '2.0'
    default: return '1.6'
  }
}

const DEFAULT_TYPOGRAPHY = {
  font: 'sans',
  fontSize: 'base',
  textAlign: 'left',
  width: 'wide',
  lineHeight: 'relaxed',
  basicWebpage: false
};

export function ThemeProvider({ children }) {
  const [studioThemeState, setStudioThemeState] = useState(() => {
    return localStorage.getItem('studio_theme') || 'default';
  });

  const setStudioTheme = useCallback((newTheme) => {
    setStudioThemeState(newTheme);
    localStorage.setItem('studio_theme', newTheme);
    const themeDef = STUDIO_THEMES[newTheme];
    if (newTheme === 'light' || themeDef?.forceLight) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('oc-theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('oc-theme', 'dark');
    }
  }, []);

  const studioTheme = studioThemeState;
  
  const [isDarkGlobal, setIsDarkGlobal] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDarkGlobal(document.documentElement.classList.contains('dark'));
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    localStorage.setItem('studio_theme', studioTheme);
    
    // Check if we need to apply custom CSS variables
    const themeDef = STUDIO_THEMES[studioTheme];
    
    // Generate .dark scoped variables
    if (themeDef) {
      const customColors = extractThemeColors(themeDef);
      // forceLight themes remove the 'dark' class, so CSS vars must target :root
      const cssString = generateThemeStyleString(customColors, !!themeDef.forceLight);
      
      let styleEl = document.getElementById('oc-dynamic-theme-styles');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'oc-dynamic-theme-styles';
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = cssString;
    } else {
      // Revert to defaults
      const customColors = {
        slate: DEFAULT_PALETTE_RGB.slate,
        sky: DEFAULT_PALETTE_RGB.sky,
        brand: DEFAULT_PALETTE_RGB.brand
      };
      const cssString = generateThemeStyleString(customColors);
      
      let styleEl = document.getElementById('oc-dynamic-theme-styles');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'oc-dynamic-theme-styles';
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = cssString;
    }
  }, [studioTheme, isDarkGlobal]);

  // Derived theme styles for components that explicitly ask for it (like MarkdownHub)
  const themeStyles = useMemo(() => {
    const t = STUDIO_THEMES[studioTheme] || STUDIO_THEMES.default;
    if (t.dynamic) {
      return {
        ui: isDarkGlobal ? t.uiDark : t.uiLight,
        md: isDarkGlobal ? t.mdDark : t.mdLight,
        monaco: isDarkGlobal ? t.monacoDark : t.monacoLight,
        isDark: isDarkGlobal
      };
    } else {
      // forceLight themes (e.g. vue-light) store their light-mode classes
      // under the same uiDark/mdDark keys non-dynamic themes conventionally
      // use (there's only ever one variant for a non-dynamic theme), so the
      // fallback here is intentional, not a typo — only monaco has a real
      // separate monacoLight to prefer. Previously this branch always read
      // monacoDark/isDark:true unconditionally, which silently broke
      // vue-light specifically: monacoDark didn't exist on it at all.
      const isDark = !t.forceLight;
      return {
        ui: t.uiDark,
        md: t.mdDark,
        monaco: (isDark ? t.monacoDark : t.monacoLight) ?? t.monacoDark ?? t.monacoLight,
        isDark
      };
    }
  }, [studioTheme, isDarkGlobal]);

  const [typography, setTypographyState] = useState(() => {
    try {
      const saved = localStorage.getItem('oc-typography');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      font: 'sans',
      fontSize: 'base',
      textAlign: 'left',
      width: 'wide',
      lineHeight: 'relaxed',
      basicWebpage: false
    };
  });

  const setTypography = useCallback((newPrefs) => {
    setTypographyState(prev => {
      const updated = { ...prev, ...newPrefs };
      localStorage.setItem('oc-typography', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const [codeTypography, setCodeTypographyState] = useState(() => {
    try {
      const saved = localStorage.getItem('oc-code-typography');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      font: 'jetbrains',
      fontSize: 'sm',
      ligatures: true
    };
  });

  const setCodeTypography = useCallback((newPrefs) => {
    setCodeTypographyState(prev => {
      const updated = { ...prev, ...newPrefs };
      localStorage.setItem('oc-code-typography', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const [taskbarStyle, setTaskbarStyleState] = useState(() => {
    return localStorage.getItem('oc-taskbar-style') || 'mac';
  });

  const setTaskbarStyle = useCallback((newStyle) => {
    setTaskbarStyleState(newStyle);
    localStorage.setItem('oc-taskbar-style', newStyle);
  }, []);

  const [macAnimation, setMacAnimationState] = useState(() => {
    return localStorage.getItem('oc-mac-animation') || 'flat';
  });

  const [laserEnabled, setLaserEnabledState] = useState(() => {
    return localStorage.getItem('oc-laser-enabled') === 'true';
  });

  const [pageEffect, setPageEffectState] = useState(() => {
    return localStorage.getItem('oc-page-effect') === 'fire' ? 'fire' : 'none';
  });
  const setPageEffect = useCallback((effect) => {
    const next = effect === 'fire' ? 'fire' : 'none';
    setPageEffectState(next);
    localStorage.setItem('oc-page-effect', next);
  }, []);

  const [laserColor, setLaserColorState] = useState(() => {
    return localStorage.getItem('oc-laser-color') || '#06b6d4'; // Cyan-500
  });

  const setMacAnimation = useCallback((newAnim) => {
    setMacAnimationState(newAnim);
    localStorage.setItem('oc-mac-animation', newAnim);
  }, []);

  const setLaserEnabled = useCallback((enabled) => {
    setLaserEnabledState(enabled);
    localStorage.setItem('oc-laser-enabled', enabled);
  }, []);

  const setLaserColor = useCallback((color) => {
    setLaserColorState(color);
    localStorage.setItem('oc-laser-color', color);
  }, []);

  const value = useMemo(
    () => ({ 
      studioTheme, setStudioTheme, isDarkGlobal, themeStyles, 
      typography, setTypography, codeTypography, setCodeTypography, 
      taskbarStyle, setTaskbarStyle, macAnimation, setMacAnimation,
      laserEnabled, setLaserEnabled, laserColor, setLaserColor, pageEffect, setPageEffect
    }),
    [studioTheme, setStudioTheme, isDarkGlobal, themeStyles, typography, setTypography, codeTypography, setCodeTypography, taskbarStyle, setTaskbarStyle, macAnimation, setMacAnimation, laserEnabled, setLaserEnabled, laserColor, setLaserColor, pageEffect, setPageEffect]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useGlobalTheme() {
  return useContext(ThemeContext);
}
