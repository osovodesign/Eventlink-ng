import React, { useState, useCallback, useEffect } from 'react';
import {
  Building2,
  Camera,
  ChevronLeft,
  ChevronRight,
  Expand,
  ImageOff,
} from 'lucide-react';
import { ListingMediaRecord, ListingType } from '../../types/marketplace';
import { Dialog } from '../ui/overlays';
import { Button } from '../ui/button';

export interface MediaGalleryItem {
  id: string;
  imageUrl: string;
  altText: string;
  caption?: string | null;
}

export interface MediaGalleryProps {
  listingName: string;
  listingType: ListingType;
  categoryLabel: string;
  coverImageUrl?: string | null;
  mediaItems: ListingMediaRecord[];
}

/**
 * MediaGallery (Component_Specifications.md Section 4.6 & Build_Plan.md Phase 6)
 * - Displays primary hero photography and a keyboard-accessible thumbnail strip.
 * - Opens a full-view accessible Dialog lightbox with keyboard Left/Right navigation.
 * - Handles broken image URLs (`onError`) gracefully per item without breaking page layout.
 * - Never displays fake stock photos when no media has been uploaded.
 */
export function MediaGallery({
  listingName,
  listingType,
  categoryLabel,
  coverImageUrl,
  mediaItems,
}: MediaGalleryProps) {
  // Combine coverImageUrl (if not already in mediaItems) + sorted mediaItems
  const galleryItems: MediaGalleryItem[] = React.useMemo(() => {
    const list: MediaGalleryItem[] = [];
    const seenUrls = new Set<string>();

    for (const item of mediaItems) {
      if (item.imageUrl && !seenUrls.has(item.imageUrl)) {
        seenUrls.add(item.imageUrl);
        list.push({
          id: item.id,
          imageUrl: item.imageUrl,
          altText: item.altText || `${listingName} photo`,
          caption: item.caption || null,
        });
      }
    }

    if (coverImageUrl && !seenUrls.has(coverImageUrl)) {
      list.unshift({
        id: 'cover-primary',
        imageUrl: coverImageUrl,
        altText: `${listingName} primary view`,
        caption: null,
      });
    }

    return list;
  }, [coverImageUrl, listingName, mediaItems]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [failedIds, setFailedIds] = useState<Record<string, boolean>>({});
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Reset active index if listing changes
  useEffect(() => {
    setActiveIndex(0);
    setFailedIds({});
    setIsLightboxOpen(false);
  }, [listingName, coverImageUrl]);

  const totalCount = galleryItems.length;
  const safeIndex = totalCount > 0 ? Math.min(activeIndex, totalCount - 1) : 0;
  const activeItem = galleryItems[safeIndex] ?? null;

  const handlePrev = useCallback(() => {
    if (totalCount <= 1) return;
    setActiveIndex((prev) => (prev - 1 + totalCount) % totalCount);
  }, [totalCount]);

  const handleNext = useCallback(() => {
    if (totalCount <= 1) return;
    setActiveIndex((prev) => (prev + 1) % totalCount);
  }, [totalCount]);

  // Support Left/Right arrow keys when lightbox is open
  useEffect(() => {
    if (!isLightboxOpen || totalCount <= 1) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLightboxOpen, totalCount, handlePrev, handleNext]);

  const markImageFailed = (id: string) => {
    setFailedIds((prev) => ({ ...prev, [id]: true }));
  };

  // Zero uploaded photos fallback state (honest empty media state)
  if (totalCount === 0) {
    return (
      <section
        aria-label={`${listingName} photography`}
        className="overflow-hidden rounded-[20px] border border-[#D7DEE8] bg-[#F4F6F9]"
      >
        <div className="flex aspect-[16/9] max-h-[420px] w-full flex-col items-center justify-center p-8 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-[14px] border border-[#D7DEE8] bg-white text-[#142B4A] shadow-xs">
            {listingType === 'venue' ? (
              <Building2 className="h-6 w-6 text-[#4778D8]" aria-hidden="true" />
            ) : (
              <Camera className="h-6 w-6 text-[#4778D8]" aria-hidden="true" />
            )}
          </div>
          <p className="text-base font-semibold text-[#142B4A]">
            {categoryLabel} — Photography not yet uploaded
          </p>
          <p className="mt-1 max-w-md text-xs text-[#697586]">
            This vendor has not published portfolio or facility photographs yet.
            You can request current layout photos or video walkthroughs directly via enquiry.
          </p>
        </div>
      </section>
    );
  }

  const isActiveBroken = activeItem ? Boolean(failedIds[activeItem.id]) : false;

  return (
    <section
      aria-label={`${listingName} photo gallery`}
      className="space-y-3"
    >
      {/* Primary Stage */}
      <div className="relative overflow-hidden rounded-[20px] border border-[#D7DEE8] bg-[#F4F6F9]">
        <div className="relative aspect-[16/9] max-h-[480px] w-full overflow-hidden bg-[#F4F6F9]">
          {activeItem && !isActiveBroken ? (
            <img
              src={activeItem.imageUrl}
              alt={activeItem.altText}
              referrerPolicy="no-referrer"
              onError={() => markImageFailed(activeItem.id)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
              <div className="mb-2.5 inline-flex h-12 w-12 items-center justify-center rounded-[12px] border border-[#D7DEE8] bg-white text-[#697586]">
                <ImageOff className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-[#344054]">
                Image unavailable
              </p>
              <p className="mt-0.5 text-xs text-[#697586]">
                {activeItem?.altText || 'This photo could not be loaded.'}
              </p>
            </div>
          )}

          {/* Previous / Next stage controls when multiple photos exist */}
          {totalCount > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#D7DEE8] bg-white/95 text-[#142B4A] shadow-sm hover:bg-white cursor-pointer transition-colors"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#D7DEE8] bg-white/95 text-[#142B4A] shadow-sm hover:bg-white cursor-pointer transition-colors"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          )}

          {/* Top-right Lightbox Trigger */}
          <div className="absolute right-3 top-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[10px] border border-[#D7DEE8] bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#142B4A] shadow-xs hover:bg-white cursor-pointer transition-colors"
            >
              <Expand className="h-3.5 w-3.5 text-[#4778D8]" aria-hidden="true" />
              <span>
                {totalCount > 1 ? `View all ${totalCount} photos` : 'Expand photo'}
              </span>
            </button>
          </div>
        </div>

        {/* Caption & Counter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E9EDF3] bg-white px-4 py-2.5 text-xs">
          <p className="text-[#344054] font-medium">
            {activeItem?.caption || activeItem?.altText || listingName}
          </p>
          <span className="text-[#697586] tabular-nums shrink-0">
            Photo {safeIndex + 1} of {totalCount}
          </span>
        </div>
      </div>

      {/* Keyboard-Accessible Thumbnail Strip */}
      {totalCount > 1 && (
        <div
          role="region"
          aria-label="Photo thumbnails"
          className="flex items-center gap-2.5 overflow-x-auto pb-1"
        >
          {galleryItems.map((item, idx) => {
            const isSelected = idx === safeIndex;
            const isBroken = Boolean(failedIds[item.id]);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    handleNext();
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    handlePrev();
                  }
                }}
                aria-label={`View photo ${idx + 1}: ${item.altText}`}
                aria-current={isSelected ? 'true' : undefined}
                className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-[10px] border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#4778D8] ring-2 ring-[#4778D8]/25'
                    : 'border-[#D7DEE8] opacity-80 hover:opacity-100'
                }`}
              >
                {!isBroken ? (
                  <img
                    src={item.imageUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={() => markImageFailed(item.id)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#F4F6F9] text-[#697586]">
                    <ImageOff className="h-4 w-4" aria-hidden="true" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Fullscreen / Lightbox Dialog */}
      <Dialog
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        title={`${listingName} — Photo ${safeIndex + 1} of ${totalCount}`}
        description={activeItem?.caption || activeItem?.altText}
        maxWidthClass="max-w-4xl"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {totalCount > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handlePrev}
                    leftIcon={<ChevronLeft className="h-4 w-4" />}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleNext}
                    rightIcon={<ChevronRight className="h-4 w-4" />}
                  >
                    Next
                  </Button>
                </>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsLightboxOpen(false)}
            >
              Done
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[14px] border border-[#D7DEE8] bg-[#F4F6F9]">
            {activeItem && !isActiveBroken ? (
              <img
                src={activeItem.imageUrl}
                alt={activeItem.altText}
                referrerPolicy="no-referrer"
                onError={() => markImageFailed(activeItem.id)}
                className="h-full w-full object-contain bg-[#F4F6F9]"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
                <ImageOff
                  className="h-6 w-6 text-[#697586] mb-2"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-[#344054]">
                  Image unavailable
                </p>
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </section>
  );
}
