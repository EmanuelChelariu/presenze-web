"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({ theme: "auto", setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("auto"); // "light" | "dark" | "auto"
  const [resolved, setResolved] = useState("light");

  // Carica preferenza salvata
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark" || saved === "auto") {
      setThemeState(saved);
    }
  }, []);

  // Risolvi il tema effettivo
  useEffect(() => {
    function resolve() {
      if (theme === "dark") return "dark";
      if (theme === "light") return "light";

      // Auto: segui preferenza sistema
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
      return "light";
    }

    setResolved(resolve());

    // Ascolta cambio preferenza sistema (per modo auto)
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function handleChange() {
      if (theme === "auto") {
        setResolved(mq.matches ? "dark" : "light");
      }
    }
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [theme]);

  // Applica classe "dark" su <html>
  useEffect(() => {
    const html = document.documentElement;
    if (resolved === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, [resolved]);

  function setTheme(t) {
    setThemeState(t);
    localStorage.setItem("theme", t);
  }

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
