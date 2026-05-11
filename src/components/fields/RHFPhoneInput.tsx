'use client';

import * as React from 'react';
import { Controller, Control } from 'react-hook-form';
import { usePhoneInput, defaultCountries, parseCountry, FlagImage, CountryIso2 } from 'react-international-phone';
import 'react-international-phone/style.css';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronDown, Check, Search } from 'lucide-react';

interface RHFPhoneInputProps {
  control: Control<any>;
  name: string;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  defaultCountry?: string;
}

// Construct normalized list once
const parsedCountries = defaultCountries.map(c => parseCountry(c));

export function RHFPhoneInput({
  control,
  name,
  label,
  placeholder,
  className,
  disabled,
  defaultCountry = 'us'
}: RHFPhoneInputProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const phoneInput = usePhoneInput({
          defaultCountry: defaultCountry as CountryIso2,
          value: field.value || '',
          onChange: ({ phone }) => field.onChange(phone),
        });

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [open, setOpen] = React.useState(false);
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [searchQuery, setSearchQuery] = React.useState('');

        const filteredCountries = React.useMemo(() => {
          const q = searchQuery.toLowerCase().trim();
          if (!q) return parsedCountries;
          return parsedCountries.filter(c => 
            c.name.toLowerCase().includes(q) || 
            c.dialCode.includes(q) || 
            c.iso2.toLowerCase().includes(q)
          );
        }, [searchQuery]);

        return (
          <div className="space-y-2 w-full">
            {label && (
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {label}
              </label>
            )}

            <div className={cn(
              "flex h-11 w-full items-center rounded-xl border border-input bg-background/50 pl-1.5 pr-1 transition-all focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:border-ring",
              error && "border-destructive focus-within:ring-destructive",
              disabled && "opacity-50 cursor-not-allowed",
              className
            )}>
              
              {/* Custom Searchable Country Picker - Raw Buttons to guarantee Clickability */}
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    type="button"
                    variant="ghost" 
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="h-8 flex items-center gap-1.5 px-2 rounded-lg hover:bg-muted shrink-0"
                  >
                    <div className="flex items-center gap-1">
                      <FlagImage iso2={phoneInput.country.iso2} size="20px" className="rounded-sm shrink-0 pointer-events-none shadow-sm" />
                      <ChevronDown className="w-3 h-3 text-muted-foreground opacity-50 shrink-0" />
                    </div>
                  </Button>
                </PopoverTrigger>
                
                <PopoverContent 
                  className="p-0 w-[280px] sm:w-[320px] overflow-hidden bg-popover border shadow-xl rounded-xl z-[9999]" 
                  align="start" 
                  side="bottom" 
                  sideOffset={8}
                >
                  <div className="flex flex-col h-[350px]">
                    {/* Native Search Input */}
                    <div className="flex items-center border-b px-3 py-2 bg-muted/30">
                      <Search className="w-4 h-4 text-muted-foreground shrink-0 mr-2" />
                      <input
                        type="text"
                        placeholder="Search country or code..."
                        autoFocus
                        className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm font-medium py-1 placeholder:text-muted-foreground/60 text-foreground"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    {/* Native List container with guaranteed clickability */}
                    <div className="flex-1 overflow-y-auto elite-scrollbar p-1 space-y-0.5">
                      {filteredCountries.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">No country found.</div>
                      ) : (
                        filteredCountries.map((c) => {
                          const isSelected = phoneInput.country.iso2 === c.iso2;
                          return (
                            <button
                              key={c.iso2}
                              type="button"
                              className={cn(
                                "flex w-full items-center justify-between py-2 px-3 cursor-pointer text-sm font-medium rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
                                isSelected && "bg-muted/50"
                              )}
                              onPointerDown={(e) => {
                                // Forcing absolute interaction bypass
                                e.preventDefault();
                                e.stopPropagation();
                                phoneInput.setCountry(c.iso2 as CountryIso2);
                                setOpen(false);
                                setSearchQuery('');
                              }}
                              onClick={(e) => {
                                // Redundant click safety
                                e.preventDefault();
                                e.stopPropagation();
                                phoneInput.setCountry(c.iso2 as CountryIso2);
                                setOpen(false);
                                setSearchQuery('');
                              }}
                            >
                              <div className="flex items-center gap-2.5 pointer-events-none overflow-hidden text-left">
                                <FlagImage iso2={c.iso2} size="20px" className="rounded-sm shrink-0 shadow-sm pointer-events-none" />
                                <span className="truncate">{c.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 pointer-events-none">
                                <span className="text-xs text-muted-foreground">+{c.dialCode}</span>
                                <div className={cn("w-4 flex justify-center", isSelected ? "opacity-100" : "opacity-0")}>
                                  <Check className="h-3 w-3 text-primary" />
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Standard Masked Phone Input */}
              <input
                type="tel"
                ref={phoneInput.inputRef}
                value={phoneInput.inputValue}
                onChange={phoneInput.handlePhoneValueChange}
                disabled={disabled}
                placeholder={placeholder || "Phone number"}
                className="flex-1 h-full bg-transparent px-2 py-1 text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 border-none ring-0 shadow-none transition-none"
              />

            </div>

            {error && (
              <p className="text-xs font-medium text-destructive">
                {error.message}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}
