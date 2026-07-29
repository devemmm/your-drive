import { prisma } from "../config/database";
import { DbUser } from "../types/index";
import { stripe } from "../config/stripe";
import {
  Booking,
  D2DBookingRequest,
  Location,
  Ride,
  Transaction,
  TransactionStatus,
  User,
} from "@prisma/client";
import { logger } from "../utils/logger";
import { NotificationServices } from "./notification.service";
import { getDefaultCurrency } from "../utils/currency";

export class TransactionService {
  static async getOrCreateStripeCustomer(user: DbUser): Promise<string | null> {
    // If Stripe isn't configured yet, skip gracefully. Callers should handle
    // a null return by falling back to direct/cash payment collection.
    if (!stripe) {
      logger.warn("[Stripe] Not configured, skipping customer creation");
      return null;
    }

    let customerId = user.stripeCustomerId;
    if (customerId) return customerId;

    // Create new Stripe customer if missing
    const name = String(
      user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName
    );
    const customer = await stripe.customers.create({
      name,
      email: user.email,
      metadata: { userId: user.id.toString() },
    });

    // Save to DB
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customer.id },
    });

    logger.info(
      `[Stripe] Created new customer in Stripe (ID: ${customer.id}) for user ${user.id}.`
    );

    return customer.id;
  }

  static async cancelOrRefundTransaction(
    txn: Transaction,
    action: "REFUND" | "CANCEL"
  ) {
    try {
      if (txn.externalReference) {
        switch (action) {
          case "REFUND": {
            if (txn.status === TransactionStatus.PAID) {
              // Refund the transaction
              await stripe.refunds.create({
                payment_intent: txn.externalReference,
              });

              const refunded = await prisma.transaction.update({
                where: { id: txn.id },
                data: {
                  status: TransactionStatus.REFUNDED,
                  refundedAmount: txn.amount,
                  refundedAt: new Date(),
                  isRefunded: true,
                },
              });

              return refunded;
            } else if (txn.status === TransactionStatus.PARTIALLY_REFUNDED) {
              // Refund the remaining amount
              const refundAmount = txn.amount - txn.refundedAmount;
              if (refundAmount > 0) {
                await stripe.refunds.create({
                  payment_intent: txn.externalReference,
                  amount: Math.floor(refundAmount * 100),
                });
              }
              await prisma.transaction.update({
                where: { id: txn.id },
                data: {
                  status: TransactionStatus.REFUNDED,
                  refundedAmount: txn.amount,
                  refundedAt: new Date(),
                  isRefunded: true,
                },
              });
            }
            break;
          }
          default:
            // Cancel the transaction
            await stripe.paymentIntents.cancel(txn.externalReference);
            await prisma.transaction.update({
              where: { id: txn.id },
              data: {
                status: TransactionStatus.CANCELLED,
              },
            });
            break;
        }
      }
    } catch (error) {
      logger.error(`Transaction ${action.toLowerCase()} error`, error);
    }
  }

  /**
   * Called right after PaymentIntent capture (transaction becomes PAID).
   * Creates:
   *  - updated TX values (gross/net/stripe fee)
   *  - passenger receipt
   *  - email receipt
   */
  static async captureStripeFunds(data: {
    paymentIntentId: string;
    txn: Transaction & {
      user: User;
      booking: Booking | null;
      d2dBookingReq: D2DBookingRequest | null;
    };
    ride: Ride & {
      driver: User;
      departureLocation: Location;
      destinationLocation: Location;
    }
  }) {
    const { paymentIntentId, txn, ride } = data;

    // ---- Idempotency guard ----
    if (txn.status === TransactionStatus.PAID) {
      logger.info("Transaction already captured, skipping", {
        txId: txn.id,
        paymentIntentId,
      });
      return txn;
    }

    // ---- 1. Capture PaymentIntent ----
    const paymentIntent = await stripe.paymentIntents.capture(
      paymentIntentId,
      { idempotencyKey: `capture_tx_${txn.id}` }
    );

    const receivedAmount =
      (paymentIntent.amount_received ??
        paymentIntent.amount ??
        Math.round(txn.amount * 100)) / 100;

    // ---- 2. Extract Stripe fee (best effort) ----
    let stripeFee = 0;
    let stripeNet = receivedAmount;
    let chargeId: string | null = null;

    try {
      chargeId =
        typeof paymentIntent.latest_charge === "string"
          ? paymentIntent.latest_charge
          : paymentIntent.latest_charge?.id ?? null;

      if (chargeId) {
        const charge = await stripe.charges.retrieve(chargeId, {
          expand: ["balance_transaction"],
        });

        const bt =
          typeof charge.balance_transaction === "string"
            ? await stripe.balanceTransactions.retrieve(
              charge.balance_transaction
            )
            : charge.balance_transaction;

        stripeFee = (bt?.fee ?? 0) / 100;
        stripeNet = (bt?.net ?? charge.amount_captured ?? 0) / 100;
      }
    } catch (err) {
      logger.warn("Failed to fetch Stripe balance transaction", {
        err,
        txId: txn.id,
      });
    }

    // ---- 3. Tax handling ----
    // Tax was removed from the data model — taxAmount is always 0.
    let taxAmount = 0;

    // ---- 4. Apply FULL Stripe fee to driver payout ----
    const driverGross = txn.driverAmount;
    const driverNet = Math.max(driverGross - stripeFee, 0);

    // ---- 5. Update transaction ----
    const updatedTx = await prisma.transaction.update({
      where: { id: txn.id },
      data: {
        status: TransactionStatus.PAID,
        externalReference: paymentIntent.id,
        stripeChargeId: chargeId ?? undefined,

        grossReceivedAmount: receivedAmount,
        netReceivedAmount: stripeNet,

        driverStripeFee: stripeFee,
        driverNetAmountPaid: driverNet,

        transactionDate: new Date(),
      },
    });

    // ---- 7. Driver payout (Stripe Transfer) ----
    if (
      updatedTx.status === TransactionStatus.PAID &&
      !updatedTx.isDriverPaid &&
      updatedTx.driverNetAmountPaid &&
      updatedTx.driverNetAmountPaid > 0
    ) {

      const driver = ride.driver;

      if (!driver?.stripeAccountId) {
        logger.warn("Driver has no connected Stripe account, manual payout required", {
          driverId: ride.driverId,
          txId: updatedTx.id,
        });

        // await prisma.transaction.update({
        //   where: { id: updatedTx.id },
        //   data: {
        //     payoutRequiresManual: true,
        //   },
        // });
      } else {
        try {
          const transfer = await stripe.transfers.create(
            {
              amount: Math.round(updatedTx.driverNetAmountPaid * 100),
              currency: (updatedTx.currency || getDefaultCurrency()).toLowerCase(),
              destination: driver.stripeAccountId,
              transfer_group: `ride_${ride.id}`,
              source_transaction: updatedTx.stripeChargeId ?? undefined,
              metadata: {
                transactionId: String(updatedTx.id),
                systemTransactionId: updatedTx.transactionId!,
                rideId: String(ride.id),
                bookingId: String(txn.booking?.id || txn.d2dBookingReq?.id),
              },
            },
            {
              idempotencyKey: `driver_transfer_tx_${updatedTx.id}`,
            }
          );

          // Update transaction payout info
          await prisma.transaction.update({
            where: { id: updatedTx.id },
            data: {
              isDriverPaid: true,
              stripeTransferId: transfer.id,
              driverNetAmountPaid: updatedTx.driverNetAmountPaid,
              driverPaidAt: new Date(),
            },
          });

          // send notification to the driver about the payout
          const formatedDepTime = new Date(ride.departureTime).toLocaleString("en-CA", {
            timeZone: "UTC",
          }) + " GMT";
          await NotificationServices.notifyUsers({
            userIds: [driver.id],
            titleEn: "Payment Made",
            titleFr: "Paiement effectué",
            messageEn: `A payment of amount CA$${updatedTx.driverNetAmountPaid} has been made to your account for ride ${ride.departureLocation.city}, ${ride.destinationLocation.regionCode} -> ${ride.destinationLocation.city}, ${ride.destinationLocation.regionCode} of departure time ${formatedDepTime}.`,
            messageFr: `Un paiement d'un montant de CA$${updatedTx.driverNetAmountPaid} a été effectué sur votre compte pour le trajet de ${ride.departureLocation.city}, ${ride.destinationLocation.regionCode} -> ${ride.destinationLocation.city}, ${ride.destinationLocation.regionCode} avec une heure de départ prévue le ${formatedDepTime}.`,
            rideId: ride.id,
          });

          logger.info(`Driver payout completed for the transaction with ID ${updatedTx.id} and system transaction ID ${updatedTx.transactionId} with amount CA$${updatedTx.driverNetAmountPaid}, stripe transfer ID ${transfer.id}`, {
            txId: updatedTx.id,
            driverId: driver.id,
            transferId: transfer.id,
          });
        } catch (err) {
          logger.error(`Driver payout failed for the transaction with ID ${updatedTx.id} and system transaction ID ${updatedTx.transactionId} with amount CA$${updatedTx.driverNetAmountPaid}`, {
            txId: updatedTx.id,
            err,
          });
        }
      }
    }


    // ---- 7. Create receipt ----
    const receipt = await prisma.paymentReceipt.create({
      data: {
        transactionId: updatedTx.id,
        invoiceNumber: `CR_INV${updatedTx.id
          .toString()
          .padStart(6, "0")}`,
        invoiceDate: new Date(),
        email: txn.user.email,
        totalAmount: receivedAmount,
        subTotal: updatedTx.platformAmount + updatedTx.driverAmount,
        taxAmount,
        currency: updatedTx.currency ?? getDefaultCurrency(),
        status: "PENDING",
      },
    });

    // ---- 8. Send receipt email ----
    try {
      // build address string
      
     
    } catch (err: any) {
      await prisma.paymentReceipt.update({
        where: { id: receipt.id },
        data: {
          status: "FAILED",
          errorMessage: err?.message ?? "Failed sending receipt",
        },
      });
    }

    logger.info(`Funds captured for the transaction with ID ${updatedTx.id} and system transaction ID ${updatedTx.transactionId} with amount CA$${receivedAmount}, external/stripe reference ID ${paymentIntentId}`, {
      txId: updatedTx.id,
      paymentIntentId,
    });

    return updatedTx;
  }

  /**
   * Process driver payout and send receipt after partial capture (e.g., cancellation scenarios)
   * This is used when we capture a partial amount and need to process driver payout and receipt
   */
  static async processPartialCapturePayoutAndReceipt(data: {
    txn: Transaction & {
      user: User;
      booking: Booking | null;
      d2dBookingReq: D2DBookingRequest | null;
    };
    ride: Ride & {
      driver: User;
      departureLocation: Location;
      destinationLocation: Location;
    };
    capturedAmount: number; // Amount that was captured (in dollars)
    driverAmount: number; // Driver portion of the captured amount
    platformAmount: number; // Platform portion of the captured amount
    paymentIntentId: string;
    chargeId?: string;
  }) {
    const { txn, ride, capturedAmount, driverAmount, platformAmount, paymentIntentId, chargeId } = data;

    // Calculate Stripe fee proportionally based on captured amount
    let stripeFee = 0;
    let stripeNet = capturedAmount;

    try {
      if (chargeId) {
        const charge = await stripe.charges.retrieve(chargeId, {
          expand: ["balance_transaction"],
        });

        const bt =
          typeof charge.balance_transaction === "string"
            ? await stripe.balanceTransactions.retrieve(
              charge.balance_transaction
            )
            : charge.balance_transaction;

        stripeFee = (bt?.fee ?? 0) / 100;
        stripeNet = (bt?.net ?? charge.amount_captured ?? 0) / 100;
      }
    } catch (err) {
      logger.warn("Failed to fetch Stripe balance transaction for partial capture", {
        err,
        txId: txn.id,
      });
      // Estimate fee as 2.9% + $0.30 (standard Stripe fee)
      stripeFee = Math.max(capturedAmount * 0.029 + 0.30, 0);
      stripeNet = capturedAmount - stripeFee;
    }

    // Apply Stripe fee proportionally to driver amount
    // const feeRatio = driverAmount > 0 ? driverAmount / capturedAmount : 0;
    const driverStripeFee = driverAmount > 0 ? stripeFee : 0;
    const driverNet = Math.max(driverAmount - driverStripeFee, 0);

    // If no driver amount, fee is applied to platform amount
    const platformFee = driverAmount == 0 ? stripeFee : 0;
    const platformNet = platformAmount - platformFee;

    // Update transaction with captured amounts
    const updatedTx = await prisma.transaction.update({
      where: { id: txn.id },
      data: {
        status: TransactionStatus.PAID,
        externalReference: paymentIntentId,
        stripeChargeId: chargeId ?? undefined,
        grossReceivedAmount: capturedAmount,
        netReceivedAmount: stripeNet,
        driverStripeFee: driverStripeFee,
        driverNetAmountPaid: driverNet,
        driverAmount: driverAmount, // Update with actual captured driver amount
        platformAmount: platformAmount, // Update with actual captured platform amount
        platformNetAmount: platformNet,
        platformStripeFee: platformFee,
        transactionDate: new Date(),
      },
      include: {
        user: true,
        booking: true,
        d2dBookingReq: true,
      },
    });

    // Process driver payout if applicable
    if (
      updatedTx.status === TransactionStatus.PAID &&
      !updatedTx.isDriverPaid &&
      updatedTx.driverNetAmountPaid &&
      updatedTx.driverNetAmountPaid > 0
    ) {
      const driver = ride.driver;

      if (!driver?.stripeAccountId) {
        logger.warn(`Driver of ID ${ride.driverId} has no connected Stripe account, manual payout for can be done here for transaction with ID ${updatedTx.id} with system transaction ID of ${updatedTx.transactionId}`, {
          driverId: ride.driverId,
          txId: updatedTx.id,
        });
      } else {
        try {
          const transfer = await stripe.transfers.create(
            {
              amount: Math.round(updatedTx.driverNetAmountPaid * 100),
              currency: (updatedTx.currency || getDefaultCurrency()).toLowerCase(),
              destination: driver.stripeAccountId,
              transfer_group: `ride_${ride.id}`,
              source_transaction: updatedTx.stripeChargeId ?? undefined,
              metadata: {
                transactionId: String(updatedTx.id),
                systemTransactionId: updatedTx.transactionId!,
                rideId: String(ride.id),
                bookingId: String(txn.booking?.id || txn.d2dBookingReq?.id),
                reason: "PARTIAL_CAPTURE_CANCELLATION",
              },
            },
            {
              idempotencyKey: `driver_transfer_partial_tx_${updatedTx.id}`,
            }
          );

          await prisma.transaction.update({
            where: { id: updatedTx.id },
            data: {
              isDriverPaid: true,
              stripeTransferId: transfer.id,
              driverPaidAt: new Date(),
            },
          });

          const formatedDepTime = new Date(ride.departureTime).toLocaleString("en-CA", {
            timeZone: "UTC",
          }) + " GMT";
          await NotificationServices.notifyUsers({
            userIds: [driver.id],
            titleEn: "Payment Made",
            titleFr: "Paiement effectué",
            messageEn: `A payment of amount CA$${updatedTx.driverNetAmountPaid} has been made to your account for ride ${ride.departureLocation.city}, ${ride.departureLocation.regionCode} -> ${ride.destinationLocation.city}, ${ride.destinationLocation.regionCode} of departure time ${formatedDepTime}.`,
            messageFr: `Un paiement d'un montant de CA$${updatedTx.driverNetAmountPaid} a été effectué sur votre compte pour le trajet de ${ride.departureLocation.city}, ${ride.destinationLocation.regionCode} -> ${ride.destinationLocation.city}, ${ride.destinationLocation.regionCode} avec une heure de départ prévue le ${formatedDepTime}.`,
            rideId: ride.id,
          });

          logger.info(`Driver payout completed for partial capture transaction ${updatedTx.id} with amount CA$${updatedTx.driverNetAmountPaid}`, {
            txId: updatedTx.id,
            driverId: driver.id,
            transferId: transfer.id,
          });
        } catch (err) {
          logger.error(`Driver payout failed for partial capture transaction ${updatedTx.id}`, {
            txId: updatedTx.id,
            err,
          });
        }
      }
    }

    // Create and send receipt
    const taxAmount = 0;
    const receipt = await prisma.paymentReceipt.create({
      data: {
        transactionId: updatedTx.id,
        invoiceNumber: `CR_INV${updatedTx.id.toString().padStart(6, "0")}`,
        invoiceDate: new Date(),
        email: updatedTx.user.email,
        totalAmount: capturedAmount,
        subTotal: platformAmount + driverAmount,
        taxAmount,
        currency: updatedTx.currency ?? getDefaultCurrency(),
        status: "PENDING",
      },
    });

    try {
      const address = `${ride.departureLocation.region}, ${ride.departureLocation.country || "Rwanda"}`;
   
    } catch (err: any) {
      await prisma.paymentReceipt.update({
        where: { id: receipt.id },
        data: {
          status: "FAILED",
          errorMessage: err?.message ?? "Failed sending receipt",
        },
      });
    }

    return updatedTx;
  }

}
