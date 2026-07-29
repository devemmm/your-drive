interface FeeSplitResult {
  platformNet: number; // amount platform keeps after its fee share
  driverNet: number;   // amount to transfer to driver after fee share
  platformFeeShare: number,
  driverFeeShare: number,
}

/**
 * Calculate how much the platform keeps and how much the driver gets after splitting Stripe fees proportionally.
 * @param totalAmount - total charge amount (in cents)
 * @param platformAmount - platform's portion (in cents)
 * @param stripeFee - Stripe fee on total amount (in cents)
 * @returns platformNet and driverNet, platformFeeShare, driverFeeShare amounts (in cents)
 */
export function splitStripeFeeProportionally(
  totalAmount: number,
  platformAmount: number,
  stripeFee: number
): FeeSplitResult {
//   if (totalAmount <= 0) {
//     throw new Error('Total amount must be greater than zero');
//   }
//   if (platformAmount < 0 || platformAmount > totalAmount) {
//     throw new Error('Platform amount must be between 0 and total amount');
//   }

  const driverAmount = totalAmount - platformAmount;

  // Proportion of platform and driver
  const platformShare = platformAmount / totalAmount;
//   const driverShare = driverAmount / totalAmount;

  // Calculate fee split
  const platformFeeShare = Math.round(stripeFee * platformShare);
  const driverFeeShare = stripeFee - platformFeeShare; // remainder to driver

  return {
    platformNet: platformAmount - platformFeeShare,
    driverNet: driverAmount - driverFeeShare,
    platformFeeShare,
    driverFeeShare,
  };
}
