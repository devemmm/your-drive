import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import {
  AlertCircle,
  BadgeCheck,
  CreditCard,
  Loader2,
  Lock,
  Shield,
  CheckCircle,
  MapPin,
  DollarSign,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme } from "@/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { apiUrl, queryKey, useAllCards, useUserDefaultCard } from "@/data";
import { getCardIcon } from "@/lib/utils";
import axios from "axios";
import { getToken } from "./getToken";

interface StripePaymentFormProps {
  payment_data: any;
  setPayment_data: (data: any) => void;
  description?: string;
  keyToValidate: string;
  redirect?: string;
  rideDetails?: {
    departureLocation?: { city: string; region: string };
    destinationLocation?: { city: string; region: string };
    departureTime?: string;
    totalSeats?: number;
    availableSeats?: number;
    contribution?: number;
    vehicle?: { make: string; model: string; year: number };
  };
  seatsToBook?: number;
  onSuccess?: () => void;
}

const StripePaymentForm = ({
  payment_data,
  setPayment_data,
  description = "",
  keyToValidate,
  redirect,
  rideDetails,
  seatsToBook,
  onSuccess,
}: StripePaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [useDefaultCard, setUseDefaultCard] = useState(true);
  const [showCards, setShowCards] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);

  const [saveCard, setSaveCard] = useState(false);

  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const isDark = theme === "dark";
  const currentLanguage = i18n.language;

  const { data: defaultCard } = useUserDefaultCard();
  const isDefaultCardAvailable = defaultCard?.isDefault;

  const { data } = useAllCards();
  const cards =
    (isDefaultCardAvailable
      ? data?.filter((card: any) => card.id !== defaultCard?.id)
      : data) ?? [];

  // Reset form states when payment_data changes
  useEffect(() => {
    if (payment_data?.sessionId) {
      setPaymentSuccess(false);
      setCardError(null);
      setIsOpen(true);
    }
  }, [payment_data?.sessionId]);

  // Close handler with proper cleanup
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setPayment_data(null);
    setPaymentSuccess(false);
    setCardError(null);
    setLoading(false);
  }, [setPayment_data]);

  // Format currency values safely
  const formatCurrency = (value: number | undefined) => {
    if (typeof value !== "number") return "$0.00";
    return value.toLocaleString(undefined, {
      style: "currency",
      currency: payment_data?.currency || "CA$",
    });
  };

  const formatCardBrand = (brand: string) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast.error(
        "Payment processing is not available. Please try again later.",
        {
          className: "custom-error-toast",
        }
      );
      return;
    }

    // Validate required fields
    if (!payment_data?.sessionId) {
      setCardError("Missing payment information. Please try again.");
      return;
    }

    setLoading(true);
    setCardError(null);

    try {
      let result;

      if (
        useDefaultCard &&
        isDefaultCardAvailable &&
        !selectedCard &&
        defaultCard
      ) {
        // Use default card payment method
        // defaultCard.id is the Stripe payment method ID
        result = await axios.post(
          `${apiUrl}/api/v1/transactions/confirm?lang=${currentLanguage}`,
          {
            sessionId: payment_data.sessionId,
            paymentMethodId: defaultCard.id,
            saveCard: false, // Already saved as default
          },
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          }
        );
      } else if (selectedCard) {
        // Use selected card payment method
        result = await axios.post(
          `${apiUrl}/api/v1/transactions/confirm?lang=${currentLanguage}`,
          {
            sessionId: payment_data.sessionId,
            paymentMethodId: selectedCard.id,
            saveCard: false, // Already saved
          },
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          }
        );
      } else {
        // Use new card element
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          setCardError("Card information is incomplete");
          return;
        }

        const { error: stripeError, paymentMethod: newPaymentMethod } =
          await stripe.createPaymentMethod({
            type: "card",
            card: cardElement,
          });

        if (stripeError) {
          setCardError(stripeError.message || "Invalid card details");
          return;
        }

        if (!newPaymentMethod) {
          setCardError("Failed to create payment method");
          return;
        }

        result = await axios.post(
          `${apiUrl}/api/v1/transactions/confirm?lang=${currentLanguage}`,
          {
            sessionId: payment_data.sessionId,
            paymentMethodId: newPaymentMethod.id,
            saveCard: saveCard,
          },
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          }
        );
      }

      const { success, message, client_secret, requiresAction, data } =
        result.data;

      // Handle 3D Secure requirement
      if (requiresAction && client_secret) {
        // 3DS authentication required - payment method is already attached to the payment intent
        try {
          // Confirm payment with 3DS (payment method already attached on backend)
          const { error: confirmError, paymentIntent } =
            await stripe.confirmCardPayment(client_secret);

          if (confirmError) {
            setCardError(
              confirmError.message || "3D Secure authentication failed"
            );
            toast.error(confirmError.message || t("Payment.error.failed"), {
              className: "custom-error-toast",
            });
            return;
          }

          // After successful 3DS, call finalize-3ds endpoint
          if (paymentIntent?.id) {
            const finalizeResult = await axios.post(
              `${apiUrl}/api/v1/transactions/finalize-3ds?lang=${currentLanguage}`,
              {
                paymentIntentId: paymentIntent.id,
                sessionId: payment_data.sessionId,
              },
              {
                headers: {
                  Authorization: `Bearer ${getToken()}`,
                },
              }
            );

            if (finalizeResult.data.success) {
              setPaymentSuccess(true);
              queryClient.invalidateQueries({
                queryKey: [queryKey.NOTIFICATIONS],
              });
              queryClient.invalidateQueries({ queryKey: ["bookings"] });
              toast.success(t("Payment.success"));

              if (onSuccess) {
                onSuccess();
              }

              setTimeout(() => {
                handleClose();
                if (redirect) {
                  window.location.replace(redirect);
                }
              }, 2000);
            } else {
              setCardError(
                finalizeResult.data.message || t("Payment.error.failed")
              );
              toast.error(
                finalizeResult.data.message || t("Payment.error.failed"),
                {
                  className: "custom-error-toast",
                }
              );
            }
          }
        } catch (err: any) {
          setCardError(
            err?.response?.data?.message || t("Payment.error.failed")
          );
          toast.error(
            err?.response?.data?.message || t("Payment.error.failed"),
            {
              className: "custom-error-toast",
            }
          );
        }
        return;
      }

      // Handle regular success response
      if (!success) {
        setCardError(message || t("Payment.error.failed"));
        toast.error(message || t("Payment.error.failed"), {
          className: "custom-error-toast",
        });
      } else if (success) {
        setPaymentSuccess(true);

        // Invalidate relevant queries
        const keyParts = keyToValidate.split("_");
        if (keyParts.length > 1) {
          const baseKey = keyParts[0];
          const rideId = keyParts[1];
          queryClient.invalidateQueries({ queryKey: [baseKey, rideId] });
        } else {
          queryClient.invalidateQueries({ queryKey: [keyToValidate] });
        }

        queryClient.invalidateQueries({ queryKey: [queryKey.NOTIFICATIONS] });
        // Invalidate bookings to refresh booked rides list
        queryClient.invalidateQueries({ queryKey: ["bookings"] });

        toast.success(t("Payment.success"));

        if (onSuccess) {
          onSuccess();
        }

        // Auto-close after delay and redirect immediately to prevent refetch errors
        setTimeout(() => {
          handleClose();
          if (redirect) {
            window.location.replace(redirect);
          }
        }, 2000); // Reduced delay to redirect faster
      }
    } catch (err) {
      setCardError(t("Payment.error.unexpected"));
      toast.error(t("Payment.error.failed"), {
        className: "custom-error-toast",
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't render if Stripe is not available
  if (!stripe || !elements) {
    return null;
  }

  const CARD_ELEMENT_OPTIONS = {
    style: {
      base: {
        color: isDark ? "#ffffff" : "#000000",
        fontFamily: "Inter, sans-serif",
        fontSize: "16px",
        iconColor: isDark ? "#ffffff" : "#000000",
        "::placeholder": {
          color: isDark ? "#cccccc" : "#888888",
        },
      },
      invalid: {
        color: "#ef4444",
        iconColor: "#ef4444",
      },
    },
    hidePostalCode: true,
  };

  // Derived booking context
  const seats = (seatsToBook ?? payment_data?.seatsBooked ?? 1) as number;
  const perSeatContribution =
    typeof payment_data?.contributionPerSeat === "number"
      ? payment_data.contributionPerSeat
      : rideDetails?.contribution ?? 0;
  const subtotalContribution = Number((perSeatContribution * seats).toFixed(2));
  const bookingFeeTotal = Number(
    (typeof payment_data?.["Your-DriveFee"] === "number"
      ? payment_data["Your-DriveFee"]
      : (payment_data?.bookingFeePerSeat ?? 0) * seats
    ).toFixed(2)
  );
  const taxAmount = Number((payment_data?.taxAmount ?? 0).toFixed(2));
  // const displayTotal = Number(
  //   (subtotalContribution + bookingFeeTotal).toFixed(2)
  // );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto z-[99999]">
        <DialogDescription className="sr-only">
          Payment form for processing your transaction
        </DialogDescription>

        {paymentSuccess ? (
          <Card className="text-center border-none shadow-none">
            <CardHeader>
              <BadgeCheck className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <CardTitle className="text-2xl">
                {t("PaymentDialog.success.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-lg font-semibold">
                {formatCurrency(payment_data?.totalToPay)}
              </p>
              <p className="text-muted-foreground">
                {description || t("PaymentDialog.PaymentForService")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("PaymentDialog.success.transactionId")}:{" "}
                {payment_data?.clientSecret?.substring(0, 12)}...
              </p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button onClick={handleClose}>
                {t("PaymentDialog.success.closeButton")}
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <>
            <DialogHeader className="text-center">
              <DialogTitle className="flex items-center justify-center gap-2 text-xl">
                <CreditCard className="h-6 w-6" />
                {t("PaymentDialog.title")}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {t("PaymentDialog.completePaymentDescription")}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Ride Info & Payment Summary */}
                <div className="space-y-6">
                  {/* Ride Information Summary */}
                  {rideDetails && (
                    <div className="bg-muted/50 p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-foreground">
                          {seatsToBook
                            ? "Booking Summary"
                            : t("PaymentDialog.rideDetails")}
                        </h3>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Route:</span>
                          <span className="font-medium text-foreground">
                            {rideDetails.departureLocation?.city} →{" "}
                            {rideDetails.destinationLocation?.city}
                          </span>
                        </div>

                        {rideDetails.departureTime && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span className="font-medium text-foreground">
                              {new Date(
                                rideDetails.departureTime
                              ).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )}

                        {rideDetails.vehicle && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Vehicle:
                            </span>
                            <span className="font-medium text-foreground">
                              {rideDetails.vehicle.year}{" "}
                              {rideDetails.vehicle.make}{" "}
                              {rideDetails.vehicle.model}
                            </span>
                          </div>
                        )}

                        {rideDetails.totalSeats &&
                          rideDetails.availableSeats && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Seats:
                              </span>
                              <span className="font-medium text-foreground">
                                {seatsToBook
                                  ? `${seatsToBook} seats booked`
                                  : `${
                                      rideDetails.totalSeats -
                                      rideDetails.availableSeats
                                    }/${rideDetails.totalSeats} booked`}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Payment Breakdown */}
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {t("PaymentDialog.paymentSummary")}
                    </h3>

                    <div className="space-y-3">
                      {rideDetails && seatsToBook ? (
                        // Ride booking breakdown
                        <>
                          {perSeatContribution ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {t("PaymentDialog.pricePerSeat")}:
                              </span>
                              <span className="font-medium text-foreground">
                                ${perSeatContribution.toFixed(2)}{" "}
                              </span>
                            </div>
                          ) : (
                            ""
                          )}

                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {t("PaymentDialog.seatsBooked")}:
                            </span>
                            <span className="font-medium text-foreground">
                              {seats}
                            </span>
                          </div>

                          <div className="border-t border-border pt-2 mt-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {t("PaymentDialog.subtotalSeats")}:
                              </span>
                              <span className="font-medium text-foreground">
                                ${subtotalContribution.toFixed(2)}
                              </span>
                            </div>

                            {payment_data?.bookingFeePerSeat ||
                            payment_data?.["Your-DriveFee"] ? (
                              <div className="flex justify-between text-sm mt-2">
                                <span className="text-muted-foreground">
                                  {t("PaymentDialog.bookingFees")}:
                                </span>
                                <span className="font-medium text-foreground">
                                  ${bookingFeeTotal.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              ""
                            )}

                            {/* Discount */}
                            {payment_data?.discountAmount ? (
                              <div className="border border-gray-400 border-dashed p-3 my-2">
                                <p className="text-gray-400 dark:text-gray-200 text-xs">
                                  {`You are receiving a discount of CA$${payment_data?.discountAmount.toFixed(
                                    2
                                  )}`}
                                </p>
                              </div>
                            ) : (
                              ""
                            )}

                            <div className="flex justify-between text-sm mt-2">
                              <span className="text-muted-foreground">
                                Tax:
                              </span>
                              <span className="font-medium text-foreground">
                                ${taxAmount.toFixed(2)}
                              </span>
                            </div>

                            {/* Tax details */}
                            {payment_data?.taxAmount ? (
                              <div className="border border-gray-400 border-dashed p-3 my-2">
                                {payment_data?.taxDetails?.map(
                                  (detail: any, index: number) => (
                                    <p
                                      key={index}
                                      className="text-gray-400 dark:text-gray-200 text-xs"
                                    >
                                      {detail?.type} ({detail?.percentage}%):{" "}
                                      {detail?.value.toFixed(2)}
                                    </p>
                                  )
                                )}
                              </div>
                            ) : (
                              ""
                            )}

                            {payment_data?.discountAmount ? (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  {t("common_.amount_before")}:
                                </span>
                                <span className="font-medium text-foreground">
                                  $
                                  {(
                                    payment_data?.discountAmount +
                                    payment_data?.totalToPay
                                  ).toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              ""
                            )}
                          </div>

                          <div className="border-t border-border pt-2 mt-2">
                            <div className="flex justify-between font-semibold">
                              <span>{t("PaymentDialog.totalAmount")}</span>
                              <span>
                                ${payment_data?.totalToPay.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        // Default publishing fee breakdown
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {t("PaymentDialog.ridePublishingFee")}
                            </span>
                            <span className="font-medium text-foreground">
                              {formatCurrency(payment_data?.totalToPay)}
                            </span>
                          </div>
                          <div className="border-t border-border pt-2 mt-2">
                            <div className="flex justify-between font-semibold">
                              <span>Total</span>
                              <span>
                                {formatCurrency(payment_data?.totalToPay)}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Service Benefits - Only show for ride publishing, not for bookings */}
                  {!rideDetails && (
                    <div className="bg-muted/50 p-4 rounded-lg border">
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
                        <CheckCircle className="h-4 w-4" />
                        {t("PaymentDialog.whatsIncluded")}
                      </h3>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3" />
                          <span>{t("PaymentDialog.rideVisibility")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3" />
                          <span>{t("PaymentDialog.bookingManagement")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3" />
                          <span>{t("PaymentDialog.communicationTools")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3" />
                          <span>{t("PaymentDialog.paymentSecurity")}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Payment Methods */}
                <div className="space-y-6">
                  {/* Payment Method Selection */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">
                      {t("common_.method")}
                    </h3>

                    {showCards ? (
                      <Card>
                        <CardContent className="space-y-4 pt-5">
                          <CardTitle>
                            {t("common_.selectPaymentMethod")}
                          </CardTitle>
                          <CardDescription>
                            {t("common_.chooseCard")}
                          </CardDescription>

                          <div className="space-y-3">
                            {cards.map((card: any) => (
                              <div
                                key={card.id}
                                onClick={() => {
                                  setSelectedCard((prev) =>
                                    prev?.id === card.id ? null : card
                                  );
                                }}
                                className={
                                  "flex items-center justify-between p-3 border-2 rounded-md bg-muted cursor-pointer hover:border-primary-300" +
                                  (selectedCard?.id === card.id
                                    ? " bg-primary-200"
                                    : "")
                                }
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">
                                    {card.brand.toUpperCase()} •••• {card.last4}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {t("common_.cardExpires")} {card.expMonth}/
                                    {card.expYear}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="w-full flex items-center justify-center">
                            <Button
                              size="sm"
                              onClick={() => setShowCards(false)}
                            >
                              {t("common_.backToPaymentOptions")}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        {/* If default card exists, show both options */}
                        {isDefaultCardAvailable && (
                          <div className="space-y-4">
                            {/* Radio Option: Use Default Card */}
                            {!selectedCard && (
                              <div className="flex items center justify-between">
                                <div className="flex items-center space-x-3">
                                  <input
                                    type="radio"
                                    id="use-default-card"
                                    checked={useDefaultCard && !selectedCard}
                                    onChange={() => {
                                      setUseDefaultCard(true);
                                      setSelectedCard(null);
                                    }}
                                    className="h-4 w-4 text-primary focus:ring-primary border-input bg-background"
                                  />
                                  <label
                                    htmlFor="use-default-card"
                                    className="text-sm font-medium text-foreground"
                                  >
                                    {t("PaymentDialog.useDefaultCard")}
                                  </label>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowCards(true)}
                                  className="text-xs text-foreground ml-auto hover:underline"
                                >
                                  {t(
                                    "common_.useDifferentCard",
                                    "Use a different card"
                                  )}
                                </button>
                              </div>
                            )}

                            {useDefaultCard && !selectedCard && (
                              <div className="ml-7 p-3 border border-border rounded-lg bg-muted">
                                <div className="flex items-center">
                                  <img
                                    src={getCardIcon(defaultCard.brand)}
                                    alt={defaultCard.brand}
                                    className="h-6 w-6 mr-2"
                                  />
                                  <span className="font-medium text-foreground">
                                    {formatCardBrand(defaultCard.brand)} ••••{" "}
                                    {defaultCard.last4}
                                  </span>
                                </div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                  {t("PaymentDialog.expires")}{" "}
                                  {defaultCard.expMonth}/
                                  {defaultCard.expYear.toString().slice(-2)}
                                  {defaultCard.isDefault && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                                      {t("Payment.default")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Radio Option: Use New Card */}
                            {!selectedCard && (
                              <div className="flex items-center space-x-3">
                                <input
                                  type="radio"
                                  id="use-new-card"
                                  checked={!useDefaultCard && !selectedCard}
                                  onChange={() => {
                                    setUseDefaultCard(false);
                                    setSelectedCard(null);
                                  }}
                                  className="h-4 w-4 text-primary focus:ring-primary border-input bg-background"
                                />
                                <label
                                  htmlFor="use-new-card"
                                  className="text-sm font-medium text-foreground"
                                >
                                  {t("PaymentDialog.useNewCard")}
                                </label>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Card Element - Only show when NOT using default card */}
                        {!useDefaultCard && !selectedCard && (
                          <div className="space-y-2 ml-7">
                            <Label
                              htmlFor="card-element"
                              className="flex items-center gap-1"
                            >
                              <CreditCard className="h-4 w-4" />
                              {t("PaymentDialog.cardDetails")}
                            </Label>
                            <div className="border border-border rounded-lg p-3 bg-background">
                              <CardElement
                                id="card-element"
                                options={CARD_ELEMENT_OPTIONS}
                              />
                            </div>
                          </div>
                        )}

                        {/* No default card at all — only show input */}
                        {!isDefaultCardAvailable && !selectedCard && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor="card-element"
                                className="flex items-center gap-1"
                              >
                                <CreditCard className="h-4 w-4" />
                                {t("PaymentDialog.cardDetails")}
                              </Label>
                              {cards.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setShowCards(true)}
                                  className="text-xs text-foreground ml-auto hover:underline"
                                >
                                  {t(
                                    "PaymentDialog.useDifferentCard",
                                    "Use a different card"
                                  )}
                                </button>
                              )}
                            </div>
                            <div className="border border-border rounded-lg p-3 bg-background">
                              <CardElement
                                id="card-element"
                                options={CARD_ELEMENT_OPTIONS}
                              />
                            </div>

                            {/* ✅ Save card checkbox */}
                            <div className="flex items-center gap-2 pt-2">
                              <input
                                type="checkbox"
                                id="save-card"
                                checked={saveCard}
                                onChange={(e) => setSaveCard(e.target.checked)}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <Label
                                htmlFor="save-card"
                                className="text-sm text-muted-foreground cursor-pointer select-none"
                              >
                                {t(
                                  "PaymentCard.saveCard",
                                  "Save this card for future payments"
                                )}
                              </Label>
                            </div>
                          </div>
                        )}

                        {selectedCard && (
                          <div>
                            <div className="ml-7 p-3 border border-border rounded-lg border-primary-700">
                              <div className="flex items-center">
                                <img
                                  src={getCardIcon(selectedCard.brand)}
                                  alt={selectedCard.brand}
                                  className="h-6 w-6 mr-2"
                                />
                                <span className="font-medium text-foreground">
                                  {formatCardBrand(selectedCard.brand)} ••••{" "}
                                  {selectedCard.last4}
                                </span>
                              </div>
                              <div className="mt-1 text-sm text-muted-foreground">
                                {t("PaymentDialog.expires")}{" "}
                                {selectedCard.expMonth}/
                                {selectedCard.expYear.toString().slice(-2)}
                                <span className="ml-2 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                                  {selectedCard.id}
                                </span>
                              </div>
                            </div>
                            <div className="w-full flex justify-center">
                              <button
                                type="button"
                                className="text-xs text-foreground mt-2 hover:underline"
                                onClick={() => setShowCards(true)}
                              >
                                {t("common_.change", "Change Card")}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Error Message */}
                  {cardError && (
                    <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                      <AlertCircle className="h-4 w-4" />
                      {cardError}
                    </div>
                  )}

                  {/* Security Info */}
                  {!showCards && (
                    <div className="bg-muted/50 p-4 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-primary mt-0.5" />
                        <div className="text-sm">
                          <h4 className="font-semibold text-foreground mb-1">
                            {t("PaymentDialog.securePayment")}
                          </h4>
                          <p className="text-muted-foreground">
                            {t("PaymentDialog.securePaymentDescription")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={!stripe || loading || !elements}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("PaymentDialog.processing")}
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        {t("PaymentDialog.payNow")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StripePaymentForm;
