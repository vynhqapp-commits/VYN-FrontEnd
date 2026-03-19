import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ComboboxOption = {
  value: string;
  label: string;
  keywords?: string;
  disabled?: boolean;
};

export function Combobox({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled,
  className,
  buttonClassName,
  contentClassName,
}: {
  value?: string | null;
  onValueChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  contentClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const selected = options.find((o) => String(o.value) === String(value ?? ""));
  const normalized = React.useMemo(
    () =>
      options.map((o) => ({
        ...o,
        _hay: `${o.label} ${o.keywords ?? ""}`.trim().toLowerCase(),
      })),
    [options],
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((o) => o._hay.includes(q));
  }, [normalized, query]);

  const selectAt = React.useCallback(
    (idx: number) => {
      const o = filtered[idx];
      if (!o || o.disabled) return;
      onValueChange(String(o.value));
      setOpen(false);
    },
    [filtered, onValueChange],
  );

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    // Lock global Ctrl+K palette while dropdown open.
    const prev = document.body.getAttribute("data-ui-lock") ?? "";
    document.body.setAttribute("data-ui-lock", [prev, "combobox"].filter(Boolean).join(" "));
    const onDown = (e: MouseEvent | TouchEvent) => {
      const el = rootRef.current;
      if (!el) return;
      const target = e.target as Node | null;
      if (target && el.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("touchstart", onDown, true);
    return () => {
      // Remove only our lock token
      const cur = document.body.getAttribute("data-ui-lock") ?? "";
      const next = cur
        .split(/\s+/)
        .filter((t) => t && t !== "combobox")
        .join(" ");
      if (next) document.body.setAttribute("data-ui-lock", next);
      else document.body.removeAttribute("data-ui-lock");
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("touchstart", onDown, true);
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    // focus search input on open
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      selectAt(activeIndex);
    }
  };

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        className={cn("w-full justify-between font-normal", buttonClassName)}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </Button>

      {open ? (
        <div
          className={cn(
            "absolute left-0 top-[calc(100%+4px)] z-[9999] w-full rounded-md border bg-popover text-popover-foreground shadow-lg overflow-hidden",
            contentClassName,
          )}
        >
          <div className={cn("border-b p-2", className)}>
            <Input
              ref={inputRef}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
            />
          </div>

          <div className="max-h-[300px] overflow-auto p-1">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              filtered.map((o, idx) => (
                <button
                  key={o.value}
                  type="button"
                  disabled={o.disabled}
                  onMouseDown={(e) => {
                    // select before blur closes panel
                    e.preventDefault();
                    selectAt(idx);
                  }}
                  className={cn(
                    "w-full flex items-center rounded-sm px-2 py-1.5 text-sm text-left",
                    idx === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground",
                    o.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      String(o.value) === String(value ?? "")
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <span className="truncate">{o.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

