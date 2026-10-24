import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Shield,
  Building2,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Trash2,
  ArrowRight,
  Bell,
  Bookmark,
  Download,
  GitCompareArrows,
  MessageSquare,
  FileText,
  CheckCheck,
  Upload,
} from 'lucide-react';
import { useAuth } from '../../lib/auth/auth-context';
import {
  IntendedRole,
  USER_PROFILE_CONSTRAINTS,
} from '../../lib/permissions/access-control';
import { processAndCompressAvatarImage } from '../../lib/media/image-upload';
import { AppLink, useRouter } from '../../lib/router/router-context';
import { useSavedCompare } from '../../features/saved-items/saved-compare-context';
import {
  listCustomerEnquiries,
  listQuotesForCustomer,
  listUserNotifications,
  markAllUserNotificationsRead,
  markNotificationRead,
} from '../../server/repositories/marketplace-repository';
import {
  EnquiryRecord,
  NotificationRecord,
  QuoteRecord,
} from '../../types/marketplace';
import { PageContainer } from '../layout/page-container';
import { PageHeading } from '../layout/page-heading';
import { Button } from '../ui/button';

/**
 * AccountProfilePage (PRD Section 8.1 AUTH-02, AUTH-03, AUTH-06 & Build_Plan.md Phase 9)
 * Provides the unified Customer & Account Workspace:
 * - Real activity summary derived strictly from Firestore records (Saved, Compared, Enquiries, Quotes)
 * - Real in-app notifications feed with mark-as-read
 * - Account profile & role capability management (Customer / Vendor / Both)
 * - Privacy-compliant JSON data export and account deletion request workflow
 */
export function AccountProfilePage() {
  const {
    firebaseUser,
    userProfile,
    vendorOrganization,
    isAdmin,
    updateUserProfile,
    requestAccountDeletion,
    signOutUser,
  } = useAuth();
  const { navigate } = useRouter();
  const { savedListingIds, compareListingIds } = useSavedCompare();

  const [displayName, setDisplayName] = useState(
    userProfile?.displayName || ''
  );
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [photoPath, setPhotoPath] = useState(
    userProfile?.photoPath || vendorOrganization?.logoImageUrl || ''
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [preferredLocale, setPreferredLocale] = useState<
    'en-NG' | 'en-GB' | 'en-US'
  >(userProfile?.preferredLocale || 'en-NG');
  const [intendedRole, setIntendedRole] = useState<IntendedRole>(
    userProfile?.intendedRole || 'customer'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Real workspace activity & notifications state
  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const loadWorkspaceActivity = useCallback(async () => {
    if (!firebaseUser) return;
    setIsLoadingActivity(true);
    try {
      const [enqList, quoteList, notifList] = await Promise.all([
        listCustomerEnquiries(firebaseUser.uid),
        listQuotesForCustomer(firebaseUser.uid),
        listUserNotifications(firebaseUser.uid),
      ]);
      setEnquiries(enqList);
      setQuotes(quoteList);
      setNotifications(notifList);
    } catch {
      // Non-fatal
    } finally {
      setIsLoadingActivity(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    void loadWorkspaceActivity();
  }, [loadWorkspaceActivity]);

  if (!userProfile) {
    return null;
  }

  const handleAvatarFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaveError(null);
    setSaveSuccess(null);
    setIsUploadingAvatar(true);
    try {
      const compressed = await processAndCompressAvatarImage(file);
      setPhotoPath(compressed);
      await updateUserProfile({
        photoPath: compressed,
      });
      setSaveSuccess('Your profile picture has been updated.');
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Could not upload profile picture.'
      );
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(null);
    setSaveError(null);

    const trimmedName = displayName.trim();
    if (
      trimmedName.length < USER_PROFILE_CONSTRAINTS.DISPLAY_NAME_MIN ||
      trimmedName.length > USER_PROFILE_CONSTRAINTS.DISPLAY_NAME_MAX
    ) {
      setSaveError(
        `Display name must be between ${USER_PROFILE_CONSTRAINTS.DISPLAY_NAME_MIN} and ${USER_PROFILE_CONSTRAINTS.DISPLAY_NAME_MAX} characters.`
      );
      return;
    }

    if (phone.trim().length > USER_PROFILE_CONSTRAINTS.PHONE_MAX) {
      setSaveError(
        `Phone number must be at most ${USER_PROFILE_CONSTRAINTS.PHONE_MAX} characters.`
      );
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile({
        displayName: trimmedName,
        phone: phone.trim() ? phone.trim() : null,
        photoPath: photoPath.trim() ? photoPath.trim() : null,
        preferredLocale,
        intendedRole,
      });
      setSaveSuccess('Your account settings have been saved.');
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Could not update your profile. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkNotificationRead = async (item: NotificationRecord) => {
    if (!firebaseUser || item.isRead) return;
    try {
      await markNotificationRead(firebaseUser.uid, item);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
    } catch {
      // Non-fatal
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!firebaseUser) return;
    try {
      await markAllUserNotificationsRead(firebaseUser.uid, notifications);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // Non-fatal
    }
  };

  const handleExportAccountData = () => {
    setIsExporting(true);
    try {
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        platform: 'EventLink (Warri & Effurun)',
        userProfile: {
          uid: userProfile.uid,
          email: userProfile.email,
          displayName: userProfile.displayName,
          phone: userProfile.phone || null,
          intendedRole: userProfile.intendedRole,
          accountStatus: userProfile.accountStatus,
          preferredLocale: userProfile.preferredLocale,
          preferredCurrency: 'NGN',
        },
        vendorOrganization: vendorOrganization
          ? {
              id: vendorOrganization.id,
              name: vendorOrganization.name,
              city: vendorOrganization.city,
              businessType: vendorOrganization.businessType,
            }
          : null,
        savedListingIds,
        compareListingIds,
        enquiries: enquiries.map((e) => ({
          id: e.id,
          listingId: e.listingId,
          listingName: e.listingName,
          subject: e.subject,
          eventType: e.eventType,
          eventDate: e.eventDate,
          guestCount: e.guestCount,
          budgetAmountMinor: e.budgetAmountMinor,
          status: e.status,
          vendorResponse: e.vendorResponse,
        })),
        quotes: quotes.map((q) => ({
          id: q.id,
          enquiryId: q.enquiryId,
          listingName: q.listingName,
          itemsSummary: q.itemsSummary,
          totalMinor: q.totalMinor,
          status: q.status,
        })),
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `eventlink-account-export-${userProfile.uid.slice(0, 8)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfirmDeletion = async () => {
    setIsDeleting(true);
    setSaveError(null);
    try {
      await requestAccountDeletion();
      setShowDeleteConfirm(false);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Could not submit account deletion request.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    navigate('/');
  };

  const unreadNotificationsCount = notifications.filter(
    (n) => !n.isRead
  ).length;

  return (
    <PageContainer className="py-8 sm:py-10 space-y-8">
      <PageHeading
        kicker={`Customer & Account Workspace · ${userProfile.displayName}`}
        title="My Workspace & Account Settings"
        description="Access your saved shortlist, side-by-side venue comparisons, sent enquiries, real-time notifications, and account preferences."
        actions={
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[10px] border border-[#D7DEE8] bg-white px-4 py-2 text-sm font-medium text-[#142B4A] hover:bg-[#F4F6F9] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        }
      />

      {/* Real Customer Activity Summary Cards (Derived Strictly from Firestore Records) */}
      <section
        aria-label="Customer marketplace activity summary"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <AppLink
          href="/saved"
          className="rounded-[14px] border border-[#D7DEE8] bg-white p-5 hover:border-[#4778D8] transition-colors flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#697586]">
              Saved Shortlist
            </span>
            <Bookmark className="h-4 w-4 text-[#4778D8]" aria-hidden="true" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#142B4A] tabular-nums">
              {savedListingIds.length}
            </p>
            <p className="text-xs text-[#4778D8] font-medium mt-1">
              View saved listings →
            </p>
          </div>
        </AppLink>

        <AppLink
          href="/compare"
          className="rounded-[14px] border border-[#D7DEE8] bg-white p-5 hover:border-[#4778D8] transition-colors flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#697586]">
              Venue Comparison
            </span>
            <GitCompareArrows
              className="h-4 w-4 text-[#4778D8]"
              aria-hidden="true"
            />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#142B4A] tabular-nums">
              {compareListingIds.length}{' '}
              <span className="text-sm font-normal text-[#697586]">/ 3</span>
            </p>
            <p className="text-xs text-[#4778D8] font-medium mt-1">
              Compare side by side →
            </p>
          </div>
        </AppLink>

        <AppLink
          href="/enquiries"
          className="rounded-[14px] border border-[#D7DEE8] bg-white p-5 hover:border-[#4778D8] transition-colors flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#697586]">
              Sent Enquiries
            </span>
            <MessageSquare
              className="h-4 w-4 text-[#4778D8]"
              aria-hidden="true"
            />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#142B4A] tabular-nums">
              {isLoadingActivity ? '…' : enquiries.length}
            </p>
            <p className="text-xs text-[#4778D8] font-medium mt-1">
              Track vendor replies →
            </p>
          </div>
        </AppLink>

        <AppLink
          href="/enquiries"
          className="rounded-[14px] border border-[#D7DEE8] bg-white p-5 hover:border-[#4778D8] transition-colors flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#697586]">
              Received Quotes
            </span>
            <FileText className="h-4 w-4 text-[#4778D8]" aria-hidden="true" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#142B4A] tabular-nums">
              {isLoadingActivity
                ? '…'
                : quotes.filter((q) => q.status !== 'draft').length}
            </p>
            <p className="text-xs text-[#4778D8] font-medium mt-1">
              Review NGN quotes →
            </p>
          </div>
        </AppLink>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Profile Form & Notifications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Real In-App Notifications Section */}
          <section
            aria-labelledby="notifications-heading"
            className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9EDF3] pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#4778D8]" aria-hidden="true" />
                <h2
                  id="notifications-heading"
                  className="text-base font-bold text-[#142B4A]"
                >
                  Notifications ({unreadNotificationsCount} unread)
                </h2>
              </div>

              {unreadNotificationsCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllNotificationsRead}
                  leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
                >
                  Mark all read
                </Button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-[#697586] py-2">
                No notifications yet. You will receive updates here when a
                vendor responds to an enquiry, sends a quote, or when a listing
                status changes.
              </p>
            ) : (
              <ul className="divide-y divide-[#E9EDF3] max-h-72 overflow-y-auto">
                {notifications.slice(0, 12).map((notif) => {
                  const targetHref =
                    notif.entityType === 'enquiry' ||
                    notif.entityType === 'quote'
                      ? '/enquiries'
                      : notif.entityType === 'listing'
                      ? '/vendor'
                      : '/account';

                  return (
                    <li
                      key={notif.id}
                      className={`py-3 px-2 rounded-[8px] flex items-start justify-between gap-3 text-xs ${
                        notif.isRead ? 'text-[#475467]' : 'bg-[#EFF8FF]/70 text-[#172B4D]'
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="font-semibold text-[#142B4A]">
                          {notif.title}
                        </p>
                        <p className="text-[#344054]">{notif.body}</p>
                        <div className="flex items-center gap-3 pt-0.5">
                          <AppLink
                            href={targetHref}
                            onClick={() => handleMarkNotificationRead(notif)}
                            className="font-semibold text-[#4778D8] hover:underline"
                          >
                            Open details →
                          </AppLink>
                          {!notif.isRead && (
                            <button
                              type="button"
                              onClick={() => handleMarkNotificationRead(notif)}
                              className="text-[#697586] hover:text-[#142B4A] cursor-pointer"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                      {!notif.isRead && (
                        <span
                          className="h-2 w-2 rounded-full bg-[#4778D8] shrink-0 mt-1.5"
                          aria-label="Unread notification"
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Profile Settings Form */}
          <div className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-[#142B4A] mb-1">
              Profile information
            </h2>
            <p className="text-sm text-[#697586] mb-6">
              Your email and private phone number are kept confidential and are
              not publicly listed.
            </p>

            {saveSuccess && (
              <div
                role="status"
                className="mb-6 flex items-center gap-2.5 rounded-[10px] bg-[#EAF7F0] px-4 py-3 text-sm text-[#16794B]"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{saveSuccess}</span>
              </div>
            )}

            {saveError && (
              <div
                role="alert"
                className="mb-6 flex items-center gap-2.5 rounded-[10px] bg-[#FEF3F2] px-4 py-3 text-sm text-[#B42318]"
              >
                <AlertTriangle
                  className="h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Profile Picture Uploader */}
              <div className="rounded-[12px] border border-[#D7DEE8] bg-[#F4F6F9]/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {photoPath ? (
                    <img
                      src={photoPath}
                      alt={userProfile.displayName}
                      referrerPolicy="no-referrer"
                      className="h-14 w-14 rounded-full object-cover border-2 border-[#4778D8] bg-white shrink-0"
                    />
                  ) : (
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#142B4A] text-white font-bold text-base shrink-0">
                      {(userProfile.displayName || 'U')[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-[#142B4A]">
                      Profile picture
                    </p>
                    <p className="text-xs text-[#697586]">
                      Displayed in the top-right navigation bar above your name.
                    </p>
                  </div>
                </div>

                <label
                  htmlFor="account-avatar-upload"
                  className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-[10px] border border-[#D7DEE8] bg-white px-3.5 py-2 text-xs font-semibold text-[#142B4A] hover:bg-[#F4F6F9] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Upload className="h-3.5 w-3.5 text-[#4778D8]" aria-hidden="true" />
                  <span>
                    {isUploadingAvatar
                      ? 'Uploading…'
                      : photoPath
                      ? 'Change profile photo'
                      : 'Upload profile photo'}
                  </span>
                  <input
                    id="account-avatar-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarFileChange}
                    disabled={isUploadingAvatar}
                    className="sr-only"
                  />
                </label>
              </div>

              <div>
                <label
                  htmlFor="account-email"
                  className="block text-sm font-medium text-[#172B4D] mb-1.5"
                >
                  Verified email address
                </label>
                <input
                  id="account-email"
                  type="email"
                  value={userProfile.email}
                  disabled
                  className="w-full min-h-[44px] rounded-[10px] border border-[#D7DEE8] bg-[#F4F6F9] px-3.5 py-2 text-sm text-[#697586] cursor-not-allowed"
                />
                <p className="text-xs text-[#697586] mt-1">
                  Managed by your Google authentication identity.
                </p>
              </div>

              <div>
                <label
                  htmlFor="account-display-name"
                  className="block text-sm font-medium text-[#172B4D] mb-1.5"
                >
                  Full name or display name{' '}
                  <span className="text-[#B42318]">(Required)</span>
                </label>
                <input
                  id="account-display-name"
                  type="text"
                  required
                  maxLength={USER_PROFILE_CONSTRAINTS.DISPLAY_NAME_MAX}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full min-h-[44px] rounded-[10px] border border-[#D7DEE8] bg-white px-3.5 py-2 text-base text-[#172B4D] focus:border-[#4778D8] outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="account-phone"
                  className="block text-sm font-medium text-[#172B4D] mb-1.5"
                >
                  Phone number (Optional)
                </label>
                <input
                  id="account-phone"
                  type="tel"
                  maxLength={USER_PROFILE_CONSTRAINTS.PHONE_MAX}
                  placeholder="e.g. +234 803 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full min-h-[44px] rounded-[10px] border border-[#D7DEE8] bg-white px-3.5 py-2 text-base text-[#172B4D] focus:border-[#4778D8] outline-none"
                />
                <p className="text-xs text-[#697586] mt-1">
                  Used only when you choose phone or WhatsApp as your enquiry
                  preference.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="account-role-mode"
                    className="block text-sm font-medium text-[#172B4D] mb-1.5"
                  >
                    Active account capabilities
                  </label>
                  <select
                    id="account-role-mode"
                    value={intendedRole}
                    onChange={(e) =>
                      setIntendedRole(e.target.value as IntendedRole)
                    }
                    className="w-full min-h-[44px] rounded-[10px] border border-[#D7DEE8] bg-white px-3.5 py-2 text-sm text-[#172B4D] focus:border-[#4778D8] outline-none"
                  >
                    <option value="customer">Customer (Event organizer)</option>
                    <option value="vendor">
                      Vendor (Venue / Service provider)
                    </option>
                    <option value="both">Both Customer &amp; Vendor</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="account-locale"
                    className="block text-sm font-medium text-[#172B4D] mb-1.5"
                  >
                    Regional formatting
                  </label>
                  <select
                    id="account-locale"
                    value={preferredLocale}
                    onChange={(e) =>
                      setPreferredLocale(
                        e.target.value as 'en-NG' | 'en-GB' | 'en-US'
                      )
                    }
                    className="w-full min-h-[44px] rounded-[10px] border border-[#D7DEE8] bg-white px-3.5 py-2 text-sm text-[#172B4D] focus:border-[#4778D8] outline-none"
                  >
                    <option value="en-NG">Nigeria (en-NG · ₦ NGN)</option>
                    <option value="en-GB">United Kingdom (en-GB)</option>
                    <option value="en-US">United States (en-US)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#142B4A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1c3a63] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isSaving ? 'Saving changes…' : 'Save account settings'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Role Status, Data Export & Account Deletion */}
        <div className="space-y-6">
          <div className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#142B4A]">
              <User className="h-4 w-4 text-[#4778D8]" aria-hidden="true" />
              <span>Workspace access</span>
            </div>

            <div className="space-y-3 text-sm text-[#344054]">
              <div className="flex items-center justify-between py-1.5 border-b border-[#E9EDF3]">
                <span>Account status</span>
                <span className="font-medium text-[#16794B]">
                  {userProfile.accountStatus}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#E9EDF3]">
                <span>Customer tools</span>
                <span className="font-medium text-[#172B4D]">Enabled</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#E9EDF3]">
                <span>Vendor workspace</span>
                <span className="font-medium text-[#172B4D]">
                  {userProfile.intendedRole === 'vendor' ||
                  userProfile.intendedRole === 'both' ||
                  vendorOrganization
                    ? 'Enabled'
                    : 'Not activated'}
                </span>
              </div>
              {isAdmin && (
                <div className="flex items-center justify-between py-1.5 border-b border-[#E9EDF3]">
                  <span className="flex items-center gap-1.5">
                    <Shield
                      className="h-3.5 w-3.5 text-[#4778D8]"
                      aria-hidden="true"
                    />
                    Platform admin
                  </span>
                  <span className="font-semibold text-[#142B4A]">
                    Authorized
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 space-y-2.5">
              {(userProfile.intendedRole === 'vendor' ||
                userProfile.intendedRole === 'both' ||
                vendorOrganization) && (
                <AppLink
                  href="/vendor"
                  className="w-full inline-flex min-h-[42px] items-center justify-between rounded-[10px] border border-[#D7DEE8] bg-[#F4F6F9] px-4 py-2 text-sm font-medium text-[#142B4A] hover:border-[#4778D8] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Building2
                      className="h-4 w-4 text-[#4778D8]"
                      aria-hidden="true"
                    />
                    Open vendor workspace
                  </span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </AppLink>
              )}

              {isAdmin && (
                <AppLink
                  href="/admin"
                  className="w-full inline-flex min-h-[42px] items-center justify-between rounded-[10px] border border-[#D7DEE8] bg-[#F4F6F9] px-4 py-2 text-sm font-medium text-[#142B4A] hover:border-[#4778D8] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Shield
                      className="h-4 w-4 text-[#4778D8]"
                      aria-hidden="true"
                    />
                    Open admin moderation
                  </span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </AppLink>
              )}
            </div>
          </div>

          {/* Privacy Data Export & Account Deletion (Build_Plan.md Phase 9) */}
          <div className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4">
            <h3 className="text-base font-semibold text-[#142B4A]">
              Privacy, data export &amp; account closure
            </h3>
            <p className="text-xs text-[#344054] leading-relaxed">
              You can export a machine-readable JSON copy of your profile,
              saved shortlist, sent enquiries, and received quotes at any time.
            </p>

            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportAccountData}
                isLoading={isExporting}
                leftIcon={<Download className="h-3.5 w-3.5 text-[#4778D8]" />}
              >
                Download My Account Data (JSON)
              </Button>
            </div>

            <div className="border-t border-[#E9EDF3] pt-4 space-y-3">
              <p className="text-xs text-[#344054] leading-relaxed">
                Requesting account deletion marks your profile as pending
                deletion and disables new enquiries or listing changes.
              </p>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-[10px] border border-[#D7DEE8] bg-white px-3.5 py-2 text-xs font-medium text-[#B42318] hover:bg-[#FEF3F2] transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Request account deletion
                </button>
              ) : (
                <div
                  role="alertdialog"
                  aria-labelledby="delete-confirm-title"
                  className="rounded-[10px] border border-[#B42318]/30 bg-[#FEF3F2] p-4 space-y-3"
                >
                  <p
                    id="delete-confirm-title"
                    className="text-xs font-semibold text-[#B42318]"
                  >
                    Confirm account deletion request?
                  </p>
                  <p className="text-xs text-[#344054]">
                    This will immediately restrict protected actions on your
                    account.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleConfirmDeletion}
                      className="inline-flex min-h-[38px] items-center justify-center rounded-[8px] bg-[#B42318] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#912018] disabled:opacity-60 cursor-pointer"
                    >
                      {isDeleting ? 'Submitting…' : 'Confirm request'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="inline-flex min-h-[38px] items-center justify-center rounded-[8px] border border-[#D7DEE8] bg-white px-3 py-1.5 text-xs font-medium text-[#172B4D] hover:bg-[#F4F6F9] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
