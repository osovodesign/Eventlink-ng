import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, MapPin, Layers, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { LAUNCH_CATEGORIES, LAUNCH_LOCATIONS } from '../../lib/config/env';

export interface SearchValues {
  query: string;
  location: string;
  category: string;
}

export interface HeroSearchProps {
  initialValues?: Partial<SearchValues>;
  onSearch: (values: SearchValues) => void;
  isLoading?: boolean;
  compact?: boolean;
}

interface SearchSuggestionItem {
  id: string;
  label: string;
  hint: string;
  query: string;
  location?: string;
  category?: string;
}

const RICH_SEARCH_SUGGESTIONS: ReadonlyArray<SearchSuggestionItem> = [
  {
    id: 'sug-gra-venue',
    label: 'Banquet Hall in GRA Warri',
    hint: 'Venues · Warri',
    query: 'GRA',
    location: 'Warri',
    category: 'venue',
  },
  {
    id: 'sug-pti-venue',
    label: 'Event Centre near PTI Road Effurun',
    hint: 'Venues · Effurun',
    query: 'PTI',
    location: 'Effurun',
    category: 'venue',
  },
  {
    id: 'sug-sapele-rd',
    label: 'Garden & Marquee on Effurun-Sapele Road',
    hint: 'Outdoor & Indoor Venues · Effurun',
    query: 'Marquee',
    location: 'Effurun',
    category: 'venue',
  },
  {
    id: 'sug-generator',
    label: 'Halls with Backup Generator & AC',
    hint: 'Amenity search · Warri & Effurun',
    query: 'Generator',
    category: 'venue',
  },
  {
    id: 'sug-wedding-photo',
    label: 'Traditional & White Wedding Photographers',
    hint: 'Photographers · Warri & Effurun',
    query: 'Wedding',
    category: 'photographer',
  },
  {
    id: 'sug-caterer',
    label: 'Nigerian & Continental Event Caterers',
    hint: 'Caterers · Warri & Effurun',
    query: 'Caterer',
    category: 'caterer',
  },
  {
    id: 'sug-decorator',
    label: 'Luxury Stage & Floral Decorators',
    hint: 'Decorators · Warri & Effurun',
    query: 'Decor',
    category: 'decorator',
  },
  {
    id: 'sug-mc-dj',
    label: 'Live Sound DJs & Bilingual Event MCs',
    hint: 'Entertainment · Warri & Effurun',
    query: '',
    category: 'dj',
  },
];

/**
 * HeroSearch & SearchBar with Phase 10 Rich Search Suggestions (Component_Specifications.md Section 4.3)
 * Accepts keyword, supported location (Warri / Effurun), and category.
 * Provides accessible keyboard-navigable autocomplete suggestions and quick discovery chips.
 */
export function HeroSearch({
  initialValues,
  onSearch,
  isLoading = false,
  compact = false,
}: HeroSearchProps) {
  const [queryText, setQueryText] = useState(initialValues?.query || '');
  const [location, setLocation] = useState(initialValues?.location || '');
  const [category, setCategory] = useState(initialValues?.category || '');
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQueryText(initialValues?.query || '');
    setLocation(initialValues?.location || '');
    setCategory(initialValues?.category || '');
  }, [initialValues?.query, initialValues?.location, initialValues?.category]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = useMemo(() => {
    const trimmed = queryText.trim().toLowerCase();
    if (!trimmed) {
      return RICH_SEARCH_SUGGESTIONS.slice(0, 6);
    }
    return RICH_SEARCH_SUGGESTIONS.filter(
      (item) =>
        item.label.toLowerCase().includes(trimmed) ||
        item.hint.toLowerCase().includes(trimmed) ||
        item.query.toLowerCase().includes(trimmed)
    ).slice(0, 6);
  }, [queryText]);

  const handleSelectSuggestion = (item: SearchSuggestionItem) => {
    const nextQuery = item.query;
    const nextLocation = item.location ?? location;
    const nextCategory = item.category ?? category;

    setQueryText(nextQuery);
    setLocation(nextLocation);
    setCategory(nextCategory);
    setIsSuggestionsOpen(false);
    setActiveIndex(-1);

    onSearch({
      query: nextQuery.trim(),
      location: nextLocation.trim(),
      category: nextCategory.trim(),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSuggestionsOpen || filteredSuggestions.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsSuggestionsOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
      );
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(filteredSuggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsSuggestionsOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuggestionsOpen(false);
    onSearch({
      query: queryText.trim(),
      location: location.trim(),
      category: category.trim(),
    });
  };

  return (
    <form
      role="search"
      aria-label="Search event venues and service providers"
      onSubmit={handleSubmit}
      className={`rounded-[14px] border border-[#D7DEE8] bg-white ${
        compact ? 'p-3 sm:p-4' : 'p-4 sm:p-5 space-y-3.5'
      }`}
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        {/* Keyword Input with Rich Autocomplete Suggestions */}
        <div ref={containerRef} className="md:col-span-5 relative">
          <label
            htmlFor="search-keyword-input"
            className="block text-xs font-medium text-[#344054] mb-1"
          >
            Search by name, area, or service
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#697586]"
              aria-hidden="true"
            />
            <input
              id="search-keyword-input"
              type="search"
              role="combobox"
              aria-expanded={
                isSuggestionsOpen && filteredSuggestions.length > 0
              }
              aria-controls="hero-search-suggestions-listbox"
              aria-autocomplete="list"
              value={queryText}
              onFocus={() => setIsSuggestionsOpen(true)}
              onChange={(e) => {
                setQueryText(e.target.value);
                setIsSuggestionsOpen(true);
                setActiveIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Hall in GRA, PTI Road, wedding photographer…"
              className="w-full min-h-[44px] rounded-[10px] border border-[#D7DEE8] bg-white pl-10 pr-3.5 py-2 text-sm text-[#172B4D] placeholder:text-[#697586] focus:border-[#4778D8] outline-none"
            />
          </div>

          {isSuggestionsOpen && filteredSuggestions.length > 0 && (
            <ul
              id="hero-search-suggestions-listbox"
              role="listbox"
              aria-label="Suggested searches in Warri and Effurun"
              className="absolute left-0 right-0 top-full z-30 mt-1.5 rounded-[12px] border border-[#D7DEE8] bg-white py-1.5 shadow-lg divide-y divide-[#F4F6F9]"
            >
              {filteredSuggestions.map((item, index) => (
                <li
                  key={item.id}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(item);
                  }}
                  className={`flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs cursor-pointer transition-colors ${
                    index === activeIndex
                      ? 'bg-[#EFF8FF] text-[#142B4A]'
                      : 'text-[#172B4D] hover:bg-[#F4F6F9]'
                  }`}
                >
                  <span className="font-semibold text-[#142B4A]">
                    {item.label}
                  </span>
                  <span className="text-[11px] text-[#697586] shrink-0">
                    {item.hint}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Location Selector */}
        <div className="md:col-span-3">
          <label
            htmlFor="search-location-select"
            className="block text-xs font-medium text-[#344054] mb-1"
          >
            Location
          </label>
          <div className="relative">
            <MapPin
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#697586]"
              aria-hidden="true"
            />
            <select
              id="search-location-select"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full min-h-[44px] rounded-[10px] border border-[#D7DEE8] bg-white pl-9 pr-3 py-2 text-sm text-[#172B4D] focus:border-[#4778D8] outline-none"
            >
              <option value="">Warri &amp; Effurun (All)</option>
              {LAUNCH_LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.city}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Selector */}
        <div className="md:col-span-2">
          <label
            htmlFor="search-category-select"
            className="block text-xs font-medium text-[#344054] mb-1"
          >
            Category
          </label>
          <div className="relative">
            <Layers
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#697586]"
              aria-hidden="true"
            />
            <select
              id="search-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full min-h-[44px] rounded-[10px] border border-[#D7DEE8] bg-white pl-9 pr-2.5 py-2 text-sm text-[#172B4D] focus:border-[#4778D8] outline-none"
            >
              <option value="">All categories</option>
              {LAUNCH_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <div className="md:col-span-2">
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="w-full"
          >
            Search
          </Button>
        </div>
      </div>

      {/* Quick Search Suggestion Chips (Full Mode) */}
      {!compact && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="inline-flex items-center gap-1 font-medium text-[#697586]">
            <Sparkles className="h-3.5 w-3.5 text-[#4778D8]" aria-hidden="true" />
            <span>Popular in Warri &amp; Effurun:</span>
          </span>
          {RICH_SEARCH_SUGGESTIONS.slice(0, 4).map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => handleSelectSuggestion(chip)}
              className="rounded-[6px] border border-[#E9EDF3] bg-[#F4F6F9] px-2.5 py-1 font-medium text-[#344054] hover:border-[#4778D8] hover:text-[#142B4A] transition-colors cursor-pointer"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
