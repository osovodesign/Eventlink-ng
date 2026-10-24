import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  db,
  handleFirestoreError,
  OperationType,
} from '../../lib/firebase/client';
import { useAuth } from '../../lib/auth/auth-context';
import { useRouter } from '../../lib/router/router-context';
import { useToast } from '../../components/ui/toast';
import {
  listUserSavedListings,
  removeSavedListingForUser,
  saveListingForUser,
} from '../../server/repositories/marketplace-repository';
import { SCHEMA_LIMITS } from '../../lib/validation/marketplace-schemas';

interface SavedCompareContextValue {
  savedListingIds: string[];
  compareListingIds: string[];
  isSaved: (listingId: string) => boolean;
  isCompared: (listingId: string) => boolean;
  toggleSaveListing: (listingId: string, listingTitle?: string) => Promise<void>;
  toggleCompareListing: (
    listingId: string,
    listingTitle?: string
  ) => Promise<void>;
  clearComparison: () => Promise<void>;
}

const SavedCompareContext = createContext<SavedCompareContextValue | null>(null);

/**
 * SavedCompareProvider (PRD Section 8.8 SAVE-01–SAVE-04 & User_Flows.md Flows 4 & 5)
 * Persists saved listings and venue comparison sets to Firestore for authenticated users.
 * Redirects unauthenticated users to /login with returnTo intent preservation.
 */
export function SavedCompareProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseUser, userProfile, isAuthReady } = useAuth();
  const { pathname, search, navigate } = useRouter();
  const { showToast } = useToast();

  const [savedListingIds, setSavedListingIds] = useState<string[]>([]);
  const [compareListingIds, setCompareListingIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthReady) return;
    if (!firebaseUser || !userProfile) {
      setSavedListingIds([]);
      setCompareListingIds([]);
      return;
    }

    let cancelled = false;

    async function loadUserSavedAndComparison() {
      if (!firebaseUser) return;

      // 1. Fetch saved listings
      try {
        const saved = await listUserSavedListings(firebaseUser.uid);
        if (!cancelled && Array.isArray(saved)) {
          setSavedListingIds(saved.map((item) => item.listingId));
        }
      } catch (err) {
        console.warn('[EventLink SavedCompare] Could not load saved listings:', err);
      }

      // 2. Fetch venue comparison shortlist
      try {
        const compId = `${firebaseUser.uid}_default`;
        const compSnap = await getDoc(doc(db, 'comparisons', compId));
        if (!cancelled && compSnap.exists()) {
          const data = compSnap.data() as { listingIds?: string[] };
          setCompareListingIds(
            Array.isArray(data.listingIds)
              ? data.listingIds.slice(0, SCHEMA_LIMITS.COMPARISON_MAX_ITEMS)
              : []
          );
        } else if (!cancelled) {
          setCompareListingIds([]);
        }
      } catch (err) {
        console.warn('[EventLink SavedCompare] Could not load comparison shortlist:', err);
        if (!cancelled) {
          setCompareListingIds([]);
        }
      }
    }

    void loadUserSavedAndComparison();

    return () => {
      cancelled = true;
    };
  }, [isAuthReady, firebaseUser, userProfile]);

  const isSaved = useCallback(
    (listingId: string) => savedListingIds.includes(listingId),
    [savedListingIds]
  );

  const isCompared = useCallback(
    (listingId: string) => compareListingIds.includes(listingId),
    [compareListingIds]
  );

  const toggleSaveListing = useCallback(
    async (listingId: string, listingTitle?: string) => {
      if (!firebaseUser || !userProfile) {
        const returnUrl = encodeURIComponent(`${pathname}${search}`);
        showToast({
          title: 'Sign in to save listings',
          description: 'Sign in to keep a shortlist of venues and vendors.',
          tone: 'info',
        });
        navigate(`/login?returnTo=${returnUrl}`);
        return;
      }

      const currentlySaved = savedListingIds.includes(listingId);
      // Optimistic update with rollback on error
      setSavedListingIds((prev) =>
        currentlySaved
          ? prev.filter((id) => id !== listingId)
          : [...prev, listingId]
      );

      try {
        if (currentlySaved) {
          await removeSavedListingForUser(firebaseUser.uid, listingId);
          showToast({
            title: 'Removed from saved listings',
            description: listingTitle || undefined,
            tone: 'info',
          });
        } else {
          await saveListingForUser(firebaseUser.uid, listingId);
          showToast({
            title: 'Listing saved',
            description: listingTitle
              ? `${listingTitle} added to your saved shortlist.`
              : 'Added to your saved shortlist.',
            tone: 'success',
          });
        }
      } catch {
        // Rollback optimistic state
        setSavedListingIds((prev) =>
          currentlySaved
            ? [...prev, listingId]
            : prev.filter((id) => id !== listingId)
        );
        showToast({
          title: 'Could not update saved listings',
          description: 'Please check your connection and try again.',
          tone: 'danger',
        });
      }
    },
    [
      firebaseUser,
      userProfile,
      savedListingIds,
      pathname,
      search,
      navigate,
      showToast,
    ]
  );

  const persistComparisonIds = useCallback(
    async (uid: string, nextIds: string[]) => {
      const compId = `${uid}_default`;
      const path = `comparisons/${compId}`;
      const compRef = doc(db, 'comparisons', compId);
      try {
        const snap = await getDoc(compRef);
        if (snap.exists()) {
          await updateDoc(compRef, {
            name: 'Venue comparison shortlist',
            listingIds: nextIds,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(compRef, {
            uid,
            name: 'Venue comparison shortlist',
            listingIds: nextIds,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    },
    []
  );

  const toggleCompareListing = useCallback(
    async (listingId: string, listingTitle?: string) => {
      if (!firebaseUser || !userProfile) {
        const returnUrl = encodeURIComponent(`${pathname}${search}`);
        showToast({
          title: 'Sign in to compare venues',
          description: 'Sign in to compare up to 3 venues side by side.',
          tone: 'info',
        });
        navigate(`/login?returnTo=${returnUrl}`);
        return;
      }

      const currentlyCompared = compareListingIds.includes(listingId);
      if (
        !currentlyCompared &&
        compareListingIds.length >= SCHEMA_LIMITS.COMPARISON_MAX_ITEMS
      ) {
        showToast({
          title: 'Comparison limit reached (3 venues)',
          description:
            'Remove a venue from your comparison bar before adding another.',
          tone: 'warning',
        });
        return;
      }

      const nextIds = currentlyCompared
        ? compareListingIds.filter((id) => id !== listingId)
        : [...compareListingIds, listingId];

      setCompareListingIds(nextIds);

      try {
        await persistComparisonIds(firebaseUser.uid, nextIds);
        showToast({
          title: currentlyCompared
            ? 'Removed from comparison'
            : 'Added to venue comparison',
          description: listingTitle || `${nextIds.length}/3 venues selected`,
          tone: 'info',
        });
      } catch {
        setCompareListingIds(compareListingIds);
        showToast({
          title: 'Could not update comparison list',
          description: 'Please try again.',
          tone: 'danger',
        });
      }
    },
    [
      firebaseUser,
      userProfile,
      compareListingIds,
      pathname,
      search,
      navigate,
      showToast,
      persistComparisonIds,
    ]
  );

  const clearComparison = useCallback(async () => {
    if (!firebaseUser) {
      setCompareListingIds([]);
      return;
    }
    const previous = compareListingIds;
    setCompareListingIds([]);
    try {
      await persistComparisonIds(firebaseUser.uid, []);
    } catch {
      setCompareListingIds(previous);
    }
  }, [firebaseUser, compareListingIds, persistComparisonIds]);

  return (
    <SavedCompareContext.Provider
      value={{
        savedListingIds,
        compareListingIds,
        isSaved,
        isCompared,
        toggleSaveListing,
        toggleCompareListing,
        clearComparison,
      }}
    >
      {children}
    </SavedCompareContext.Provider>
  );
}

export function useSavedCompare(): SavedCompareContextValue {
  const ctx = useContext(SavedCompareContext);
  if (!ctx) {
    throw new Error(
      'useSavedCompare must be used within a SavedCompareProvider'
    );
  }
  return ctx;
}
