import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
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
  photoPath?: string | null;
  preferredLocale?: 'en-NG' | 'en-GB' | 'en-US';
  intendedRole?: IntendedRole;
  onboardingStatus?: OnboardingStatus;
}

export interface EmailSignUpInput {
  displayName: string;
  email: string;
  password: string;
  intendedRole?: IntendedRole;
}

export interface EmailSignInInput {
  email: string;
  password: string;
  intendedRole?: IntendedRole;
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
  signInWithGoogle: (options?: {
    intendedRole?: IntendedRole;
  }) => Promise<UserProfileRecord | null>;
  signUpWithEmail: (
    input: EmailSignUpInput
  ) => Promise<UserProfileRecord | null>;
  signInWithEmail: (
    input: EmailSignInInput
  ) => Promise<UserProfileRecord | null>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  updateUserProfile: (updates: ProfileUpdateInput) => Promise<void>;
  requestAccountDeletion: () => Promise<void>;
  refreshVendorContext: () => Promise<void>;
  signOutUser: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapFirebaseAuthErrorMessage(
  error: unknown,
  fallbackMessage: string
): string {
  const rawMessage = error instanceof Error ? error.message : String(error);
  if (rawMessage.includes('auth/popup-closed-by-user')) {
    return 'Sign-in popup was closed before completing authentication.';
  }
  if (rawMessage.includes('auth/email-already-in-use')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (
    rawMessage.includes('auth/invalid-credential') ||
    rawMessage.includes('auth/wrong-password') ||
    rawMessage.includes('auth/user-not-found')
  ) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (rawMessage.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (rawMessage.includes('auth/weak-password')) {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (rawMessage.includes('auth/too-many-requests')) {
    return 'Too many unsuccessful attempts. Please wait a moment or reset your password.';
  }
  if (rawMessage.includes('auth/operation-not-allowed')) {
    return 'Email/Password sign-in is not yet enabled in the Firebase Console. Enable "Email/Password" under Authentication → Sign-in method in Firebase Console.';
  }
  return fallbackMessage;
}

async function ensureUserProfile(
  fbUser: FirebaseUser,
  preferredIntendedRole: IntendedRole = 'customer',
  preferredDisplayName?: string
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
    let updatedDisplayName = data.displayName;
    let updatedIntendedRole = data.intendedRole;

    if (data.accountStatus === 'active') {
      const patchPayload: Record<string, unknown> = {
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (
        preferredDisplayName &&
        preferredDisplayName.trim().length >= 1 &&
        data.displayName === (fbUser.email?.split('@')[0] || 'EventLink User')
      ) {
        updatedDisplayName = sanitizeDisplayName(preferredDisplayName);
        patchPayload.displayName = updatedDisplayName;
      }

      if (
        preferredIntendedRole === 'vendor' &&
        data.intendedRole === 'customer'
      ) {
        updatedIntendedRole = 'both';
        patchPayload.intendedRole = 'both';
      }

      try {
        await updateDoc(userRef, patchPayload);
      } catch {
        // Non-fatal if timestamp/role touch fails
      }
    }
    return {
      ...data,
      displayName: updatedDisplayName,
      intendedRole: updatedIntendedRole,
      uid: fbUser.uid,
    };
  }

  // Create initial user profile conforming strictly to firebase-blueprint.json & firestore.rules
  const safeDisplayName = sanitizeDisplayName(
    preferredDisplayName ||
      fbUser.displayName ||
      fbUser.email?.split('@')[0] ||
      'EventLink User'
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

  const pendingAuthOptionsRef = useRef<{
    intendedRole?: IntendedRole;
    displayName?: string;
  } | null>(null);

  const loadAuthenticatedUser = useCallback(
    async (
      fbUser: FirebaseUser,
      intendedRole?: IntendedRole,
      displayName?: string
    ) => {
      const resolvedRole =
        intendedRole || pendingAuthOptionsRef.current?.intendedRole || 'customer';
      const resolvedName =
        displayName || pendingAuthOptionsRef.current?.displayName;
      const profile = await ensureUserProfile(
        fbUser,
        resolvedRole,
        resolvedName
      );
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
      pendingAuthOptionsRef.current = {
        intendedRole: options?.intendedRole || 'customer',
      };
      try {
        const credential = await signInWithPopup(auth, googleProvider);
        const profile = await loadAuthenticatedUser(
          credential.user,
          options?.intendedRole || 'customer'
        );
        return profile;
      } catch (error) {
        setAuthError(
          mapFirebaseAuthErrorMessage(
            error,
            'Could not complete Google sign-in. Please verify your connection and try again.'
          )
        );
        return null;
      } finally {
        pendingAuthOptionsRef.current = null;
        setIsSigningIn(false);
      }
    },
    [loadAuthenticatedUser]
  );

  const signUpWithEmail = useCallback(
    async (input: EmailSignUpInput) => {
      const trimmedEmail = input.email.trim();
      const trimmedName = sanitizeDisplayName(input.displayName);
      if (!trimmedName || trimmedName.length < 2) {
        setAuthError('Please enter your full name (at least 2 characters).');
        return null;
      }
      if (!trimmedEmail) {
        setAuthError('Please enter your email address.');
        return null;
      }
      if (!input.password || input.password.length < 6) {
        setAuthError('Password must be at least 6 characters long.');
        return null;
      }

      setIsSigningIn(true);
      setAuthError(null);
      pendingAuthOptionsRef.current = {
        intendedRole: input.intendedRole || 'customer',
        displayName: trimmedName,
      };

      try {
        const credential = await createUserWithEmailAndPassword(
          auth,
          trimmedEmail,
          input.password
        );
        try {
          await updateProfile(credential.user, {
            displayName: trimmedName,
          });
        } catch {
          // Non-fatal if Auth profile displayName update fails
        }
        const profile = await loadAuthenticatedUser(
          credential.user,
          input.intendedRole || 'customer',
          trimmedName
        );
        return profile;
      } catch (error) {
        setAuthError(
          mapFirebaseAuthErrorMessage(
            error,
            'Could not create your account. Please verify your details and try again.'
          )
        );
        return null;
      } finally {
        pendingAuthOptionsRef.current = null;
        setIsSigningIn(false);
      }
    },
    [loadAuthenticatedUser]
  );

  const signInWithEmail = useCallback(
    async (input: EmailSignInInput) => {
      const trimmedEmail = input.email.trim();
      if (!trimmedEmail || !input.password) {
        setAuthError('Please enter both your email address and password.');
        return null;
      }

      setIsSigningIn(true);
      setAuthError(null);
      pendingAuthOptionsRef.current = {
        intendedRole: input.intendedRole || 'customer',
      };

      try {
        const credential = await signInWithEmailAndPassword(
          auth,
          trimmedEmail,
          input.password
        );
        const profile = await loadAuthenticatedUser(
          credential.user,
          input.intendedRole || 'customer'
        );
        return profile;
      } catch (error) {
        setAuthError(
          mapFirebaseAuthErrorMessage(
            error,
            'Could not sign in with email and password. Please try again.'
          )
        );
        return null;
      } finally {
        pendingAuthOptionsRef.current = null;
        setIsSigningIn(false);
      }
    },
    [loadAuthenticatedUser]
  );

  const sendPasswordReset = useCallback(async (email: string) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setAuthError('Please enter your email address first to reset your password.');
      return false;
    }
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      return true;
    } catch (error) {
      setAuthError(
        mapFirebaseAuthErrorMessage(
          error,
          'Could not send password reset email. Please verify the email address.'
        )
      );
      return false;
    }
  }, []);

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
      const nextPhotoPath =
        updates.photoPath !== undefined
          ? updates.photoPath
            ? updates.photoPath.trim().slice(0, 300000)
            : null
          : userProfile.photoPath ?? null;
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
          photoPath: nextPhotoPath,
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
              photoPath: nextPhotoPath,
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
        signUpWithEmail,
        signInWithEmail,
        sendPasswordReset,
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
