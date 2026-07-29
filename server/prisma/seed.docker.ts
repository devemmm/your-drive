import bcrypt from 'bcryptjs';
import { PrismaClient, CouponTarget, FeeType, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

function generateReferralCode(): string {
  return 'ADM' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function main() {
  // Seed default admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@yourdrive.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
  const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';
  const adminLastName = process.env.ADMIN_LAST_NAME || 'User';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        firstName: adminFirstName,
        lastName: adminLastName,
        role: UserRole.ADMIN,
        isVerified: true,
        isEmailVerified: true,
        isOnboarded: true,
        termsAccepted: true,
        referralCode: generateReferralCode(),
      },
    });
    console.log(`✅ Admin user seeded: ${adminEmail}`);
  } else {
    console.log(`ℹ️ Admin user already exists: ${adminEmail}`);
  }

  // Seed coupon redemption rules
  const defaults = [
    { target: CouponTarget.RIDE_BOOKING, requiredCoupons: 5, description: '5 coupons = 1 free ride booking' },
    { target: CouponTarget.RIDE_POSTING, requiredCoupons: 5, description: '5 coupons = 1 free ride posting' },
    { target: CouponTarget.DRIVER_SUBSCRIPTION, requiredCoupons: 20, description: '20 coupons = 1 month Driver subscription' },
    { target: CouponTarget.PASSENGER_SUBSCRIPTION, requiredCoupons: 20, description: '20 coupons = 1 month Passenger subscription' },
    { target: CouponTarget.BOTH_SUBSCRIPTION, requiredCoupons: 40, description: '40 coupons = 1 month both subscriptions' },
  ];

  for (const rule of defaults) {
    await prisma.couponRedemptionRule.upsert({
      where: { target: rule.target },
      update: {},
      create: rule,
    });
  }

  console.log('✅ Coupon rules seeded.');

  // Seed commission settings
  const comm = await prisma.commissionSettings.findFirst();
  if (!comm) {
    await prisma.commissionSettings.create({ data: {} });
    console.log('✅ Created commission entry');
  }

  // Seed default platform fee
  const defaultFee = await prisma.feeSetting.findFirst({
    where: { type: FeeType.DEFAULT_PLATFORM_FEE, active: true },
  });
  if (!defaultFee) {
    await prisma.feeSetting.create({
      data: { type: FeeType.DEFAULT_PLATFORM_FEE, amount: 1 },
    });
    console.log('✅ Created default platform fee');
  }

  // Seed D2D settings
  await prisma.d2DSetting.upsert({
    where: { id: 1 },
    update: {},
    create: { maxPricePerExtraKm: 1, maxRadiusKm: 25 },
  });
  console.log('✅ D2D settings seeded');

  // Seed default WalletSettings (schema defaults: 500000 cents limit, enforce=false)
  await prisma.walletSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {},
  });
  console.log('✅ WalletSettings seeded');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
