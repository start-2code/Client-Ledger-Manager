import React, { useState, useRef } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CreatableComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function CreatableCombobox({
  value,
  onChange,
  options,
  placeholder = "Select or type...",
  disabled,
  id,
}: CreatableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = inputValue.trim()
    ? options.filter((o) => o.toLowerCase().includes(inputValue.toLowerCase()))
    : options;

  const exactMatch =
    inputValue.trim() &&
    options.some((o) => o.toLowerCase() === inputValue.trim().toLowerCase());

  const showCreateOption = inputValue.trim() && !exactMatch;

  const handleSelect = (option: string) => {
    onChange(option);
    setInputValue("");
    setOpen(false);
  };

  const handleCreate = () => {
    if (inputValue.trim()) {
      onChange(inputValue.trim());
      setInputValue("");
      setOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length === 1) {
        handleSelect(filtered[0]);
      } else if (showCreateOption) {
        handleCreate();
      }
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setInputValue("");
          setTimeout(() => inputRef.current?.focus(), 0);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal text-sm h-9"
          type="button"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
        sideOffset={4}
      >
        <div className="flex flex-col">
          <div className="flex items-center border-b px-3">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or type a value..."
              className="flex h-9 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {showCreateOption && (
              <button
                type="button"
                onClick={handleCreate}
                className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-primary hover:bg-accent hover:text-accent-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Use: <strong>"{inputValue.trim()}"</strong></span>
              </button>
            )}
            {filtered.length === 0 && !showCreateOption && (
              <p className="py-4 text-center text-sm text-muted-foreground">No options found.</p>
            )}
            {filtered.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    value === option ? "opacity-100 text-primary" : "opacity-0"
                  )}
                />
                {option}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
