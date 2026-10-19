import React, { useState } from 'react';
import { Building2, Camera } from 'lucide-react';
import { ListingType } from '../../types/marketplace';

export interface ListingMediaProps {
  imageUrl?: string | null;
  altText: string;
  listingType: ListingType;
  categoryLabel: string;
  aspectRatio?: '4:3' | '16:9';
  className?: string;
}

/**
 * ListingMedia (Component_Specifications.md Section 4.6)
 * Displays listing photography with stable aspect ratio, lazy loading, and a branded neutral
 * fallback when no image is supplied or an image fails to load.
 * Never uses stock/sample photography pretending to be a real vendor's portfolio.
 */
export function ListingMedia({
  imageUrl,
  altText,
  listingType,
  categoryLabel,
  aspectRatio = '4:3',
  className = '',
}: ListingMediaProps) {
  const [hasLoadError, setHasLoadError] = useState(false);

  const aspectClass = aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[4/3]';
  const showImage = Boolean(imageUrl && !hasLoadError);

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#F4F6F9] ${aspectClass} ${className}`}
    >
      {showImage ? (
        <img
          src={imageUrl!}
          alt={altText}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setHasLoadError(true)}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-full w-full flex-col items-center justify-center p-6 text-center bg-[#F4F6F9] border-b border-[#E9EDF3]"
        >
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-white border border-[#D7DEE8] text-[#142B4A] mb-2.5">
            {listingType === 'venue' ? (
              <Building2 className="h-5 w-5 text-[#4778D8]" />
            ) : (
              <Camera className="h-5 w-5 text-[#4778D8]" />
            )}
          </div>
          <p className="text-xs font-medium text-[#344054]">{categoryLabel}</p>
          <p className="text-[11px] text-[#697586] mt-0.5">
            Photo not yet uploaded
          </p>
        </div>
      )}
    </div>
  );
}
