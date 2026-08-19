import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "system" | "dark" | "light";
export type ColorScheme = "default" | "ocean" | "amethyst";

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  resolvedTheme: "dark" | "light";
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "system",
  setMode: () => {},
  colorScheme: "default",
  setColorScheme: () => {},
  resolvedTheme: "dark",
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("omp-switch-mode");
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
    return "system";
  });

  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    const saved = localStorage.getItem("omp-switch-color-scheme");
    if (saved === "ocean" || saved === "amethyst" || saved === "default") return saved;
    return "default";
  });

  const [systemIsDark, setSystemIsDark] = useState(() => {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const resolvedTheme = mode === "system" ? (systemIsDark ? "dark" : "light") : mode;

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
    root.setAttribute("data-theme", colorScheme);
  }, [resolvedTheme, colorScheme]);

  function setMode(newMode: ThemeMode) {
    setModeState(newMode);
    localStorage.setItem("omp-switch-mode", newMode);
  }

  function setColorScheme(newScheme: ColorScheme) {
    setColorSchemeState(newScheme);
    localStorage.setItem("omp-switch-color-scheme", newScheme);
  }

  return (
    <ThemeContext.Provider
      value={{
        mode,
        setMode,
        colorScheme,
        setColorScheme,
        resolvedTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
