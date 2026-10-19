import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Building2,
  CheckCircle2,
  Edit3,
  Eye,
  FilePlus2,
  ImagePlus,
  Layers,
  MessageSquare,
  PackagePlus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/page-container';
import { PageHeading } from '../../components/layout/page-heading';
import { SectionHeader } from '../../components/layout/section-header';
import { Button } from '../../components/ui/button';
import {
  CheckboxField,
  RadioGroupField,
  SelectField,
  TextArea,
  TextInput,
} from '../../components/ui/inputs';
import {
  EmptyState,
  ErrorState,
  InlineAlert,
  Skeleton,
} from '../../components/ui/feedback';
import { ConfirmDialog } from '../../components/ui/overlays';
import { ListingStatusBadge } from '../../components/ui/status-badge';
import { FormField } from '../../components/forms/form-field';
import { useToast } from '../../components/ui/toast';
import { useAuth } from '../../lib/auth/auth-context';
import { AppLink } from '../../lib/router/router-context';
import {
  LAUNCH_CATEGORIES,
  formatMinorCurrency,
} from '../../lib/config/env';
import { buildDisplayPriceText } from '../../lib/validation/marketplace-schemas';
import { processAndCompressImageFile } from '../../lib/media/image-upload';
import {
  VendorListingInput,
  addVendorListingMedia,
  createVendorListing,
  createVendorListingService,
  createVendorOrganizationWithOwner,
  deleteVendorListingMedia,
  deleteVendorListingService,
  listQuotesForVendor,
  listVendorEnquiries,
  listVendorMediaForListing,
  listVendorOwnedListings,
  listVendorServicesForListing,
  reorderVendorListingMedia,
  updateVendorListing,
  updateVendorOrganization,
} from '../../server/repositories/marketplace-repository';
import {
  ContactVisibility,
  IndoorOutdoorSetting,
  LaunchCity,
  ListingMediaRecord,
  ListingRecord,
  ListingServiceRecord,
  ListingType,
  PricingModel,
} from '../../types/marketplace';
import { VendorOrganizationRecord } from '../../lib/permissions/access-control';
import { VendorEnquiriesPanel } from './vendor-enquiries-panel';

type VendorTab = 'listings' | 'enquiries' | 'editor' | 'business-profile';

const VENUE_TYPE_OPTIONS = [
  { value: 'Event Hall', label: 'Event Hall / Civic Centre' },
  { value: 'Banquet Hall', label: 'Banquet & Conference Hall' },
  { value: 'Garden & Marquee', label: 'Garden & Marquee Pavilion' },
  { value: 'Hotel Venue', label: 'Hotel Ballroom / Hall' },
  { value: 'Outdoor Lawn', label: 'Open Field / Outdoor Lawn' },
];

export function VendorWorkspacePage() {
  const {
    firebaseUser,
    userProfile,
    vendorOrganization,
    refreshVendorContext,
    updateUserProfile,
  } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<VendorTab>('listings');
  const [listings, setListings] = useState<ListingRecord[]>([]);
  const [enquiriesCount, setEnquiriesCount] = useState(0);
  const [awaitingEnquiriesCount, setAwaitingEnquiriesCount] = useState(0);
  const [quotesCount, setQuotesCount] = useState(0);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);

  // Business Profile Form State
  const [orgName, setOrgName] = useState('');
  const [orgBusinessType, setOrgBusinessType] =
    useState<VendorOrganizationRecord['businessType']>('registered-company');
  const [orgCity, setOrgCity] = useState<LaunchCity>('Warri');
  const [orgDescription, setOrgDescription] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgWhatsapp, setOrgWhatsapp] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [orgFormError, setOrgFormError] = useState<string | null>(null);
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  // Listing Editor State
  const [editingListing, setEditingListing] = useState<ListingRecord | null>(
    null
  );
  const [listingType, setListingType] = useState<ListingType>('venue');
  const [categoryId, setCategoryId] = useState('venue');
  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState<LaunchCity>('Warri');
  const [addressDisplay, setAddressDisplay] = useState('');
  const [servesWarri, setServesWarri] = useState(true);
  const [servesEffurun, setServesEffurun] = useState(true);
  const [pricingModel, setPricingModel] = useState<PricingModel>('starting-at');
  const [minPriceNaira, setMinPriceNaira] = useState('');
  const [maxPriceNaira, setMaxPriceNaira] = useState('');
  const [capacityMin, setCapacityMin] = useState('');
  const [capacityMax, setCapacityMax] = useState('');
  const [indoorOutdoor, setIndoorOutdoor] =
    useState<IndoorOutdoorSetting>('indoor');
  const [venueType, setVenueType] = useState('Event Hall');
  const [amenitiesText, setAmenitiesText] = useState(
    'Parking, Backup generator, Air conditioning'
  );
  const [cateringPolicy, setCateringPolicy] = useState('');
  const [decorationPolicy, setDecorationPolicy] = useState('');
  const [alcoholPolicy, setAlcoholPolicy] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [contactVisibility, setContactVisibility] =
    useState<ContactVisibility>('after-enquiry');
  const [acceptsEnquiries, setAcceptsEnquiries] = useState(true);
  const [listingFormError, setListingFormError] = useState<string | null>(null);
  const [isSavingListing, setIsSavingListing] = useState(false);

  // Media & Services Sub-managers for Editing Listing
  const [listingMedia, setListingMedia] = useState<ListingMediaRecord[]>([]);
  const [listingServices, setListingServices] = useState<
    ListingServiceRecord[]
  >([]);
  const [isLoadingSubItems, setIsLoadingSubItems] = useState(false);

  // New Media Upload State
  const [mediaAltText, setMediaAltText] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaExternalUrl, setMediaExternalUrl] = useState('');
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // New Package State
  const [pkgName, setPkgName] = useState('');
  const [pkgDescription, setPkgDescription] = useState('');
  const [pkgPricingModel, setPkgPricingModel] =
    useState<ListingServiceRecord['pricingModel']>('fixed');
  const [pkgPriceNaira, setPkgPriceNaira] = useState('');
  const [pkgInclusionsText, setPkgInclusionsText] = useState('');
  const [pkgError, setPkgError] = useState<string | null>(null);
  const [isSavingPkg, setIsSavingPkg] = useState(false);

  // Archive Confirmation Dialog State
  const [archiveTarget, setArchiveTarget] = useState<ListingRecord | null>(
    null
  );
  const [isArchiving, setIsArchiving] = useState(false);

  // Sync organization fields when vendorOrganization loads
  useEffect(() => {
    if (vendorOrganization) {
      setOrgName(vendorOrganization.name);
      setOrgBusinessType(vendorOrganization.businessType);
      setOrgCity((vendorOrganization.city as LaunchCity) || 'Warri');
      setOrgDescription(vendorOrganization.description);
      setOrgEmail(vendorOrganization.publicEmail || '');
      setOrgPhone(vendorOrganization.publicPhone || '');
      setOrgWhatsapp(vendorOrganization.whatsappNumber || '');
      setOrgWebsite(vendorOrganization.websiteUrl || '');
    } else if (userProfile) {
      setOrgEmail(userProfile.email || '');
      setOrgPhone(userProfile.phone || '');
    }
  }, [vendorOrganization, userProfile]);

  const loadOwnedListings = useCallback(async () => {
    if (!firebaseUser) return;
    setIsLoadingListings(true);
    setListingsError(null);
    try {
      const [items, enqs, qtes] = await Promise.all([
        listVendorOwnedListings(firebaseUser.uid),
        listVendorEnquiries(firebaseUser.uid),
        listQuotesForVendor(firebaseUser.uid),
      ]);
      setListings(items);
      setEnquiriesCount(enqs.length);
      setAwaitingEnquiriesCount(
        enqs.filter((e) => e.status === 'submitted' || e.status === 'viewed')
          .length
      );
      setQuotesCount(qtes.length);
    } catch (err) {
      setListingsError(
        err instanceof Error
          ? err.message
          : 'Unable to load your vendor listings.'
      );
    } finally {
      setIsLoadingListings(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    void loadOwnedListings();
  }, [loadOwnedListings]);

  const loadListingMediaAndServices = useCallback(
    async (listingId: string) => {
      if (!firebaseUser) return;
      setIsLoadingSubItems(true);
      try {
        const [med, srvs] = await Promise.all([
          listVendorMediaForListing(firebaseUser.uid, listingId),
          listVendorServicesForListing(firebaseUser.uid, listingId),
        ]);
        setListingMedia(med);
        setListingServices(srvs);
      } catch {
        // Non-fatal
      } finally {
        setIsLoadingSubItems(false);
      }
    },
    [firebaseUser]
  );

  // Initialize form for creating a brand-new listing
  const handleStartNewListing = (preferredType: ListingType = 'venue') => {
    setEditingListing(null);
    setListingType(preferredType);
    setCategoryId(preferredType === 'venue' ? 'venue' : 'photographer');
    setName('');
    setHeadline('');
    setDescription('');
    setCity(vendorOrganization ? (vendorOrganization.city as LaunchCity) : 'Warri');
    setAddressDisplay('');
    setServesWarri(true);
    setServesEffurun(true);
    setPricingModel('starting-at');
    setMinPriceNaira('');
    setMaxPriceNaira('');
    setCapacityMin(preferredType === 'venue' ? '100' : '');
    setCapacityMax(preferredType === 'venue' ? '500' : '');
    setIndoorOutdoor(preferredType === 'venue' ? 'indoor' : 'not-specified');
    setVenueType('Event Hall');
    setAmenitiesText(
      preferredType === 'venue'
        ? 'Parking, Backup generator, Air conditioning, Changing room'
        : 'Professional equipment, Backup crew, Timely delivery'
    );
    setCateringPolicy('External catering allowed');
    setDecorationPolicy('Approved decorators allowed');
    setAlcoholPolicy('Allowed');
    setCoverImageUrl('');
    setContactVisibility('after-enquiry');
    setAcceptsEnquiries(true);
    setListingFormError(null);
    setListingMedia([]);
    setListingServices([]);
    setActiveTab('editor');
  };

  // Populate form for editing an existing listing
  const handleEditExistingListing = (item: ListingRecord) => {
    setEditingListing(item);
    setListingType(item.listingType);
    setCategoryId(item.categoryId);
    setName(item.name);
    setHeadline(item.headline);
    setDescription(item.description);
    setCity(item.city);
    setAddressDisplay(item.addressDisplay);
    setServesWarri(item.serviceAreas?.includes('Warri') ?? item.city === 'Warri');
    setServesEffurun(
      item.serviceAreas?.includes('Effurun') ?? item.city === 'Effurun'
    );
    setPricingModel(item.pricingModel);
    setMinPriceNaira(
      item.minAmountMinor !== null && item.minAmountMinor !== undefined
        ? String(Math.round(item.minAmountMinor / 100))
        : ''
    );
    setMaxPriceNaira(
      item.maxAmountMinor !== null && item.maxAmountMinor !== undefined
        ? String(Math.round(item.maxAmountMinor / 100))
        : ''
    );
    setCapacityMin(
      item.capacityMin !== null && item.capacityMin !== undefined
        ? String(item.capacityMin)
        : ''
    );
    setCapacityMax(
      item.capacityMax !== null && item.capacityMax !== undefined
        ? String(item.capacityMax)
        : ''
    );
    setIndoorOutdoor(item.indoorOutdoor);
    setVenueType(item.venueType || 'Event Hall');
    setAmenitiesText((item.amenities || []).join(', '));
    setCateringPolicy(item.cateringPolicy || '');
    setDecorationPolicy(item.decorationPolicy || '');
    setAlcoholPolicy(item.alcoholPolicy || '');
    setCoverImageUrl(item.coverImageUrl || '');
    setContactVisibility(item.contactVisibility);
    setAcceptsEnquiries(item.acceptsEnquiries);
    setListingFormError(null);
    setActiveTab('editor');
    void loadListingMediaAndServices(item.id);
  };

  // Save or Update Business Profile
  const handleSaveBusinessProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;

    setOrgFormError(null);
    setIsSavingOrg(true);

    try {
      if (vendorOrganization) {
        await updateVendorOrganization(firebaseUser.uid, vendorOrganization, {
          name: orgName,
          businessType: orgBusinessType,
          description: orgDescription,
          city: orgCity,
          publicEmail: orgEmail || null,
          publicPhone: orgPhone || null,
          whatsappNumber: orgWhatsapp || null,
          websiteUrl: orgWebsite || null,
        });
        await refreshVendorContext();
        showToast({
          title: 'Business profile updated',
          description: `${orgName} details saved.`,
          tone: 'success',
        });
      } else {
        await createVendorOrganizationWithOwner(firebaseUser.uid, {
          name: orgName,
          businessType: orgBusinessType,
          description: orgDescription,
          city: orgCity,
          publicEmail: orgEmail || null,
          publicPhone: orgPhone || null,
          whatsappNumber: orgWhatsapp || null,
          websiteUrl: orgWebsite || null,
        });
        await updateUserProfile({
          onboardingStatus: 'complete',
          intendedRole: 'both',
        });
        await refreshVendorContext();
        showToast({
          title: 'Vendor onboarding complete',
          description: 'You can now create venue or service provider listings.',
          tone: 'success',
        });
        setActiveTab('listings');
      }
    } catch (err) {
      setOrgFormError(
        err instanceof Error
          ? err.message
          : 'Could not save business profile. Please check your inputs.'
      );
    } finally {
      setIsSavingOrg(false);
    }
  };

  // Save Draft or Submit Listing for Review
  const handleSaveListing = async (
    targetAction: 'save_draft' | 'submit_review'
  ) => {
    if (!firebaseUser || !vendorOrganization) return;

    setListingFormError(null);

    const serviceAreas: string[] = [];
    if (servesWarri) serviceAreas.push('Warri');
    if (servesEffurun) serviceAreas.push('Effurun');
    if (serviceAreas.length === 0) {
      serviceAreas.push(city);
    }

    const parsedMinMinor =
      pricingModel === 'not-provided' ||
      pricingModel === 'custom-quote' ||
      !minPriceNaira.trim()
        ? null
        : Math.round(Number.parseFloat(minPriceNaira.trim()) * 100);

    const parsedMaxMinor =
      pricingModel !== 'range' || !maxPriceNaira.trim()
        ? null
        : Math.round(Number.parseFloat(maxPriceNaira.trim()) * 100);

    if (
      (pricingModel === 'fixed' ||
        pricingModel === 'starting-at' ||
        pricingModel === 'range') &&
      (parsedMinMinor === null || Number.isNaN(parsedMinMinor) || parsedMinMinor < 0)
    ) {
      setListingFormError(
        'Please enter a valid minimum/starting price in Naira, or select "Custom quote" / "Not provided".'
      );
      return;
    }

    const parsedCapMin =
      listingType === 'venue' && capacityMin.trim()
        ? Number.parseInt(capacityMin.trim(), 10)
        : null;
    const parsedCapMax =
      listingType === 'venue' && capacityMax.trim()
        ? Number.parseInt(capacityMax.trim(), 10)
        : null;

    const amenities = amenitiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);

    const payload: VendorListingInput = {
      listingType,
      name,
      headline,
      description,
      categoryId: listingType === 'venue' ? 'venue' : categoryId,
      city,
      addressDisplay,
      serviceAreas,
      pricingModel,
      minAmountMinor: parsedMinMinor,
      maxAmountMinor: parsedMaxMinor,
      capacityMin: parsedCapMin,
      capacityMax: parsedCapMax,
      indoorOutdoor: listingType === 'venue' ? indoorOutdoor : 'not-specified',
      venueType: listingType === 'venue' ? venueType : null,
      amenities,
      cateringPolicy: listingType === 'venue' ? cateringPolicy || null : null,
      decorationPolicy:
        listingType === 'venue' ? decorationPolicy || null : null,
      alcoholPolicy: listingType === 'venue' ? alcoholPolicy || null : null,
      coverImageUrl: coverImageUrl.trim() || null,
      contactVisibility,
      acceptsEnquiries,
      submitForReview: targetAction === 'submit_review',
    };

    setIsSavingListing(true);
    try {
      if (editingListing) {
        await updateVendorListing(firebaseUser.uid, editingListing, {
          ...payload,
          targetAction,
        });
        showToast({
          title:
            targetAction === 'submit_review'
              ? 'Listing submitted for review'
              : 'Draft saved',
          description:
            targetAction === 'submit_review'
              ? 'Platform administrators will review your listing before publication.'
              : 'Your changes have been saved as a draft.',
          tone: 'success',
        });
      } else {
        const created = await createVendorListing(
          firebaseUser.uid,
          vendorOrganization.id,
          payload
        );
        setEditingListing(created);
        showToast({
          title:
            targetAction === 'submit_review'
              ? 'Listing created & submitted for review'
              : 'Draft listing created',
          description:
            'You can now upload photos and add service packages below.',
          tone: 'success',
        });
      }
      await loadOwnedListings();
    } catch (err) {
      setListingFormError(
        err instanceof Error
          ? err.message
          : 'Could not save listing. Please review all fields.'
      );
    } finally {
      setIsSavingListing(false);
    }
  };

  // Upload Photo File or Add External Image URL
  const handleFileUploadChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !editingListing || !firebaseUser || !vendorOrganization) return;

    setMediaUploadError(null);
    const fallbackAlt =
      mediaAltText.trim() || `${editingListing.name} photo ${listingMedia.length + 1}`;

    setIsUploadingMedia(true);
    try {
      const compressedDataUrl = await processAndCompressImageFile(file);
      const nextOrder = listingMedia.length + 1;
      await addVendorListingMedia(
        firebaseUser.uid,
        vendorOrganization.id,
        editingListing.id,
        {
          imageUrl: compressedDataUrl,
          altText: fallbackAlt,
          caption: mediaCaption.trim() || null,
          sortOrder: nextOrder,
        }
      );

      // If listing has no coverImageUrl yet, set it to the newly uploaded photo
      if (!coverImageUrl) {
        setCoverImageUrl(compressedDataUrl);
      }

      setMediaAltText('');
      setMediaCaption('');
      await loadListingMediaAndServices(editingListing.id);
      showToast({
        title: 'Photo uploaded',
        description: 'Added to your listing gallery.',
        tone: 'success',
      });
    } catch (err) {
      setMediaUploadError(
        err instanceof Error ? err.message : 'Failed to upload image file.'
      );
    } finally {
      setIsUploadingMedia(false);
      e.target.value = '';
    }
  };

  const handleAddExternalUrlMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing || !firebaseUser || !vendorOrganization) return;

    setMediaUploadError(null);
    if (!mediaExternalUrl.trim()) {
      setMediaUploadError('Please provide an https:// image URL or upload a file.');
      return;
    }

    const fallbackAlt =
      mediaAltText.trim() || `${editingListing.name} photo ${listingMedia.length + 1}`;

    setIsUploadingMedia(true);
    try {
      const nextOrder = listingMedia.length + 1;
      await addVendorListingMedia(
        firebaseUser.uid,
        vendorOrganization.id,
        editingListing.id,
        {
          imageUrl: mediaExternalUrl.trim(),
          altText: fallbackAlt,
          caption: mediaCaption.trim() || null,
          sortOrder: nextOrder,
        }
      );
      if (!coverImageUrl) {
        setCoverImageUrl(mediaExternalUrl.trim());
      }
      setMediaExternalUrl('');
      setMediaAltText('');
      setMediaCaption('');
      await loadListingMediaAndServices(editingListing.id);
      showToast({
        title: 'Photo added to gallery',
        tone: 'success',
      });
    } catch (err) {
      setMediaUploadError(
        err instanceof Error ? err.message : 'Could not add photo.'
      );
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleMoveMedia = async (
    index: number,
    direction: 'up' | 'down'
  ) => {
    if (!firebaseUser || !editingListing) return;
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= listingMedia.length) return;

    const currentItem = listingMedia[index];
    const neighborItem = listingMedia[swapIdx];

    try {
      await Promise.all([
        reorderVendorListingMedia(firebaseUser.uid, currentItem, swapIdx + 1),
        reorderVendorListingMedia(firebaseUser.uid, neighborItem, index + 1),
      ]);
      await loadListingMediaAndServices(editingListing.id);
    } catch {
      showToast({
        title: 'Could not reorder photos',
        tone: 'danger',
      });
    }
  };

  const handleDeleteMedia = async (item: ListingMediaRecord) => {
    if (!firebaseUser || !editingListing) return;
    try {
      await deleteVendorListingMedia(firebaseUser.uid, item);
      await loadListingMediaAndServices(editingListing.id);
      showToast({
        title: 'Photo removed',
        tone: 'info',
      });
    } catch {
      showToast({
        title: 'Could not delete photo',
        tone: 'danger',
      });
    }
  };

  // Add or Delete Service Package
  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !vendorOrganization || !editingListing) return;

    setPkgError(null);
    const amountMinor =
      pkgPricingModel === 'custom-quote' || !pkgPriceNaira.trim()
        ? 0
        : Math.round(Number.parseFloat(pkgPriceNaira.trim()) * 100);

    setIsSavingPkg(true);
    try {
      await createVendorListingService(
        firebaseUser.uid,
        vendorOrganization.id,
        editingListing.id,
        {
          name: pkgName,
          description: pkgDescription,
          categoryId: editingListing.categoryId,
          inclusions: pkgInclusionsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          pricingModel: pkgPricingModel,
          amountMinor,
          sortOrder: listingServices.length + 1,
        }
      );
      setPkgName('');
      setPkgDescription('');
      setPkgPriceNaira('');
      setPkgInclusionsText('');
      await loadListingMediaAndServices(editingListing.id);
      showToast({
        title: 'Package added',
        description: 'Visible on your listing detail page.',
        tone: 'success',
      });
    } catch (err) {
      setPkgError(
        err instanceof Error ? err.message : 'Could not add package.'
      );
    } finally {
      setIsSavingPkg(false);
    }
  };

  const handleDeletePackage = async (srv: ListingServiceRecord) => {
    if (!firebaseUser || !editingListing) return;
    try {
      await deleteVendorListingService(firebaseUser.uid, srv);
      await loadListingMediaAndServices(editingListing.id);
      showToast({
        title: 'Package removed',
        tone: 'info',
      });
    } catch {
      showToast({
        title: 'Could not delete package',
        tone: 'danger',
      });
    }
  };

  // Confirm Archive Listing
  const handleConfirmArchive = async () => {
    if (!firebaseUser || !archiveTarget) return;
    setIsArchiving(true);
    try {
      await updateVendorListing(firebaseUser.uid, archiveTarget, {
        listingType: archiveTarget.listingType,
        name: archiveTarget.name,
        headline: archiveTarget.headline,
        description: archiveTarget.description,
        categoryId: archiveTarget.categoryId,
        city: archiveTarget.city,
        addressDisplay: archiveTarget.addressDisplay,
        serviceAreas: archiveTarget.serviceAreas,
        pricingModel: archiveTarget.pricingModel,
        minAmountMinor: archiveTarget.minAmountMinor,
        maxAmountMinor: archiveTarget.maxAmountMinor,
        capacityMin: archiveTarget.capacityMin,
        capacityMax: archiveTarget.capacityMax,
        indoorOutdoor: archiveTarget.indoorOutdoor,
        venueType: archiveTarget.venueType,
        amenities: archiveTarget.amenities,
        cateringPolicy: archiveTarget.cateringPolicy,
        decorationPolicy: archiveTarget.decorationPolicy,
        alcoholPolicy: archiveTarget.alcoholPolicy,
        coverImageUrl: archiveTarget.coverImageUrl,
        contactVisibility: archiveTarget.contactVisibility,
        acceptsEnquiries: archiveTarget.acceptsEnquiries,
        targetAction: 'archive',
      });
      setArchiveTarget(null);
      await loadOwnedListings();
      showToast({
        title: 'Listing archived',
        description: 'Removed from public search results.',
        tone: 'info',
      });
    } catch (err) {
      showToast({
        title: 'Could not archive listing',
        description: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      });
    } finally {
      setIsArchiving(false);
    }
  };

  // STEP 1: Guided Vendor Onboarding if no vendorOrganization exists yet
  if (!vendorOrganization) {
    return (
      <PageContainer className="py-8 sm:py-12 space-y-8">
        <PageHeading
          kicker="Vendor onboarding — Step 1 of 2"
          title="Set up your vendor business profile"
          description="Before creating venue or service provider listings in Warri and Effurun, register your business profile. You will automatically become the organization owner."
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleSaveBusinessProfile}
            className="lg:col-span-8 rounded-[14px] border border-[#D7DEE8] bg-white p-6 sm:p-8 space-y-6"
            noValidate
          >
            {orgFormError && (
              <InlineAlert tone="danger" title="Check your business details">
                {orgFormError}
              </InlineAlert>
            )}

            <FormField
              id="onboard-org-name"
              label="Business or venue brand name"
              hint="Displayed publicly on all your listings and quotations."
              required
            >
              <TextInput
                id="onboard-org-name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g., Palm Court Event Centre or Koko Lens Studios"
                maxLength={120}
                required
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                id="onboard-org-type"
                label="Business structure"
                required
              >
                <SelectField
                  id="onboard-org-type"
                  value={orgBusinessType}
                  onChange={(e) =>
                    setOrgBusinessType(
                      e.target.value as VendorOrganizationRecord['businessType']
                    )
                  }
                  options={[
                    {
                      value: 'registered-company',
                      label: 'Registered company (CAC)',
                    },
                    {
                      value: 'sole-proprietor',
                      label: 'Sole proprietorship / Enterprise',
                    },
                    { value: 'partnership', label: 'Partnership' },
                    {
                      value: 'not-specified',
                      label: 'Independent event professional',
                    },
                  ]}
                />
              </FormField>

              <FormField
                id="onboard-org-city"
                label="Primary base city"
                required
              >
                <SelectField
                  id="onboard-org-city"
                  value={orgCity}
                  onChange={(e) => setOrgCity(e.target.value as LaunchCity)}
                  options={[
                    { value: 'Warri', label: 'Warri, Delta State' },
                    { value: 'Effurun', label: 'Effurun, Delta State' },
                  ]}
                />
              </FormField>
            </div>

            <FormField
              id="onboard-org-desc"
              label="Business overview"
              hint="Describe your event experience, service standards, and coverage across Warri and Effurun (10–2,000 characters)."
              required
            >
              <TextArea
                id="onboard-org-desc"
                rows={4}
                value={orgDescription}
                onChange={(e) => setOrgDescription(e.target.value)}
                placeholder="Tell event organizers about your venue or event services…"
                maxLength={2000}
                required
              />
            </FormField>

            <div className="border-t border-[#E9EDF3] pt-5 space-y-4">
              <h2 className="text-base font-bold text-[#142B4A]">
                Business Contact Channels
              </h2>
              <p className="text-xs text-[#697586]">
                You control on each listing whether these contact details are shown publicly or shared only after a customer submits an enquiry.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField id="onboard-org-email" label="Business email">
                  <TextInput
                    id="onboard-org-email"
                    type="email"
                    value={orgEmail}
                    onChange={(e) => setOrgEmail(e.target.value)}
                    placeholder="bookings@yourbusiness.ng"
                  />
                </FormField>

                <FormField id="onboard-org-phone" label="Business phone">
                  <TextInput
                    id="onboard-org-phone"
                    type="tel"
                    value={orgPhone}
                    onChange={(e) => setOrgPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                  />
                </FormField>

                <FormField id="onboard-org-whatsapp" label="WhatsApp number">
                  <TextInput
                    id="onboard-org-whatsapp"
                    type="tel"
                    value={orgWhatsapp}
                    onChange={(e) => setOrgWhatsapp(e.target.value)}
                    placeholder="+2348000000000"
                  />
                </FormField>

                <FormField id="onboard-org-website" label="Website URL">
                  <TextInput
                    id="onboard-org-website"
                    type="url"
                    value={orgWebsite}
                    onChange={(e) => setOrgWebsite(e.target.value)}
                    placeholder="https://example.com"
                  />
                </FormField>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSavingOrg}
                leftIcon={<Building2 className="h-4 w-4" />}
              >
                Create Business Profile & Continue
              </Button>
            </div>
          </form>

          <aside className="lg:col-span-4 rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#EFF8FF] text-[#4778D8]">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-base font-bold text-[#142B4A]">
              How EventLink Listing Review Works
            </h2>
            <ul className="space-y-2.5 text-xs text-[#344054] leading-relaxed">
              <li>
                <strong>1. Create your business profile:</strong> Establish your organization ownership for Warri &amp; Effurun.
              </li>
              <li>
                <strong>2. Build your listing &amp; packages:</strong> Save drafts at any time, upload facility or portfolio photos, and configure NGN pricing.
              </li>
              <li>
                <strong>3. Submit for moderation:</strong> Every listing is reviewed for completeness and honest pricing before appearing in public search results.
              </li>
            </ul>
          </aside>
        </div>
      </PageContainer>
    );
  }

  // Live preview of formatted display price inside the Listing Editor
  const previewMinMinor =
    pricingModel === 'not-provided' ||
    pricingModel === 'custom-quote' ||
    !minPriceNaira.trim()
      ? null
      : Math.round(Number.parseFloat(minPriceNaira.trim()) * 100);
  const previewMaxMinor =
    pricingModel !== 'range' || !maxPriceNaira.trim()
      ? null
      : Math.round(Number.parseFloat(maxPriceNaira.trim()) * 100);
  const livePricePreview = buildDisplayPriceText(
    pricingModel,
    Number.isNaN(previewMinMinor ?? NaN) ? null : previewMinMinor,
    Number.isNaN(previewMaxMinor ?? NaN) ? null : previewMaxMinor
  );

  const serviceProviderCategories = LAUNCH_CATEGORIES.filter(
    (c) => c.listingType === 'service-provider'
  );

  return (
    <PageContainer className="py-8 sm:py-10 space-y-8">
      <PageHeading
        kicker={`Vendor workspace · ${vendorOrganization.name}`}
        title="Listings & Business Management"
        description="Manage your venues and event service listings across Warri and Effurun, upload portfolio media, and track moderation status."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleStartNewListing('service-provider')}
              leftIcon={<Sparkles className="h-4 w-4 text-[#4778D8]" />}
            >
              New Service Listing
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleStartNewListing('venue')}
              leftIcon={<FilePlus2 className="h-4 w-4" />}
            >
              New Venue Listing
            </Button>
          </div>
        }
      />

      {/* Real Vendor Workspace Summary Cards (Derived Strictly from Firestore Records) */}
      <section
        aria-label="Vendor marketplace summary"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="rounded-[14px] border border-[#D7DEE8] bg-white p-5 space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#697586]">
            Published Listings
          </span>
          <p className="text-2xl font-bold text-[#142B4A] tabular-nums">
            {
              listings.filter((l) => l.publicationStatus === 'published')
                .length
            }
          </p>
          <p className="text-xs text-[#475467]">
            Live in Warri &amp; Effurun search
          </p>
        </div>

        <div className="rounded-[14px] border border-[#D7DEE8] bg-white p-5 space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#697586]">
            Drafts &amp; In Review
          </span>
          <p className="text-2xl font-bold text-[#142B4A] tabular-nums">
            {
              listings.filter(
                (l) =>
                  l.publicationStatus === 'draft' ||
                  l.publicationStatus === 'pending_review'
              ).length
            }
          </p>
          <p className="text-xs text-[#475467]">
            Awaiting publication or edits
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('enquiries')}
          className="text-left rounded-[14px] border border-[#D7DEE8] bg-white p-5 space-y-1 hover:border-[#4778D8] transition-colors cursor-pointer"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-[#697586]">
            Customer Enquiries
          </span>
          <p className="text-2xl font-bold text-[#142B4A] tabular-nums">
            {enquiriesCount}
          </p>
          <p className="text-xs font-medium text-[#4778D8]">
            {awaitingEnquiriesCount > 0
              ? `${awaitingEnquiriesCount} awaiting your reply →`
              : 'All enquiries reviewed →'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('enquiries')}
          className="text-left rounded-[14px] border border-[#D7DEE8] bg-white p-5 space-y-1 hover:border-[#4778D8] transition-colors cursor-pointer"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-[#697586]">
            Issued Quotes (NGN)
          </span>
          <p className="text-2xl font-bold text-[#142B4A] tabular-nums">
            {quotesCount}
          </p>
          <p className="text-xs font-medium text-[#4778D8]">
            Manage structured quotes →
          </p>
        </button>
      </section>

      {/* Workspace Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#D7DEE8] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('listings')}
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'listings'
              ? 'bg-[#142B4A] text-white'
              : 'bg-white text-[#344054] border border-[#D7DEE8] hover:bg-[#F4F6F9]'
          }`}
        >
          <Layers className="h-4 w-4" aria-hidden="true" />
          <span>My Listings ({listings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (activeTab !== 'editor' && !editingListing) {
              handleStartNewListing('venue');
            } else {
              setActiveTab('editor');
            }
          }}
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'editor'
              ? 'bg-[#142B4A] text-white'
              : 'bg-white text-[#344054] border border-[#D7DEE8] hover:bg-[#F4F6F9]'
          }`}
        >
          <Edit3 className="h-4 w-4" aria-hidden="true" />
          <span>
            {editingListing
              ? `Editing: ${editingListing.name.slice(0, 24)}`
              : 'Create Listing'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('enquiries')}
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'enquiries'
              ? 'bg-[#142B4A] text-white'
              : 'bg-white text-[#344054] border border-[#D7DEE8] hover:bg-[#F4F6F9]'
          }`}
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          <span>Enquiries &amp; Quotes ({enquiriesCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('business-profile')}
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'business-profile'
              ? 'bg-[#142B4A] text-white'
              : 'bg-white text-[#344054] border border-[#D7DEE8] hover:bg-[#F4F6F9]'
          }`}
        >
          <Building2 className="h-4 w-4" aria-hidden="true" />
          <span>Business Profile</span>
        </button>
      </div>

      {/* TAB: ENQUIRIES & QUOTATIONS */}
      {activeTab === 'enquiries' && firebaseUser && (
        <VendorEnquiriesPanel vendorOwnerUid={firebaseUser.uid} />
      )}

      {/* TAB 1: MY LISTINGS OVERVIEW */}
      {activeTab === 'listings' && (
        <section aria-label="Owned listings" className="space-y-6">
          {isLoadingListings ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-[14px]" />
              <Skeleton className="h-32 w-full rounded-[14px]" />
            </div>
          ) : listingsError ? (
            <ErrorState
              title="Could not load your listings"
              message={listingsError}
              onRetry={loadOwnedListings}
            />
          ) : listings.length === 0 ? (
            <EmptyState
              title="No listings created yet"
              description="Create your first venue or event service listing to appear in Warri and Effurun discovery results once approved."
              actionLabel="Create your first listing"
              onAction={() => handleStartNewListing('venue')}
            />
          ) : (
            <div className="space-y-4">
              {listings.map((item) => {
                const previewHref =
                  item.listingType === 'venue'
                    ? `/venues/${item.slug}`
                    : `/vendors/${item.slug}`;
                const catObj = LAUNCH_CATEGORIES.find(
                  (c) => c.slug === item.categoryId
                );

                return (
                  <article
                    key={item.id}
                    className="rounded-[14px] border border-[#D7DEE8] bg-white p-5 sm:p-6 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <ListingStatusBadge
                            publicationStatus={item.publicationStatus}
                            moderationStatus={item.moderationStatus}
                          />
                          <span className="text-xs font-medium text-[#697586]">
                            {catObj ? catObj.label : item.categoryId} ·{' '}
                            {item.city}, Delta State
                          </span>
                        </div>

                        <h2 className="text-lg font-bold text-[#142B4A]">
                          {item.name}
                        </h2>
                        <p className="text-sm text-[#344054]">
                          {item.headline}
                        </p>
                        <p className="text-xs font-semibold text-[#172B4D] tabular-nums">
                          Price display: {item.displayPriceText}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEditExistingListing(item)}
                          leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                        >
                          Edit &amp; Media
                        </Button>

                        <AppLink
                          href={previewHref}
                          className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-[8px] border border-[#D7DEE8] bg-white px-3.5 py-1.5 text-xs font-medium text-[#142B4A] hover:bg-[#F4F6F9] transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5 text-[#4778D8]" />
                          <span>
                            {item.publicationStatus === 'published'
                              ? 'View live page'
                              : 'Preview'}
                          </span>
                        </AppLink>

                        {item.publicationStatus !== 'archived' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setArchiveTarget(item)}
                            className="text-[#B42318] hover:bg-[#FEF3F2]"
                          >
                            Archive
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Actionable Moderation Notes Banner */}
                    {item.moderationNotes && (
                      <InlineAlert
                        tone={
                          item.moderationStatus === 'changes_requested'
                            ? 'warning'
                            : item.moderationStatus === 'rejected'
                            ? 'danger'
                            : 'info'
                        }
                        title="Moderation feedback"
                      >
                        {item.moderationNotes}
                      </InlineAlert>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: CATEGORY-AWARE LISTING EDITOR + MEDIA & PACKAGE MANAGER */}
      {activeTab === 'editor' && (
        <div className="space-y-8">
          <div className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E9EDF3] pb-4">
              <div>
                <h2 className="text-xl font-bold text-[#142B4A]">
                  {editingListing
                    ? `Edit Listing: ${editingListing.name}`
                    : 'Create a New Listing'}
                </h2>
                <p className="text-xs text-[#697586] mt-0.5">
                  All required fields are validated before saving. Submitting for review places the listing in the moderation queue.
                </p>
              </div>
              {editingListing && (
                <ListingStatusBadge
                  publicationStatus={editingListing.publicationStatus}
                  moderationStatus={editingListing.moderationStatus}
                />
              )}
            </div>

            {listingFormError && (
              <InlineAlert tone="danger" title="Please check your listing form">
                {listingFormError}
              </InlineAlert>
            )}

            {/* 1. Listing Type & Category */}
            <RadioGroupField
              name="listingType"
              legend="Listing classification"
              value={listingType}
              onChange={(val) => {
                const nextType = val as ListingType;
                setListingType(nextType);
                setCategoryId(nextType === 'venue' ? 'venue' : 'photographer');
              }}
              options={[
                {
                  value: 'venue',
                  label: 'Event Venue / Hall',
                  description:
                    'Banquet halls, civic centres, marquees, hotels, and outdoor lawns.',
                },
                {
                  value: 'service-provider',
                  label: 'Event Service Professional',
                  description:
                    'Photographers, caterers, decorators, MCs, DJs, and planners.',
                },
              ]}
            />

            {listingType === 'service-provider' && (
              <FormField
                id="editor-category"
                label="Service category"
                required
              >
                <SelectField
                  id="editor-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  options={serviceProviderCategories.map((c) => ({
                    value: c.slug,
                    label: c.label,
                  }))}
                />
              </FormField>
            )}

            {/* 2. Core Identity & Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                id="editor-name"
                label={
                  listingType === 'venue'
                    ? 'Venue name'
                    : 'Service listing title'
                }
                required
              >
                <TextInput
                  id="editor-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    listingType === 'venue'
                      ? 'e.g., Royal Palm Banquet Centre'
                      : 'e.g., Koko Lens Documentary Photography'
                  }
                  maxLength={120}
                  required
                />
              </FormField>

              <FormField
                id="editor-city"
                label="Primary city"
                required
              >
                <SelectField
                  id="editor-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value as LaunchCity)}
                  options={[
                    { value: 'Warri', label: 'Warri, Delta State' },
                    { value: 'Effurun', label: 'Effurun, Delta State' },
                  ]}
                />
              </FormField>
            </div>

            <FormField
              id="editor-headline"
              label="Concise headline"
              hint="Shown on discovery cards and below the title (4–160 characters)."
              required
            >
              <TextInput
                id="editor-headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g., 600-capacity air-conditioned banquet hall in GRA Phase 1, Warri"
                maxLength={160}
                required
              />
            </FormField>

            <FormField
              id="editor-address"
              label="Location / area display"
              hint="Area or street axis in Warri or Effurun."
              required
            >
              <TextInput
                id="editor-address"
                value={addressDisplay}
                onChange={(e) => setAddressDisplay(e.target.value)}
                placeholder="e.g., PTI Road Axis, Effurun, Delta State"
                maxLength={200}
                required
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CheckboxField
                id="serves-warri"
                label="Serves events in Warri"
                checked={servesWarri}
                onChange={(e) => setServesWarri(e.target.checked)}
              />
              <CheckboxField
                id="serves-effurun"
                label="Serves events in Effurun"
                checked={servesEffurun}
                onChange={(e) => setServesEffurun(e.target.checked)}
              />
            </div>

            <FormField
              id="editor-description"
              label="Detailed description"
              hint="Provide accurate, verifiable details about your space or service deliverables (10–3,000 characters)."
              required
            >
              <TextArea
                id="editor-description"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe layout options, power backup, setup windows, or service deliverables…"
                maxLength={3000}
                required
              />
            </FormField>

            {/* 3. Pricing Configuration (NGN Minor-Unit Safe) */}
            <div className="border-t border-[#E9EDF3] pt-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-[#142B4A]">
                  Indicative Pricing (NGN ₦)
                </h3>
                <span className="text-xs font-semibold text-[#4778D8] tabular-nums">
                  Public display preview: {livePricePreview}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  id="editor-pricing-model"
                  label="Pricing model"
                  required
                >
                  <SelectField
                    id="editor-pricing-model"
                    value={pricingModel}
                    onChange={(e) =>
                      setPricingModel(e.target.value as PricingModel)
                    }
                    options={[
                      { value: 'starting-at', label: 'Starting from (From ₦…)' },
                      { value: 'range', label: 'Price range (₦Min – ₦Max)' },
                      { value: 'fixed', label: 'Fixed rate (₦…)' },
                      {
                        value: 'custom-quote',
                        label: 'Custom quote ("Contact for pricing")',
                      },
                      {
                        value: 'not-provided',
                        label: 'Not provided ("Contact for pricing")',
                      },
                    ]}
                  />
                </FormField>

                {pricingModel !== 'custom-quote' &&
                  pricingModel !== 'not-provided' && (
                    <FormField
                      id="editor-min-price"
                      label={
                        pricingModel === 'fixed'
                          ? 'Fixed price (₦ Naira)'
                          : 'Minimum / starting price (₦ Naira)'
                      }
                      required
                    >
                      <TextInput
                        id="editor-min-price"
                        type="number"
                        min={0}
                        step="1000"
                        value={minPriceNaira}
                        onChange={(e) => setMinPriceNaira(e.target.value)}
                        placeholder="e.g., 450000"
                      />
                    </FormField>
                  )}

                {pricingModel === 'range' && (
                  <FormField
                    id="editor-max-price"
                    label="Maximum price (₦ Naira)"
                    required
                  >
                    <TextInput
                      id="editor-max-price"
                      type="number"
                      min={0}
                      step="1000"
                      value={maxPriceNaira}
                      onChange={(e) => setMaxPriceNaira(e.target.value)}
                      placeholder="e.g., 750000"
                    />
                  </FormField>
                )}
              </div>
            </div>

            {/* 4. Venue-Specific Specifications & Policies */}
            {listingType === 'venue' && (
              <div className="border-t border-[#E9EDF3] pt-5 space-y-4">
                <h3 className="text-base font-bold text-[#142B4A]">
                  Venue Capacity, Setting &amp; Policies
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField id="editor-cap-min" label="Min capacity (guests)">
                    <TextInput
                      id="editor-cap-min"
                      type="number"
                      min={1}
                      value={capacityMin}
                      onChange={(e) => setCapacityMin(e.target.value)}
                      placeholder="100"
                    />
                  </FormField>

                  <FormField id="editor-cap-max" label="Max capacity (guests)">
                    <TextInput
                      id="editor-cap-max"
                      type="number"
                      min={1}
                      value={capacityMax}
                      onChange={(e) => setCapacityMax(e.target.value)}
                      placeholder="600"
                    />
                  </FormField>

                  <FormField id="editor-setting" label="Indoor / outdoor">
                    <SelectField
                      id="editor-setting"
                      value={indoorOutdoor}
                      onChange={(e) =>
                        setIndoorOutdoor(e.target.value as IndoorOutdoorSetting)
                      }
                      options={[
                        { value: 'indoor', label: 'Indoor only' },
                        { value: 'outdoor', label: 'Outdoor only' },
                        { value: 'both', label: 'Indoor & outdoor' },
                      ]}
                    />
                  </FormField>

                  <FormField id="editor-venue-type" label="Venue type">
                    <SelectField
                      id="editor-venue-type"
                      value={venueType}
                      onChange={(e) => setVenueType(e.target.value)}
                      options={VENUE_TYPE_OPTIONS}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField id="editor-catering" label="Catering policy">
                    <TextInput
                      id="editor-catering"
                      value={cateringPolicy}
                      onChange={(e) => setCateringPolicy(e.target.value)}
                      placeholder="e.g., External catering allowed"
                      maxLength={120}
                    />
                  </FormField>

                  <FormField id="editor-decor" label="Decoration policy">
                    <TextInput
                      id="editor-decor"
                      value={decorationPolicy}
                      onChange={(e) => setDecorationPolicy(e.target.value)}
                      placeholder="e.g., Approved decorators allowed"
                      maxLength={120}
                    />
                  </FormField>

                  <FormField id="editor-alcohol" label="Alcohol policy">
                    <TextInput
                      id="editor-alcohol"
                      value={alcoholPolicy}
                      onChange={(e) => setAlcoholPolicy(e.target.value)}
                      placeholder="e.g., Allowed"
                      maxLength={120}
                    />
                  </FormField>
                </div>
              </div>
            )}

            {/* 5. Amenities & Enquiry Settings */}
            <div className="border-t border-[#E9EDF3] pt-5 space-y-4">
              <FormField
                id="editor-amenities"
                label={
                  listingType === 'venue'
                    ? 'Amenities & facility features (comma-separated)'
                    : 'Service highlights & inclusions (comma-separated)'
                }
                hint="Up to 20 features separated by commas."
              >
                <TextInput
                  id="editor-amenities"
                  value={amenitiesText}
                  onChange={(e) => setAmenitiesText(e.target.value)}
                  placeholder="Parking, Backup generator, Air conditioning, Bridal suite"
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  id="editor-contact-vis"
                  label="Contact details visibility"
                >
                  <SelectField
                    id="editor-contact-vis"
                    value={contactVisibility}
                    onChange={(e) =>
                      setContactVisibility(e.target.value as ContactVisibility)
                    }
                    options={[
                      {
                        value: 'after-enquiry',
                        label: 'Share direct contact after customer enquiry',
                      },
                      {
                        value: 'public',
                        label: 'Show business phone & email publicly on page',
                      },
                      {
                        value: 'private',
                        label: 'Communicate via EventLink enquiries only',
                      },
                    ]}
                  />
                </FormField>

                <div className="pt-6">
                  <CheckboxField
                    id="editor-accepts-enquiries"
                    label="Accept new customer enquiries"
                    description="Allow customers to send event enquiries and quote requests."
                    checked={acceptsEnquiries}
                    onChange={(e) => setAcceptsEnquiries(e.target.checked)}
                  />
                </div>
              </div>
            </div>

            {/* Save Draft vs Submit for Review Footer */}
            <div className="border-t border-[#E9EDF3] pt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#697586]">
                Submitting for review places this listing in the administrator moderation queue.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  isLoading={isSavingListing}
                  onClick={() => handleSaveListing('save_draft')}
                >
                  Save as Draft
                </Button>
                <Button
                  variant="primary"
                  isLoading={isSavingListing}
                  onClick={() => handleSaveListing('submit_review')}
                  leftIcon={<Send className="h-4 w-4" />}
                >
                  Submit for Moderation Review
                </Button>
              </div>
            </div>
          </div>

          {/* MEDIA UPLOAD & PACKAGE MANAGEMENT (Available once listing is saved/created) */}
          {editingListing ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Media Upload, Reorder & Removal Card */}
              <section
                aria-label="Listing media management"
                className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-5"
              >
                <SectionHeader
                  title="Photo Gallery & Cover Media"
                  description="Upload JPG, PNG, or WebP photos (max 5 MB per file) or add an https:// image URL. Reorder or set any photo as the primary cover."
                />

                {mediaUploadError && (
                  <InlineAlert tone="danger" title="Media upload error">
                    {mediaUploadError}
                  </InlineAlert>
                )}

                <div className="rounded-[12px] border border-[#D7DEE8] bg-[#F4F6F9]/60 p-4 space-y-3">
                  <FormField
                    id="media-alt"
                    label="Photo description (alt text)"
                    hint="Describes the photo for screen-reader users."
                    required
                  >
                    <TextInput
                      id="media-alt"
                      value={mediaAltText}
                      onChange={(e) => setMediaAltText(e.target.value)}
                      placeholder={`e.g., ${editingListing.name} main banquet hall layout`}
                      maxLength={200}
                    />
                  </FormField>

                  <FormField id="media-caption" label="Caption">
                    <TextInput
                      id="media-caption"
                      value={mediaCaption}
                      onChange={(e) => setMediaCaption(e.target.value)}
                      placeholder="Optional caption shown below the gallery stage"
                      maxLength={240}
                    />
                  </FormField>

                  <div className="pt-1 flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="vendor-photo-file-input"
                      className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-[10px] bg-[#142B4A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1c3a63] transition-colors cursor-pointer"
                    >
                      <Upload className="h-4 w-4" aria-hidden="true" />
                      <span>
                        {isUploadingMedia
                          ? 'Processing image…'
                          : 'Upload Photo File (JPG/PNG/WebP)'}
                      </span>
                      <input
                        id="vendor-photo-file-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileUploadChange}
                        disabled={isUploadingMedia}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  <form
                    onSubmit={handleAddExternalUrlMedia}
                    className="pt-2 border-t border-[#E9EDF3] flex items-end gap-2"
                  >
                    <div className="flex-1">
                      <FormField id="media-ext-url" label="Or image URL (https://)">
                        <TextInput
                          id="media-ext-url"
                          type="url"
                          value={mediaExternalUrl}
                          onChange={(e) => setMediaExternalUrl(e.target.value)}
                          placeholder="https://example.com/photo.jpg"
                        />
                      </FormField>
                    </div>
                    <Button
                      type="submit"
                      variant="secondary"
                      size="sm"
                      isLoading={isUploadingMedia}
                      leftIcon={<ImagePlus className="h-4 w-4" />}
                    >
                      Add URL
                    </Button>
                  </form>
                </div>

                {/* Current Gallery Items */}
                {isLoadingSubItems ? (
                  <Skeleton className="h-24 w-full" />
                ) : listingMedia.length === 0 ? (
                  <p className="text-xs text-[#697586]">
                    No gallery photos uploaded yet. Public visitors will see an honest &ldquo;Photography not yet uploaded&rdquo; notice until you add photos.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {listingMedia.map((m, idx) => {
                      const isCurrentCover = coverImageUrl === m.imageUrl;
                      return (
                        <li
                          key={m.id}
                          className="flex items-center justify-between gap-3 rounded-[10px] border border-[#D7DEE8] bg-white p-2.5"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={m.imageUrl}
                              alt={m.altText}
                              className="h-14 w-20 rounded-[8px] object-cover border border-[#E9EDF3] shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#142B4A] truncate">
                                #{idx + 1} · {m.altText}
                              </p>
                              {m.caption && (
                                <p className="text-[11px] text-[#697586] truncate">
                                  {m.caption}
                                </p>
                              )}
                              {isCurrentCover ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#146C43]">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Primary cover photo
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCoverImageUrl(m.imageUrl);
                                    showToast({
                                      title: 'Selected as cover photo',
                                      description:
                                        'Click "Save as Draft" or "Submit for Moderation Review" above to save the new cover.',
                                      tone: 'info',
                                    });
                                  }}
                                  className="text-[11px] font-semibold text-[#4778D8] hover:underline cursor-pointer"
                                >
                                  Set as cover photo
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              aria-label="Move photo earlier"
                              disabled={idx === 0}
                              onClick={() => handleMoveMedia(idx, 'up')}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#D7DEE8] text-[#344054] hover:bg-[#F4F6F9] disabled:opacity-40 cursor-pointer"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Move photo later"
                              disabled={idx === listingMedia.length - 1}
                              onClick={() => handleMoveMedia(idx, 'down')}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#D7DEE8] text-[#344054] hover:bg-[#F4F6F9] disabled:opacity-40 cursor-pointer"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Remove ${m.altText}`}
                              onClick={() => handleDeleteMedia(m)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#D7DEE8] text-[#B42318] hover:bg-[#FEF3F2] cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* Service Packages Manager Card */}
              <section
                aria-label="Listing packages management"
                className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-5"
              >
                <SectionHeader
                  title="Service & Hire Packages"
                  description="Itemize clear packages (e.g., Weekday Hall Hire, Full Wedding Coverage) so customers can enquire about a specific option."
                />

                {pkgError && (
                  <InlineAlert tone="danger" title="Package error">
                    {pkgError}
                  </InlineAlert>
                )}

                <form
                  onSubmit={handleAddPackage}
                  className="rounded-[12px] border border-[#D7DEE8] bg-[#F4F6F9]/60 p-4 space-y-3"
                >
                  <FormField id="pkg-name" label="Package title" required>
                    <TextInput
                      id="pkg-name"
                      value={pkgName}
                      onChange={(e) => setPkgName(e.target.value)}
                      placeholder="e.g., Weekend Reception Full Hall Package"
                      maxLength={120}
                      required
                    />
                  </FormField>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField id="pkg-model" label="Pricing type" required>
                      <SelectField
                        id="pkg-model"
                        value={pkgPricingModel}
                        onChange={(e) =>
                          setPkgPricingModel(
                            e.target.value as ListingServiceRecord['pricingModel']
                          )
                        }
                        options={[
                          { value: 'fixed', label: 'Fixed package rate' },
                          { value: 'starting-at', label: 'Starting from' },
                          { value: 'custom-quote', label: 'Custom quote' },
                        ]}
                      />
                    </FormField>

                    {pkgPricingModel !== 'custom-quote' && (
                      <FormField id="pkg-price" label="Price (₦ Naira)" required>
                        <TextInput
                          id="pkg-price"
                          type="number"
                          min={0}
                          step="1000"
                          value={pkgPriceNaira}
                          onChange={(e) => setPkgPriceNaira(e.target.value)}
                          placeholder="e.g., 600000"
                        />
                      </FormField>
                    )}
                  </div>

                  <FormField
                    id="pkg-desc"
                    label="Package description"
                    required
                  >
                    <TextArea
                      id="pkg-desc"
                      rows={2}
                      value={pkgDescription}
                      onChange={(e) => setPkgDescription(e.target.value)}
                      placeholder="What events is this package designed for?"
                      maxLength={1500}
                      required
                    />
                  </FormField>

                  <FormField
                    id="pkg-inc"
                    label="What is included (comma-separated)"
                  >
                    <TextInput
                      id="pkg-inc"
                      value={pkgInclusionsText}
                      onChange={(e) => setPkgInclusionsText(e.target.value)}
                      placeholder="Full day hall access, Standby generator, 500 banquet chairs"
                    />
                  </FormField>

                  <div className="pt-1 flex justify-end">
                    <Button
                      type="submit"
                      variant="secondary"
                      size="sm"
                      isLoading={isSavingPkg}
                      leftIcon={<PackagePlus className="h-4 w-4" />}
                    >
                      Add Package
                    </Button>
                  </div>
                </form>

                {listingServices.length > 0 && (
                  <ul className="space-y-2.5">
                    {listingServices.map((srv) => (
                      <li
                        key={srv.id}
                        className="flex items-start justify-between gap-3 rounded-[10px] border border-[#D7DEE8] bg-white p-3.5"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-[#142B4A]">
                            {srv.name}
                          </p>
                          <p className="text-xs font-semibold text-[#4778D8] tabular-nums">
                            {srv.pricingModel === 'custom-quote' ||
                            srv.amountMinor <= 0
                              ? 'Custom quote'
                              : formatMinorCurrency(srv.amountMinor)}
                          </p>
                          <p className="text-xs text-[#344054]">
                            {srv.description}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove package ${srv.name}`}
                          onClick={() => handleDeletePackage(srv)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#D7DEE8] text-[#B42318] hover:bg-[#FEF3F2] shrink-0 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : (
            <InlineAlert tone="info" title="Save draft first to upload photos & packages">
              Click <strong>Save as Draft</strong> above to create this listing record, then upload gallery photos and add itemized service packages.
            </InlineAlert>
          )}
        </div>
      )}

      {/* TAB 3: BUSINESS PROFILE SETTINGS */}
      {activeTab === 'business-profile' && (
        <form
          onSubmit={handleSaveBusinessProfile}
          className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 sm:p-8 max-w-3xl space-y-6"
          noValidate
        >
          <SectionHeader
            title="Vendor Business Profile"
            description="Keep your organization details and contact channels accurate."
          />

          {orgFormError && (
            <InlineAlert tone="danger" title="Could not update profile">
              {orgFormError}
            </InlineAlert>
          )}

          <FormField id="edit-org-name" label="Business name" required>
            <TextInput
              id="edit-org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              maxLength={120}
              required
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField id="edit-org-type" label="Business structure" required>
              <SelectField
                id="edit-org-type"
                value={orgBusinessType}
                onChange={(e) =>
                  setOrgBusinessType(
                    e.target.value as VendorOrganizationRecord['businessType']
                  )
                }
                options={[
                  {
                    value: 'registered-company',
                    label: 'Registered company (CAC)',
                  },
                  {
                    value: 'sole-proprietor',
                    label: 'Sole proprietorship / Enterprise',
                  },
                  { value: 'partnership', label: 'Partnership' },
                  {
                    value: 'not-specified',
                    label: 'Independent event professional',
                  },
                ]}
              />
            </FormField>

            <FormField id="edit-org-city" label="Primary city" required>
              <SelectField
                id="edit-org-city"
                value={orgCity}
                onChange={(e) => setOrgCity(e.target.value as LaunchCity)}
                options={[
                  { value: 'Warri', label: 'Warri, Delta State' },
                  { value: 'Effurun', label: 'Effurun, Delta State' },
                ]}
              />
            </FormField>
          </div>

          <FormField id="edit-org-desc" label="Business description" required>
            <TextArea
              id="edit-org-desc"
              rows={4}
              value={orgDescription}
              onChange={(e) => setOrgDescription(e.target.value)}
              maxLength={2000}
              required
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField id="edit-org-email" label="Public email">
              <TextInput
                id="edit-org-email"
                type="email"
                value={orgEmail}
                onChange={(e) => setOrgEmail(e.target.value)}
              />
            </FormField>

            <FormField id="edit-org-phone" label="Public phone">
              <TextInput
                id="edit-org-phone"
                type="tel"
                value={orgPhone}
                onChange={(e) => setOrgPhone(e.target.value)}
              />
            </FormField>

            <FormField id="edit-org-whatsapp" label="WhatsApp number">
              <TextInput
                id="edit-org-whatsapp"
                type="tel"
                value={orgWhatsapp}
                onChange={(e) => setOrgWhatsapp(e.target.value)}
              />
            </FormField>

            <FormField id="edit-org-website" label="Website URL">
              <TextInput
                id="edit-org-website"
                type="url"
                value={orgWebsite}
                onChange={(e) => setOrgWebsite(e.target.value)}
              />
            </FormField>
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" variant="primary" isLoading={isSavingOrg}>
              Save Business Profile
            </Button>
          </div>
        </form>
      )}

      {/* Archive Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleConfirmArchive}
        title={
          archiveTarget
            ? `Archive "${archiveTarget.name}"?`
            : 'Archive this listing?'
        }
        description="Archiving removes this listing from public discovery and search results immediately. You can still view it in your vendor workspace and resubmit it for review later."
        confirmLabel="Archive listing"
        isDestructive
        isLoading={isArchiving}
      />
    </PageContainer>
  );
}
