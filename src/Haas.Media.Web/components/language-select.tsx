"use client";

import { useId, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TMDB_LANGUAGE_OPTIONS, findTmdbLanguageLabel } from "@/lib/tmdb-languages";
import { cn } from "@/lib/utils";

interface LanguageSelectProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
}

export function LanguageSelect({ value, onChange, disabled, id, placeholder = "Select a language", className }: LanguageSelectProps) {
  const [open, setOpen] = useState(false);
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const listboxId = `${triggerId}-listbox`;

  const normalizedValue = useMemo(() => value?.trim() ?? "", [value]);
  const selectedLabel = useMemo(() => findTmdbLanguageLabel(normalizedValue), [normalizedValue]);

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
          <CommandInput placeholder="Search languages..." />
          <CommandList>
            <CommandEmpty>No language found.</CommandEmpty>
            <CommandGroup>
              {TMDB_LANGUAGE_OPTIONS.map((language) => {
                const isSelected = normalizedValue === language.code;
                return (
                  <CommandItem
                    key={language.code}
                    value={`${language.label} ${language.code}`}
                    onSelect={() => {
                      onChange(language.code);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                    {language.label} ({language.code})
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
