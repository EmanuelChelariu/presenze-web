"use client";

import { useTheme } from "./ThemeProvider";
import { useState } from "react";

const modes = [
  { key: "auto", label: "Auto", icon: "◐" },
  { key: "light", label: "Chiaro", icon: "☀" },
  { key: "dark", label: "Scuro", icon: "☾" },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const current = modes.find((m) => m.key === theme) || modes[0];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Menu popup */}
      {open && (
        <div className="absolute bottom-12 right-0 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[130px] mb-1">
          {modes.map((m) => (
            <button
              key={m.key}
              onClick={() => { setTheme(m.key); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition ${
                theme === m.key
                  ? "text-black dark:text-white font-medium bg-gray-100 dark:bg-gray-700"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <span className="text-base">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* Pulsante toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg flex items-center justify-center text-base hover:scale-110 transition-transform"
        title="Cambia tema"
      >
        {current.icon}
      </button>
    </div>
  );
}
