import React from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import { Button } from '../ui/button';
import { LAUNCH_CATEGORIES, LAUNCH_LOCATIONS } from '../../lib/config/env';
import { LaunchCity, ListingType } from '../../types/marketplace';

export interface ActiveDiscoveryFilters {
  q: string;
  type: '' | ListingType;
  category: string;
  city: '' | LaunchCity;
  setting: '' | 'indoor' | 'outdoor' | 'both';
  minCapacity: string;
  maxPriceNaira: string;
  sortBy: 'recent' | 'price-asc' | 'price-desc' | 'capacity-desc';
}

export interface FilterPanelProps {
  filters: ActiveDiscoveryFilters;
  onUpdateFilters: (next: Partial<ActiveDiscoveryFilters>) => void;
  onResetFilters: () => void;
}

/**
 * FilterPanel (PRD Section 8.3 SEARCH-01–SEARCH-06 & Component_Specifications.md Section 4.4)
 * Offers only filters backed by stored, queryable listing attributes.
 * Never offers "highest rated", "available now", or "verified only".
 */
export function FilterPanel({
  filters,
  onUpdateFilters,
  onResetFilters,
}: FilterPanelProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-[#E9EDF3] pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#142B4A]">
          <SlidersHorizontal className="h-4 w-4 text-[#4778D8]" aria-hidden="true" />
          <span>Filter listings</span>
        </div>
        <button
          type="button"
          onClick={onResetFilters}
          className="text-xs font-medium text-[#4778D8] hover:underline cursor-pointer"
        >
          Reset all
        </button>
      </div>

      {/* Listing Type */}
      <div>
        <label
          htmlFor="filter-listing-type"
          className="block text-xs font-medium text-[#172B4D] mb-1.5"
        >
          Listing type
        </label>
        <select
          id="filter-listing-type"
          value={filters.type}
          onChange={(e) =>
            onUpdateFilters({
              type: e.target.value as ActiveDiscoveryFilters['type'],
            })
          }
          className="w-full min-h-[42px] rounded-[10px] border border-[#D7DEE8] bg-white px-3 py-2 text-sm text-[#172B4D] focus:border-[#4778D8] outline-none"
        >
          <option value="">All (Venues & Services)</option>
          <option value="venue">Venues & Event Halls</option>
          <option value="service-provider">Event Service Providers</option>
        </select>
      </div>

      {/* Category */}
      <div>
        <label
          htmlFor="filter-category"
          className="block text-xs font-medium text-[#172B4D] mb-1.5"
        >
          Category
        </label>
        <select
          id="filter-category"
          value={filters.category}
          onChange={(e) => onUpdateFilters({ category: e.target.value })}
          className="w-full min-h-[42px] rounded-[10px] border border-[#D7DEE8] bg-white px-3 py-2 text-sm text-[#172B4D] focus:border-[#4778D8] outline-none"
        >
          <option value="">All categories</option>
          {LAUNCH_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* City / Service Area */}
      <div>
        <label
          htmlFor="filter-city"
          className="block text-xs font-medium text-[#172B4D] mb-1.5"
        >
          Location / service area
        </label>
        <select
          id="filter-city"
          value={filters.city}
          onChange={(e) =>
            onUpdateFilters({
              city: e.target.value as ActiveDiscoveryFilters['city'],
            })
          }
          className="w-full min-h-[42px] rounded-[10px] border border-[#D7DEE8] bg-white px-3 py-2 text-sm text-[#172B4D] focus:border-[#4778D8] outline-none"
        >
          <option value="">Warri & Effurun</option>
          {LAUNCH_LOCATIONS.map((loc) => (
            <option key={loc.id} value={loc.city}>
              {loc.city}, Delta State
            </option>
          ))}
        </select>
      </div>

      {/* Venue-Specific Filters */}
      {(filters.type === '' ||
        filters.type === 'venue' ||
        filters.category === 'venue') && (
        <>
          <div>
            <label
              htmlFor="filter-setting"
              className="block text-xs font-medium text-[#172B4D] mb-1.5"
            >
              Venue setting
            </label>
            <select
              id="filter-setting"
              value={filters.setting}
              onChange={(e) =>
                onUpdateFilters({
                  setting: e.target.value as ActiveDiscoveryFilters['setting'],
                })
              }
              className="w-full min-h-[42px] rounded-[10px] border border-[#D7DEE8] bg-white px-3 py-2 text-sm text-[#172B4D] focus:border-[#4778D8] outline-none"
            >
              <option value="">Any setting</option>
              <option value="indoor">Indoor hall</option>
              <option value="outdoor">Outdoor space</option>
              <option value="both">Indoor & outdoor</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-min-capacity"
              className="block text-xs font-medium text-[#172B4D] mb-1.5"
            >
              Minimum guest capacity
            </label>
            <select
              id="filter-min-capacity"
              value={filters.minCapacity}
              onChange={(e) => onUpdateFilters({ minCapacity: e.target.value })}
              className="w-full min-h-[42px] rounded-[10px] border border-[#D7DEE8] bg-white px-3 py-2 text-sm text-[#172B4D] focus:border-[#4778D8] outline-none"
            >
              <option value="">Any capacity</option>
              <option value="100">100+ guests</option>
              <option value="250">250+ guests</option>
              <option value="500">500+ guests</option>
              <option value="750">750+ guests</option>
            </select>
          </div>
        </>
      )}

      {/* Maximum Indicative Starting Price */}
      <div>
        <label
          htmlFor="filter-max-price"
          className="block text-xs font-medium text-[#172B4D] mb-1.5"
        >
          Max starting price (₦ NGN)
        </label>
        <select
          id="filter-max-price"
          value={filters.maxPriceNaira}
          onChange={(e) => onUpdateFilters({ maxPriceNaira: e.target.value })}
          className="w-full min-h-[42px] rounded-[10px] border border-[#D7DEE8] bg-white px-3 py-2 text-sm text-[#172B4D] focus:border-[#4778D8] outline-none"
        >
          <option value="">Any price range</option>
          <option value="250000">Up to ₦250,000</option>
          <option value="500000">Up to ₦500,000</option>
          <option value="750000">Up to ₦750,000</option>
          <option value="1000000">Up to ₦1,000,000</option>
        </select>
      </div>
    </div>
  );
}

/**
 * ActiveFilterChips (Component_Specifications.md Section 4.4)
 * Shows applied filters with named remove buttons and a clear-all action.
 */
export function ActiveFilterChips({
  filters,
  onUpdateFilters,
  onResetFilters,
}: FilterPanelProps) {
  const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

  if (filters.q) {
    chips.push({
      key: 'q',
      label: `Search: "${filters.q}"`,
      onRemove: () => onUpdateFilters({ q: '' }),
    });
  }
  if (filters.type) {
    chips.push({
      key: 'type',
      label: filters.type === 'venue' ? 'Type: Venues' : 'Type: Services',
      onRemove: () => onUpdateFilters({ type: '' }),
    });
  }
  if (filters.category) {
    const cat = LAUNCH_CATEGORIES.find((c) => c.slug === filters.category);
    chips.push({
      key: 'category',
      label: `Category: ${cat ? cat.label : filters.category}`,
      onRemove: () => onUpdateFilters({ category: '' }),
    });
  }
  if (filters.city) {
    chips.push({
      key: 'city',
      label: `Location: ${filters.city}`,
      onRemove: () => onUpdateFilters({ city: '' }),
    });
  }
  if (filters.setting) {
    chips.push({
      key: 'setting',
      label: `Setting: ${filters.setting}`,
      onRemove: () => onUpdateFilters({ setting: '' }),
    });
  }
  if (filters.minCapacity) {
    chips.push({
      key: 'minCapacity',
      label: `Capacity: ${filters.minCapacity}+ guests`,
      onRemove: () => onUpdateFilters({ minCapacity: '' }),
    });
  }
  if (filters.maxPriceNaira) {
    chips.push({
      key: 'maxPriceNaira',
      label: `Max price: ₦${Number(filters.maxPriceNaira).toLocaleString()}`,
      onRemove: () => onUpdateFilters({ maxPriceNaira: '' }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div
      aria-label="Active filters"
      className="flex flex-wrap items-center gap-2 py-1"
    >
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          aria-label={`Remove filter ${chip.label}`}
          className="inline-flex min-h-[32px] items-center gap-1.5 rounded-[999px] border border-[#4778D8]/40 bg-[#EFF8FF] px-3 py-1 text-xs font-medium text-[#142B4A] hover:bg-[#E0F2FE] transition-colors cursor-pointer whitespace-nowrap"
        >
          <span>{chip.label}</span>
          <X className="h-3.5 w-3.5 text-[#175CD3]" aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        onClick={onResetFilters}
        className="text-xs font-medium text-[#4778D8] hover:underline px-2 py-1 cursor-pointer whitespace-nowrap"
      >
        Clear all filters
      </button>
    </div>
  );
}

export interface SortSelectProps {
  value: ActiveDiscoveryFilters['sortBy'];
  onChange: (next: ActiveDiscoveryFilters['sortBy']) => void;
}

/**
 * SortSelect (Component_Specifications.md Section 4.4)
 */
export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <label
        htmlFor="discovery-sort-select"
        className="text-xs font-medium text-[#697586] whitespace-nowrap"
      >
        Sort by:
      </label>
      <select
        id="discovery-sort-select"
        value={value}
        onChange={(e) =>
          onChange(e.target.value as ActiveDiscoveryFilters['sortBy'])
        }
        className="min-h-[38px] rounded-[8px] border border-[#D7DEE8] bg-white px-3 py-1.5 text-xs font-medium text-[#172B4D] focus:border-[#4778D8] outline-none"
      >
        <option value="recent">Recently added</option>
        <option value="price-asc">Starting price: low to high</option>
        <option value="price-desc">Starting price: high to low</option>
        <option value="capacity-desc">Venue capacity: high to low</option>
      </select>
    </div>
  );
}

/**
 * CategoryChips (Component_Specifications.md Section 3.2)
 * Interactive filter buttons allowing 1-click category selection.
 */
export function CategoryChips({
  selectedCategory,
  onSelectCategory,
}: {
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Filter by category"
      className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar"
    >
      <Button
        size="sm"
        variant={selectedCategory === '' ? 'primary' : 'secondary'}
        onClick={() => onSelectCategory('')}
      >
        All categories
      </Button>
      {LAUNCH_CATEGORIES.map((cat) => (
        <Button
          key={cat.id}
          size="sm"
          variant={selectedCategory === cat.slug ? 'primary' : 'secondary'}
          onClick={() => onSelectCategory(cat.slug)}
        >
          {cat.label}
        </Button>
      ))}
    </div>
  );
}
