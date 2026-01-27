import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Check, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanyFilterProps {
  companies: string[];
  value: string;
  onChange: (company: string) => void;
}

const FAVORITES_STORAGE_KEY = "favoriteCompanies";

export default function CompanyFilter({ companies, value, onChange }: CompanyFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load favorites:", error);
    }
  }, []);

  // Save favorites to localStorage whenever they change
  const updateFavorites = (newFavorites: string[]) => {
    setFavorites(newFavorites);
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
    } catch (error) {
      console.error("Failed to save favorites:", error);
    }
  };

  const toggleFavorite = (company: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (favorites.includes(company)) {
      updateFavorites(favorites.filter(f => f !== company));
    } else {
      updateFavorites([...favorites, company]);
    }
  };

  // Filter companies based on search query
  const filteredCompanies = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return companies;
    return companies.filter(company =>
      company.toLowerCase().includes(query)
    );
  }, [companies, searchQuery]);

  // Separate favorites and non-favorites
  const favoriteCompanies = useMemo(() => {
    return filteredCompanies.filter(c => favorites.includes(c));
  }, [filteredCompanies, favorites]);

  const nonFavoriteCompanies = useMemo(() => {
    return filteredCompanies.filter(c => !favorites.includes(c));
  }, [filteredCompanies, favorites]);

  const handleSelect = (company: string) => {
    onChange(company === "all" ? "" : company);
    setOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <div>
      <h3 className="text-sm font-medium text-darktext mb-3">Company</h3>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate">
              {value ? value : "All Companies"}
            </span>
            <div className="flex items-center gap-1 ml-2">
              {value && (
                <X
                  className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                  onClick={handleClear}
                />
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search companies..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>No companies found.</CommandEmpty>

              {/* All Companies option */}
              <CommandGroup>
                <CommandItem
                  value="all"
                  onSelect={() => handleSelect("all")}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  All Companies
                </CommandItem>
              </CommandGroup>

              {/* Favorites section */}
              {favoriteCompanies.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Favorites">
                    {favoriteCompanies.map((company) => (
                      <CommandItem
                        key={company}
                        value={company}
                        onSelect={() => handleSelect(company)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center flex-1">
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === company ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="truncate">{company}</span>
                        </div>
                        <Star
                          className={cn(
                            "h-4 w-4 ml-2 shrink-0",
                            "fill-yellow-400 text-yellow-400"
                          )}
                          onClick={(e) => toggleFavorite(company, e)}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Other companies */}
              {nonFavoriteCompanies.length > 0 && (
                <>
                  {favoriteCompanies.length > 0 && <CommandSeparator />}
                  <CommandGroup heading={favoriteCompanies.length > 0 ? "All Companies" : undefined}>
                    {nonFavoriteCompanies.map((company) => (
                      <CommandItem
                        key={company}
                        value={company}
                        onSelect={() => handleSelect(company)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center flex-1">
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === company ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="truncate">{company}</span>
                        </div>
                        <Star
                          className={cn(
                            "h-4 w-4 ml-2 shrink-0",
                            favorites.includes(company)
                              ? "fill-yellow-400 text-yellow-400"
                              : "opacity-30 hover:opacity-100"
                          )}
                          onClick={(e) => toggleFavorite(company, e)}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
