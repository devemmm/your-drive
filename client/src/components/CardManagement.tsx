import React, { useState } from "react";
import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl, queryKey, useAllCards } from "@/data";
import { useTranslation } from "react-i18next";
import { getToken } from "./getToken";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { CreditCardIcon, Loader2, PlusIcon } from "lucide-react";
import { FaXmark } from "react-icons/fa6";
import { Button } from "./ui/button";
import { useTheme } from "@/providers/ThemeProvider";
import { getCardIcon } from "@/lib/utils";
import CustomLoader from "./CustomLoader";

// Initialize Stripe
const stripePromise = (() => {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    console.warn(
      "Stripe publishable key not found. Payment functionality will be disabled."
    );
    return null;
  }
  return loadStripe(publishableKey);
})();

const CardForm = ({ clientSecret, onSuccess, onClose }) => {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { theme } = useTheme();
  const isDark = theme === "dark";

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
        color: "#ef4444", // Tailwind red-500
        iconColor: "#ef4444",
      },
    },
    hidePostalCode: true,
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    if (!stripe || !elements) {
      return;
    }

    const { error: stripeError, paymentMethod } =
      await stripe.createPaymentMethod({
        type: "card",
        card: elements.getElement(CardElement),
      });

    if (stripeError) {
      setError(stripeError.message);
      setLoading(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmCardSetup(
      clientSecret,
      {
        payment_method: paymentMethod.id,
      }
    );

    if (confirmError) {
      setError(confirmError.message);
    } else {
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">
          {t("Payment.addNewCard")}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ×
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("Payment.cardDetails")}
          </label>
          <div className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
            <CardElement options={CARD_ELEMENT_OPTIONS} />
          </div>
        </div>
        {error && (
          <div className="text-red-500 dark:text-red-400 text-sm">{error}</div>
        )}
        <Button type="submit" disabled={!stripe || loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("Payment.processing")}
            </>
          ) : (
            t("Payment.addCard")
          )}
        </Button>
      </form>
    </div>
  );
};

const CardManagement = () => {
  const { t } = useTranslation();
  const [showCardForm, setShowCardForm] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);

  const queryClient = useQueryClient();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const { mutate: initiateAddCard, isPending: isAdding } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(
        `${apiUrl}/api/v1/cards?lang=${currentLanguage}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      return data;
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      setShowCardForm(true);
    },
    onError: (error) => {
      toast.error(
        (error as any)?.response?.data?.message ||
          t("common_.somethingWentWrong"),
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  const { data, isPending: isLoadingCards } = useAllCards();
  const cards = data ?? [];

  const { mutate: deleteCard, isPending: isDeleting } = useMutation({
    mutationFn: async (id) => {
      await axios.delete(
        `${apiUrl}/api/v1/cards/${id}?lang=${currentLanguage}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey.CARDS] });
      toast.success(t("Payment.cardDeleted"));
      setShowDeleteModal(false);
      setCardToDelete(null);
    },
    onError: (error) => {
      toast.error(
        (error as any)?.response?.data?.message || t("Payment.deleteCardError"),
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  const { mutate: setDefaultCard, isPending: isSettingDefault } = useMutation({
    mutationFn: async (id) => {
      await axios.patch(
        `${apiUrl}/api/v1/cards/${id}/default?lang=${currentLanguage}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey.CARDS] });
      toast.success(t("Payment.defaultCardUpdated"));
    },
    onError: (error) => {
      toast.error(
        (error as any)?.response?.data?.message || t("Payment.setDefaultError"),
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  const handleCardAdded = () => {
    setShowCardForm(false);
    setClientSecret(null);
    queryClient.invalidateQueries({ queryKey: [queryKey.CARDS] });
    toast.success(t("Payment.cardAdded"));
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          {t("Payment.paymentMethods")}
        </h2>
        {!showCardForm && cards.length > 0 && (
          <Button onClick={() => initiateAddCard()} disabled={isAdding}>
            <PlusIcon className="h-5 w-5 mr-2" />
            {isAdding ? t("Payment.preparing") : t("Payment.addNewCard")}
          </Button>
        )}
      </div>

      {/* Add Card Form */}
      {showCardForm && clientSecret && (
        <div className="mb-8">
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CardForm
              clientSecret={clientSecret}
              onSuccess={handleCardAdded}
              onClose={() => {
                setShowCardForm(false);
                setClientSecret(null);
              }}
            />
          </Elements>
        </div>
      )}

      {/* Loading State */}
      {isLoadingCards && cards.length === 0 && (
        <div className="flex justify-center items-center h-64">
          <CustomLoader />
        </div>
      )}

      {/* Empty State */}
      {!isLoadingCards && cards.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <CreditCardIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            {t("Payment.noPaymentMethods")}
          </h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {t("Payment.noPaymentMethodsDescription")}
          </p>
          <Button className="mt-4" onClick={() => initiateAddCard()}>
            <PlusIcon className="h-5 w-5 mr-2" />
            {isAdding ? t("Payment.preparing") : t("Payment.addPaymentMethod")}
          </Button>
        </div>
      )}

      {/* Cards List */}
      {!isLoadingCards && cards.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cards.map((card) => (
              <div
                key={card.id}
                className={`p-5 border rounded-lg transition-all ${
                  card.isDefault
                    ? "border-blue-500 bg-blue-50 dark:bg-gray-800 dark:border-blue-700"
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-900 dark:hover:border-blue-500 hover:shadow-sm dark:hover:shadow-md"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <img
                      src={getCardIcon(card.brand)}
                      alt={card.brand}
                      className="h-8 w-8 mr-3"
                    />
                    <span className="font-medium capitalize text-gray-700 dark:text-gray-200">
                      {card.brand}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {card.isDefault && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded-full">
                        {t("Payment.default")}
                      </span>
                    )}
                    {card.isExpired && (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100 rounded-full">
                        {t("Payment.expired")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
                    {t("Payment.cardNumber")}
                  </p>
                  <p className="text-gray-800 dark:text-gray-100 font-medium">
                    •••• •••• •••• {card.last4}
                  </p>
                </div>

                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
                      {t("Payment.expires")}
                    </p>
                    <p className="text-gray-800 dark:text-gray-100">
                      {card.expMonth}/{card.expYear.toString().slice(-2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
                      {t("Payment.status")}
                    </p>
                    <p className="text-gray-800 dark:text-gray-100">
                      {card.isExpired
                        ? t("Payment.expired")
                        : t("Payment.active")}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  {!card.isDefault && (
                    <Button
                      // variant="outline"
                      onClick={() => setDefaultCard(card.id)}
                      disabled={isSettingDefault}
                    >
                      {isSettingDefault ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("Payment.setting")}
                        </>
                      ) : (
                        t("Payment.setAsDefault")
                      )}
                    </Button>
                  )}
                  <Button
                    // variant="outline"
                    onClick={() => {
                      setCardToDelete(card);
                      setShowDeleteModal(true);
                    }}
                    disabled={isDeleting}
                    className="text-white dark:text-white border-red-300 dark:border-red-700 dark:hover:bg-red-900/20"
                  >
                    {t("Payment.delete")}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Card Button (when cards exist) */}
          {!showCardForm && (
            <div className="pt-2">
              <Button
                variant="ghost"
                onClick={() => initiateAddCard()}
                className="text-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                {isAdding
                  ? t("Payment.preparing")
                  : t("Payment.addAnotherCard")}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && cardToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                {t("Payment.deletePaymentMethod")}
              </h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400"
              >
                <FaXmark className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-300">
                {t("Payment.deleteConfirmation")}
              </p>
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div className="flex items-center">
                  <img
                    src={getCardIcon(cardToDelete.brand)}
                    alt={cardToDelete.brand}
                    className="h-6 w-6 mr-2"
                  />
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {cardToDelete.brand} {t("Payment.endingIn")}{" "}
                    {cardToDelete.last4}
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {t("Payment.expires")} {cardToDelete.expMonth}/
                  {cardToDelete.expYear.toString().slice(-2)}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                // variant="outline"
                onClick={() => setShowDeleteModal(false)}
              >
                {t("common_.cancel")}
              </Button>
              <Button
                // variant="destructive"
                onClick={() => {
                  deleteCard(cardToDelete.id);
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("Payment.deleting")}
                  </>
                ) : (
                  t("common_.delete")
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardManagement;
