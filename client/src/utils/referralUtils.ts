// Referral utility functions
export const REFERRAL_STORAGE_KEY = "Your-Drive_referral_code";

/**
 * Store referral code in localStorage
 */
export const storeReferralCode = (referralCode: string): void => {
  try {
    localStorage.setItem(REFERRAL_STORAGE_KEY, referralCode);
  } catch (error) {
    console.error("Failed to store referral code:", error);
  }
};

/**
 * Get referral code from localStorage
 */
export const getReferralCode = (): string | null => {
  try {
    return localStorage.getItem(REFERRAL_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to get referral code:", error);
    return null;
  }
};

/**
 * Clear referral code from localStorage
 */
export const clearReferralCode = (): void => {
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear referral code:", error);
  }
};

/**
 * Extract referral code from URL parameters
 */
export const extractReferralFromURL = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("ref");
};

/**
 * Initialize referral system - check URL for referral code and store it
 */
export const initializeReferralSystem = (): void => {
  const urlReferralCode = extractReferralFromURL();
  if (urlReferralCode) {
    storeReferralCode(urlReferralCode);
    // Clean up URL by removing the ref parameter
    const url = new URL(window.location.href);
    url.searchParams.delete("ref");
    window.history.replaceState({}, "", url.toString());
  }
};

/**
 * Generate referral link for a user
 */
export const generateReferralLink = (referralCode: string): string => {
  return `${window.location.origin}?ref=${referralCode}`;
};
