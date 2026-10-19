import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase/client';
import {
  IntendedRole,
  OnboardingStatus,
  UserProfileRecord,
  VendorMembershipRecord,
  VendorOrganizationRecord,
  isVerifiedAdminIdentity,
  sanitizeDisplayName,
  sanitizePhone,
} from '../permissions/access-control';

export interface ProfileUpdateInput {
  displayName?: string;
  phone?: string | null;
  preferredLocale?: 'en-NG' | 'en-GB' | 'en-US';
  intendedRole?: IntendedRole;
  onboardingStatus?: OnboardingStatus;
}

interface AuthContextValue {
  isAuthReady: boolean;
  isSigningIn: boolean;
  authError: string | null;
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfileRecord | null;
  vendorOrganization: VendorOrganizationRecord | null;
  vendorMembership: VendorMembershipRecord | null;
  isAdmin: boolean;
  signInWithGoogle: (options?: { intendedRole?: IntendedRole }) => Promise<UserProfileRecord | null>;
  updateUserProfile: (updates: ProfileUpdateInput) => Promise<void>;
  requestAccountDeletion: () => Promise<void>;
  refreshVendorContext: () => Promise<void>;
  signOutUser: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function ensureUserProfile(
  fbUser: FirebaseUser,
  preferredIntendedRole: IntendedRole = 'customer'
): Promise<UserProfileRecord> {
  const userPath = `users/${fbUser.uid}`;
  const userRef = doc(db, 'users', fbUser.uid);

  let existingSnap;
  try {
    existingSnap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (existingSnap && existingSnap.exists()) {
    const data = existingSnap.data() as UserProfileRecord;
    // Update lastLoginAt if account is active
    if (data.accountStatus === 'active') {
      try {
        await updateDoc(userRef, {
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Non-fatal if timestamp touch fails
      }
    }
    return {
      ...data,
      uid: fbUser.uid,
    };
  }

  // Create initial user profile conforming strictly to firebase-blueprint.json & firestore.rules
  const safeDisplayName = sanitizeDisplayName(
    fbUser.displayName || fbUser.email?.split('@')[0] || 'EventLink User'
  );
  const safeEmail = (fbUser.email || 'user@eventlink.ng').slice(0, 254);

  const newProfilePayload = {
    uid: fbUser.uid,
    displayName: safeDisplayName,
    email: safeEmail,
    phone: sanitizePhone(fbUser.phoneNumber),
    photoPath: fbUser.photoURL ? fbUser.photoURL.slice(0, 500) : null,
    preferredLocale: 'en-NG' as const,
    accountStatus: 'active' as const,
    onboardingStatus: 'incomplete' as const,
    intendedRole: preferredIntendedRole,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  };

  try {
    await setDoc(userRef, newProfilePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, userPath);
  }

  return {
    ...newProfilePayload,
  };
}

async function fetchVendorAndAdminContext(fbUser: FirebaseUser): Promise<{
  vendorOrg: VendorOrganizationRecord | null;
  membership: VendorMembershipRecord | null;
  hasAdminDoc: boolean;
}> {
  let vendorOrg: VendorOrganizationRecord | null = null;
  let membership: VendorMembershipRecord | null = null;
  let hasAdminDoc = false;

  try {
    const orgQuery = query(
      collection(db, 'vendorOrganizations'),
      where('ownerUid', '==', fbUser.uid),
      limit(1)
    );
    const orgSnap = await getDocs(orgQuery);
    if (!orgSnap.empty) {
      const docSnap = orgSnap.docs[0];
      vendorOrg = {
        id: docSnap.id,
        ...(docSnap.data() as Omit<VendorOrganizationRecord, 'id'>),
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'vendorOrganizations');
  }

  try {
    const memQuery = query(
      collection(db, 'vendorMemberships'),
      where('uid', '==', fbUser.uid),
      limit(1)
    );
    const memSnap = await getDocs(memQuery);
    if (!memSnap.empty) {
      const docSnap = memSnap.docs[0];
      membership = {
        id: docSnap.id,
        ...(docSnap.data() as Omit<VendorMembershipRecord, 'id'>),
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'vendorMemberships');
  }

  try {
    const adminRef = doc(db, 'admins', fbUser.uid);
    const adminSnap = await getDoc(adminRef);
    hasAdminDoc = adminSnap.exists();
  } catch {
    hasAdminDoc = false;
  }

  return { vendorOrg, membership, hasAdminDoc };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileRecord | null>(null);
  const [vendorOrganization, setVendorOrganization] =
    useState<VendorOrganizationRecord | null>(null);
  const [vendorMembership, setVendorMembership] =
    useState<VendorMembershipRecord | null>(null);
  const [hasAdminRecord, setHasAdminRecord] = useState(false);

  const loadAuthenticatedUser = useCallback(
    async (fbUser: FirebaseUser, intendedRole: IntendedRole = 'customer') => {
      const profile = await ensureUserProfile(fbUser, intendedRole);
      const { vendorOrg, membership, hasAdminDoc } =
        await fetchVendorAndAdminContext(fbUser);
      setUserProfile(profile);
      setVendorOrganization(vendorOrg);
      setVendorMembership(membership);
      setHasAdminRecord(hasAdminDoc);
      return profile;
    },
    []
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUserProfile(null);
        setVendorOrganization(null);
        setVendorMembership(null);
        setHasAdminRecord(false);
        setIsAuthReady(true);
        return;
      }

      try {
        await loadAuthenticatedUser(fbUser);
      } catch (err) {
        console.error('[EventLink Auth] Failed to load profile:', err);
        setAuthError(
          'Unable to load your account profile. Please try signing in again.'
        );
      } finally {
        setIsAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, [loadAuthenticatedUser]);

  const signInWithGoogle = useCallback(
    async (options?: { intendedRole?: IntendedRole }) => {
      setIsSigningIn(true);
      setAuthError(null);
      try {
        const credential = await signInWithPopup(auth, googleProvider);
        const profile = await loadAuthenticatedUser(
          credential.user,
          options?.intendedRole || 'customer'
        );

        // If user selected vendor intent on an existing customer profile, upgrade intendedRole safely
        if (
          options?.intendedRole === 'vendor' &&
          profile.intendedRole === 'customer' &&
          profile.accountStatus === 'active'
        ) {
          const userRef = doc(db, 'users', credential.user.uid);
          try {
            await updateDoc(userRef, {
              intendedRole: 'both',
              updatedAt: serverTimestamp(),
            });
            setUserProfile((prev) =>
              prev ? { ...prev, intendedRole: 'both' } : prev
            );
          } catch (error) {
            handleFirestoreError(
              error,
              OperationType.UPDATE,
              `users/${credential.user.uid}`
            );
          }
        }
        return profile;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Authentication failed';
        if (message.includes('auth/popup-closed-by-user')) {
          setAuthError('Sign-in popup was closed before completing authentication.');
        } else {
          setAuthError(
            'Could not complete Google sign-in. Please verify your connection and try again.'
          );
        }
        return null;
      } finally {
        setIsSigningIn(false);
      }
    },
    [loadAuthenticatedUser]
  );

  const updateUserProfile = useCallback(
    async (updates: ProfileUpdateInput) => {
      if (!firebaseUser || !userProfile) {
        throw new Error('You must be signed in to update your profile.');
      }
      if (userProfile.accountStatus !== 'active') {
        throw new Error('Only active accounts can update profile information.');
      }

      const nextDisplayName =
        updates.displayName !== undefined
          ? sanitizeDisplayName(updates.displayName)
          : userProfile.displayName;
      const nextPhone =
        updates.phone !== undefined
          ? sanitizePhone(updates.phone)
          : userProfile.phone ?? null;
      const nextLocale = updates.preferredLocale ?? userProfile.preferredLocale;
      const nextIntendedRole = updates.intendedRole ?? userProfile.intendedRole;
      const nextOnboardingStatus =
        updates.onboardingStatus ?? userProfile.onboardingStatus;

      const userPath = `users/${firebaseUser.uid}`;
      const userRef = doc(db, 'users', firebaseUser.uid);

      try {
        await updateDoc(userRef, {
          displayName: nextDisplayName,
          phone: nextPhone,
          preferredLocale: nextLocale,
          intendedRole: nextIntendedRole,
          onboardingStatus: nextOnboardingStatus,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, userPath);
      }

      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              displayName: nextDisplayName,
              phone: nextPhone,
              preferredLocale: nextLocale,
              intendedRole: nextIntendedRole,
              onboardingStatus: nextOnboardingStatus,
            }
          : null
      );
    },
    [firebaseUser, userProfile]
  );

  const requestAccountDeletion = useCallback(async () => {
    if (!firebaseUser || !userProfile) {
      throw new Error('You must be signed in to request account deletion.');
    }
    const userPath = `users/${firebaseUser.uid}`;
    const userRef = doc(db, 'users', firebaseUser.uid);

    try {
      await updateDoc(userRef, {
        accountStatus: 'deletion_pending',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }

    setUserProfile((prev) =>
      prev ? { ...prev, accountStatus: 'deletion_pending' } : null
    );
  }, [firebaseUser, userProfile]);

  const refreshVendorContext = useCallback(async () => {
    if (!firebaseUser) return;
    const { vendorOrg, membership, hasAdminDoc } =
      await fetchVendorAndAdminContext(firebaseUser);
    setVendorOrganization(vendorOrg);
    setVendorMembership(membership);
    setHasAdminRecord(hasAdminDoc);
  }, [firebaseUser]);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const isAdmin = isVerifiedAdminIdentity(
    firebaseUser?.email,
    firebaseUser?.emailVerified,
    hasAdminRecord
  );

  return (
    <AuthContext.Provider
      value={{
        isAuthReady,
        isSigningIn,
        authError,
        firebaseUser,
        userProfile,
        vendorOrganization,
        vendorMembership,
        isAdmin,
        signInWithGoogle,
        updateUserProfile,
        requestAccountDeletion,
        refreshVendorContext,
        signOutUser,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
