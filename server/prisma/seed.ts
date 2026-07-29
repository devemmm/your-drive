import moment from 'moment';
import bcrypt from 'bcryptjs';
import { logger } from '../src/utils/logger';
import { NotificationServices } from '../src/services/notification.service';
import {
  PrismaClient,
  CouponTarget,
  FeeType,
  RideType,
  BookingStatus,
  D2DBookingRequestStatus,
  UserRole,
} from "@prisma/client";
import { CouponService } from '../src/services/coupon.service';
import { stripe } from '../src/config/stripe';

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
  const defaults = [
    {
      target: CouponTarget.RIDE_BOOKING,
      requiredCoupons: 5,
      description: "5 coupons = 1 free ride booking",
    },
    {
      target: CouponTarget.RIDE_POSTING,
      requiredCoupons: 5,
      description: "5 coupons = 1 free ride posting (if needed)",
    },
    {
      target: CouponTarget.DRIVER_SUBSCRIPTION,
      requiredCoupons: 20,
      description: "20 coupons = 1 month of Posting(Driver) subscription",
    },
    {
      target: CouponTarget.PASSENGER_SUBSCRIPTION,
      requiredCoupons: 20,
      description: "20 coupons = 1 month of Booking(Passenger) subscription",
    },
    {
      target: CouponTarget.BOTH_SUBSCRIPTION,
      requiredCoupons: 40,
      description:
        "40 coupons = 1 month of both Posting & Booking(Driver & Passenger) subscription",
    },
  ];

  const initialRates = [
    {
      provinceCode: "QC",
      provinceName: "Quebec",
      gst: 0.05,
      pst: null,
      qst: 0.09975,
      hst: null,
    },
    {
      provinceCode: "ON",
      provinceName: "Ontario",
      gst: null,
      pst: null,
      qst: null,
      hst: 0.13,
    },
    {
      provinceCode: "BC",
      provinceName: "British Columbia",
      gst: 0.05,
      pst: 0.07,
      qst: null,
      hst: null,
    },
    {
      provinceCode: "AB",
      provinceName: "Alberta",
      gst: 0.05,
      pst: null,
      qst: null,
      hst: null,
    },
    {
      provinceCode: "MB",
      provinceName: "Manitoba",
      gst: 0.05,
      pst: 0.07,
      qst: null,
      hst: null,
    },
    {
      provinceCode: "SK",
      provinceName: "Saskatchewan",
      gst: 0.05,
      pst: 0.06,
      qst: null,
      hst: null,
    },
    {
      provinceCode: "NB",
      provinceName: "New Brunswick",
      gst: null,
      pst: null,
      qst: null,
      hst: 0.15,
    },
    {
      provinceCode: "NS",
      provinceName: "Nova Scotia",
      gst: null,
      pst: null,
      qst: null,
      hst: 0.15,
    },
    {
      provinceCode: "PE",
      provinceName: "Prince Edward Island",
      gst: null,
      pst: null,
      qst: null,
      hst: 0.15,
    },
    {
      provinceCode: "NL",
      provinceName: "Newfoundland and Labrador",
      gst: null,
      pst: null,
      qst: null,
      hst: 0.15,
    },
    {
      provinceCode: "NT",
      provinceName: "Northwest Territories",
      gst: 0.05,
      pst: null,
      qst: null,
      hst: null,
    },
    {
      provinceCode: "YT",
      provinceName: "Yukon",
      gst: 0.05,
      pst: null,
      qst: null,
      hst: null,
    },
    {
      provinceCode: "NU",
      provinceName: "Nunavut",
      gst: 0.05,
      pst: null,
      qst: null,
      hst: null,
    },
  ];

  for (const rule of defaults) {
    await prisma.couponRedemptionRule.upsert({
      where: {
        target: rule.target,
      },
      update: {},
      create: rule,
    });
  }

  for (const rate of initialRates) {
    await prisma.taxRate.upsert({
      where: { provinceCode: rate.provinceCode },
      update: {},
      create: rate,
    });
  }

  console.log("✅ Reward rules and Tax rates seeded.");

  const users = await prisma.user.findMany({
    where: { licenseImageId: { not: null }, licenseImages: null },
    select: { id: true, licenseImageId: true },
  });

  for (const user of users) {
    await prisma.licenseImages.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        frontImageId: user.licenseImageId!, // old image becomes front by default
      },
      update: {},
    });
  }

  console.log(`✅ Migrated ${users.length} users to LicenseImages`);

  const comm = await prisma.commissionSettings.findFirst();
  if (!comm) {
    await prisma.commissionSettings.create({
      data: {},
    });
    console.log(`✅ Created the commission entry`);
  }

  const defaultFee = await prisma.feeSetting.findFirst({
    where: { type: FeeType.DEFAULT_PLATFORM_FEE, active: true },
  });
  if (!defaultFee) {
    await prisma.feeSetting.create({
      data: {
        type: FeeType.DEFAULT_PLATFORM_FEE,
        amount: 1,
      },
    });
    console.log(`✅ Created the default platform fee entry`);
  }

  // // update d2d type in rides
  // const rides = await prisma.ride.findMany({
  //   where: { isDoorToDoor: true, type: RideType.P2P },
  // });

  // if(rides.length){
  //   const rideIds = rides.map(r=> r.id);
  //   await prisma.ride.updateMany({
  //     where: { id: { in: rideIds}},
  //     data: {
  //       type: RideType.D2D,
  //     }
  //   });
  //   console.log(`✅ updated ${rideIds.length} rides to D2D type`);
  // }

  // seed d2d settings
  await prisma.d2DSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      maxPricePerExtraKm: 1,
      maxRadiusKm: 25,
    }
  })
  console.log(`✅ seeded the d2d setting`);

  // Ensure a single WalletSettings row exists.
  const existingWalletSettings = await prisma.walletSettings.findFirst();
  if (!existingWalletSettings) {
    await prisma.walletSettings.create({
      data: {
        defaultDebtLimitCents: 500000,
        enforceDebtLimit: false,
      },
    });
    console.log("✅ Seeded WalletSettings (enforceDebtLimit=false)");
  } else {
    console.log("ℹ️ WalletSettings already present");
  }

  // expire old rides which has no approved bookings or confirmed bookings and their respective bookings
  const cutoff = moment().add(1, "minute").toDate();
  const oldRides = await prisma.ride.findMany({
    where: {
      departureTime: { lte: cutoff },
      OR: [
        {
          type: RideType.P2P,
          bookings: {
            none: {
              status: { in: ["APPROVED", "COMPLETED", "DISPUTED"] },
            }
          }
        },
        {
          type: RideType.D2D,
          d2dBookingRequests: {
            none: {
              status: { in: ["CONFIRMED", "COMPLETED", "DISPUTED"] },
            }
          }
        }
      ]

    },
    include: {
      bookings: {
        where: { status: { notIn: [BookingStatus.EXPIRED, BookingStatus.CANCELLED, BookingStatus.DECLINED] } },
        include: { booker: true, paymentTransaction: true, redeemedCoupns: true },
      },
      d2dBookingRequests: {
        where: { status: { notIn: [D2DBookingRequestStatus.EXPIRED, D2DBookingRequestStatus.CANCELED, D2DBookingRequestStatus.DECLINED] } },
        include: { passenger: true, transaction: true, redeemedCoupns: true },
      },
      driver: true,
      departureLocation: true,
      destinationLocation: true,
    },
  });
  for (const ride of oldRides) {
    await prisma.ride.update({
      where: { id: ride.id },
      data: {
        status: "EXPIRED",

      },
    });
    const formatedDepTime = new Date(ride.departureTime).toLocaleString("en-CA", {
      timeZone: "UTC",
    });

    for (const booking of ride.bookings) {
      try {
        const tx = booking.paymentTransaction;
        if (tx) {
          // Refund on Stripe if payment was captured or held
          if (tx.status === "ONHOLD" && tx.externalReference) {
            await stripe.paymentIntents.cancel(tx.externalReference);
            await prisma.transaction.update({
              where: { id: tx.id },
              data: { status: "CANCELLED" },
            });
          } else if (
            tx.status === "PAID" &&
            tx.externalReference &&
            tx.paymentProvider === "STRIPE"
          ) {
            // Create refund on Stripe
            await stripe.refunds.create({ payment_intent: tx.externalReference });
            await prisma.transaction.update({
              where: { id: tx.id },
              data: {
                isRefunded: true,
                refundedAmount: tx.amount,
                refundedAt: new Date(),
                status: "REFUNDED",
              },
            });
          }
        }

        // Expire the booking
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.EXPIRED,
            expiredAt: new Date(),
            reason: "Ride expired due to no confirmed bookings | Trajet expiré car il n'y avait pas de réservations confirmées avant l'heure de départ.",
          },

        });

        const existSeats = await prisma.bookingSeat.findMany({ where: { bookingId: booking.id, isExpired: false } });
        if (existSeats.length) {
          await prisma.bookingSeat.updateMany({
            where: { id: { in: existSeats.map(e => e.id) } },
            data: {
              isExpired: true,
              expireReason: "Ride expired due to no confirmed bookings | Trajet expiré car il n'y avait pas de réservations confirmées avant l'heure de départ.",
              expiredAt: new Date(),
            },
          })
        }

        // refund the coupons if applicable
        if (
          booking.redeemedCoupns.length
        ) {
          await CouponService.refundCoupons(booking.redeemedCoupns);
        }

        // Notify booker about cancellation
        await NotificationServices.notifyUsers({
          userIds: [booking.userId],
          titleEn: "Booking Expired",
          titleFr: "Réservation Expirée",
          messageEn: `Your booking for the ride from ${ride.departureLocation.city
            }, ${ride.departureLocation.regionCode
              ? `, ${ride.departureLocation.regionCode}`
              : ""
            } to ${ride.destinationLocation.city}, ${ride.destinationLocation.regionCode
              ? `, ${ride.destinationLocation.regionCode}`
              : ""
            } has expired because the ride did not have confirmed bookings before departure time, ${formatedDepTime}. If you already made a payment, it has been refunded. Thank you for using our service.`,
          messageFr: `Votre réservation pour le trajet de ${ride.departureLocation.city}${ride.departureLocation.regionCode ? `, ${ride.departureLocation.regionCode}` : ""} à ${ride.destinationLocation.city}${ride.destinationLocation.regionCode ? `, ${ride.destinationLocation.regionCode}` : ""} a expiré parce que le trajet n'avait pas de réservations confirmées avant l'heure de départ, ${formatedDepTime}. Si vous avez déjà effectué un paiement, il a été remboursé. Merci d'utiliser notre service.`,
          rideId: ride.id,
        });
      } catch (err) {
        logger.error("Error cancelling unapproved booking", {
          bookingId: booking.id,
          err,
        });
      }
    }
    for (const request of ride.d2dBookingRequests) {
      try {
        const tx = request.transaction;
        if (tx) {
          if (tx.status === "ONHOLD" && tx.externalReference) {
            await stripe.paymentIntents.cancel(tx.externalReference);
            await prisma.transaction.update({
              where: { id: tx.id },
              data: { status: "CANCELLED" },
            });
          } else if (
            tx.status === "PAID" &&
            tx.externalReference &&
            tx.paymentProvider === "STRIPE"
          ) {
            await stripe.refunds.create({
              payment_intent: tx.externalReference,
            });
            await prisma.transaction.update({
              where: { id: tx.id },
              data: {
                isRefunded: true,
                refundedAmount: tx.amount,
                refundedAt: new Date(),
                status: "REFUNDED",
              },
            });
          }
        }

        // Expire the d2d booking request
        await prisma.d2DBookingRequest.update({
          where: { id: request.id },
          data: {
            status: D2DBookingRequestStatus.EXPIRED,
            expiredAt: new Date(),
            reason: "Ride expired due to no confirmed bookings | Trajet expiré car il n'y avait pas de réservations confirmées avant l'heure de départ.",
          },
        });
        const existSeat = await prisma.bookingSeat.findUnique({ where: { d2dBookingId: request.id, isExpired: false } });
        if (existSeat) {
          await prisma.bookingSeat.update({
            where: { id: existSeat.id },
            data: {
              isExpired: true,
              expireReason: "Ride expired due to no confirmed bookings | Trajet expiré car il n'y avait pas de réservations confirmées avant l'heure de départ.",
              expiredAt: new Date(),
            },
          })
        }
        // refund the coupons if applicable
        if (
          request.redeemedCoupns.length
        ) {
          await CouponService.refundCoupons(request.redeemedCoupns);
        }

        // Notify passenger about cancellation
        await NotificationServices.notifyUsers({
          userIds: [request.passengerId],
          titleEn: "Booking Expired",
          titleFr: "Réservation Expirée",
          messageEn: `Your booking for the ride from ${ride.departureLocation.city
            }, ${ride.departureLocation.regionCode
              ? `, ${ride.departureLocation.regionCode}`
              : ""
            } to ${ride.destinationLocation.city}, ${ride.destinationLocation.regionCode
              ? `, ${ride.destinationLocation.regionCode}`
              : ""
            } has expired because the ride did not have confirmed bookings before departure time, ${formatedDepTime}. If you already made a payment, it has been refunded. Thank you for using our service.`,
          messageFr: `Votre réservation pour le trajet de ${ride.departureLocation.city}${ride.departureLocation.regionCode ? `, ${ride.departureLocation.regionCode}` : ""} à ${ride.destinationLocation.city}${ride.destinationLocation.regionCode ? `, ${ride.destinationLocation.regionCode}` : ""} a expiré parce que le trajet n'avait pas de réservations confirmées avant l'heure de départ, ${formatedDepTime}. Si vous avez déjà effectué un paiement, il a été remboursé. Merci d'utiliser notre service.`,
          rideId: ride.id,
        });
      } catch (err) {
        console.log(err);
        console.log(request);
        logger.error("Error cancelling unapproved d2d request", {
          requestId: request.id,
          err,
        });
      }
    }
  }
}

main()
  .catch((e) => {
    console.error("❌ Error seeding", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
