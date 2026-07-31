"use client";

import { useEffect, useState } from "react";
import { getTheme, setTheme, type Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; label: string; swatch: string }[] = [
  { value: "dark", label: "Gelap", swatch: "#818cf8" },
  { value: "traditional", label: "Klasik Jepang", swatch: "#b8390e" },
];

export default function ThemeToggle() {
  const [current, setCurrent] = useState<Theme>("dark");

  useEffect(() => {
    setCurrent(getTheme());
  }, []);

  function handleSelect(value: Theme) {
    setCurrent(value);
    setTheme(value);
  }

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            current === opt.value
              ? "bg-surface2 text-fg"
              : "text-muted hover:text-fg"
          }`}
          onClick={() => handleSelect(opt.value)}
          aria-pressed={current === opt.value}
        >
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: opt.swatch }}
            aria-hidden="true"
          />
          {opt.label}
        </button>
      ))}
    </div>
  );
}
