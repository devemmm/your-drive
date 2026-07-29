import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Clock,
  User,
  Car,
  DollarSign,
  CheckCircle,
  CreditCard,
  MessageCircle,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface BookingSummaryProps {
  booking: any;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({ booking }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t("bookingSummary.title", "Booking Confirmed!")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t(
              "bookingSummary.subtitle",
              "Your ride has been successfully booked"
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  {t("bookingSummary.route", "Route Information")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {booking?.ride?.departureLocation?.city},{" "}
                      {booking?.ride?.departureLocation?.region}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {booking?.ride?.departureLocation?.address}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {booking?.ride?.destinationLocation?.city},{" "}
                      {booking?.ride?.destinationLocation?.region}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {booking?.ride?.destinationLocation?.address}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  {t("bookingSummary.tripDetails", "Trip Details")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t("bookingSummary.departureTime", "Departure Time")}
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {booking?.ride?.departureTime
                        ? new Date(booking.ride.departureTime).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t("bookingSummary.seatsBooked", "Seats Booked")}
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {booking?.seatsBooked || 1}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  {t("bookingSummary.paymentSummary", "Payment Summary")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t("bookingSummary.total", "Total")}
                  </span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">
                    ${booking?.totalAmount || 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("bookingSummary.actions", "Actions")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() =>
                    navigate(`/ride-details?rideId=${booking?.ride?.id}`)
                  }
                  className="w-full"
                  variant="outline"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {t("bookingSummary.viewRideDetails", "View Ride Details")}
                </Button>
                <Button
                  onClick={() => navigate(`/chat?rideId=${booking?.ride?.id}`)}
                  className="w-full"
                  variant="outline"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {t("bookingSummary.messageDriver", "Message Driver")}
                </Button>
                <Button onClick={() => navigate("/ride")} className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  {t("bookingSummary.viewAllRides", "View All Rides")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSummary;
