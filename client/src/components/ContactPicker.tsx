import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Users } from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import type { Contact } from "@shared/schema";

interface ContactPickerProps {
  onSelect: (contact: Contact) => void;
  excludeIds?: string[];
  trigger?: React.ReactNode;
}

export function ContactPicker({ onSelect, excludeIds = [], trigger }: ContactPickerProps) {
  const [open, setOpen] = useState(false);
  const { data: contacts = [], isLoading } = useContacts({});

  const filtered = excludeIds.length
    ? contacts.filter((c) => !excludeIds.includes(c.id))
    : contacts;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Assign Contact
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search contacts..." />
          <CommandList>
            <CommandEmpty>{isLoading ? "Loading..." : "No contacts found."}</CommandEmpty>
            <CommandGroup>
              {filtered.map((contact) => (
                <CommandItem
                  key={contact.id}
                  value={`${contact.fullName || ""} ${contact.emailPrimary || ""}`}
                  onSelect={() => {
                    onSelect(contact);
                    setOpen(false);
                  }}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">
                      {contact.fullName || `${contact.firstName} ${contact.lastName}`.trim() || "Unknown"}
                    </span>
                    {contact.emailPrimary && (
                      <span className="text-xs text-gray-500 truncate">{contact.emailPrimary}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
