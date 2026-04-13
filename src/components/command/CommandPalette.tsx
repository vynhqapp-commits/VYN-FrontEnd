"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import { Home, LayoutDashboard, Settings, Shield, Users } from "lucide-react";

import { cn } from "@/lib/utils";

type CmdItem = { label: string; href: string; keywords?: string };

export function CommandPalette({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: CmdItem[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!open) setValue("");
  }, [open]);

  const filtered = useMemo(() => items, [items]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Close command palette"
        className="absolute inset-0 bg-black/30"
        onClick={() => onOpenChange(false)}
      />
      <div className="absolute left-1/2 top-[12%] w-[92vw] max-w-xl -translate-x-1/2">
        <div className="rounded-xl border bg-background shadow-xl overflow-hidden">
          <Command
            value={value}
            onValueChange={setValue}
            className="w-full"
          >
            <div className="border-b px-3">
              <CommandInput
                placeholder="Type a command or search…"
                className={cn(
                  "h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground",
                )}
                autoFocus
              />
            </div>
            <CommandList className="elite-scrollbar max-h-[360px] overflow-auto p-2">
              <CommandEmpty className="p-4 text-sm text-muted-foreground">
                No results found.
              </CommandEmpty>
              <CommandGroup heading="Navigation" className="text-xs text-muted-foreground">
                {filtered.map((i) => (
                  <CommandItem
                    key={i.href}
                    value={`${i.label} ${i.keywords ?? ""}`}
                    onSelect={() => {
                      onOpenChange(false);
                      if (pathname !== i.href) router.push(i.href);
                    }}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm aria-selected:bg-accent"
                  >
                    <span className="text-muted-foreground">
                      {i.href.startsWith("/admin") ? (
                        <Shield className="size-4" />
                      ) : i.href.startsWith("/dashboard") ? (
                        <LayoutDashboard className="size-4" />
                      ) : i.href === "/" ? (
                        <Home className="size-4" />
                      ) : (
                        <Settings className="size-4" />
                      )}
                    </span>
                    <span className="flex-1">{i.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
        <div className="mt-2 text-center text-xs text-muted-foreground">
          Press <kbd className="rounded border bg-background px-1.5 py-0.5">Esc</kbd> to close.
        </div>
      </div>
    </div>
  );
}

