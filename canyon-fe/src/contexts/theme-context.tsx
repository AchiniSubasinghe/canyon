"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "canyon-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  // resolvedTheme is derived so we never set it directly inside effects (avoids lint + cascading)
  const resolvedTheme = useMemo<"light" | "dark">(() => {
    if (!mounted) return "light";
    return theme === "system" ? getSystemTheme() : theme;
  }, [theme, mounted]);

  // One-time bootstrap from storage + mark mounted. The inline script in layout already set the class.
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    if (stored !== "system") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeState(stored);
    }
    setMounted(true);
  }, []);

  // Apply class whenever the resolved theme changes (after mount)
  useEffect(() => {
    if (!mounted) return;
    applyTheme(resolvedTheme);
  }, [resolvedTheme, mounted]);

  // React to OS theme changes when user preference is "system"
  useEffect(() => {
    if (!mounted) return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      // No state writes here — resolvedTheme will recompute on next render if needed
      // We just re-apply in case the derived value is still "system"
      if (theme === "system") {
        applyTheme(getSystemTheme());
      }
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [mounted, theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);

    if (newTheme === "system") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, newTheme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    // Flip whatever the user is currently seeing to the explicit opposite
    const currentResolved = resolvedTheme;
    const next: "light" | "dark" = currentResolved === "light" ? "dark" : "light";
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, [resolvedTheme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  // Avoid rendering children with wrong theme on first client paint (prevents flash of wrong theme)
  if (!mounted) {
    // Render children anyway — the early script in layout (if present) + this effect will correct quickly.
    // We still return the provider so hooks are stable.
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
