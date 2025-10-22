"use client";

import { useId, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COUNTRY_OPTIONS, findCountryLabel } from "@/lib/countries";
import { cn } from "@/lib/utils";

interface CountrySelectProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
}

export function CountrySelect({ value, onChange, disabled, id, placeholder = "Select a country", className }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const listboxId = `${triggerId}-listbox`;

  const normalizedValue = useMemo(() => value?.trim().toUpperCase() ?? "", [value]);
  const selectedLabel = useMemo(() => findCountryLabel(normalizedValue), [normalizedValue]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          id={triggerId}
          className={cn("w-full justify-between", className)}
        >
          {selectedLabel ? `${selectedLabel} (${normalizedValue})` : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-50 w-[var(--radix-popover-trigger-width,16rem)] p-0" id={listboxId} role="listbox">
        <Command>
          <CommandInput placeholder="Search countries..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {COUNTRY_OPTIONS.map((country) => {
                const isSelected = normalizedValue === country.code;
                return (
                  <CommandItem
                    key={country.code}
                    value={`${country.label} ${country.code}`}
                    onSelect={() => {
                      onChange(country.code);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                    {country.label} ({country.code})
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
