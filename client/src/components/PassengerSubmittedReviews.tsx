import React, { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { getToken } from "./getToken";
import Pagination from "./Dashboard/Pagination";
import { useReactItems } from "@/lib/ReactTranslation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Calendar, MapPin, Quote, Star } from "lucide-react";
import CustomLoader from "./CustomLoader";
import { format } from "date-fns";

const fetchPassengerSubmittedReviews = async (page: number) => {
  const res = await axios.get(
    `https://staging.Your-Drive.ca/api/v1/ratings/passengers/submitted-reviews?page=${page}&pageSize=10&lang=EN`,
    {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    }
  );

  return res.data;
};

function PassengerSubmittedReviews() {
  const [page, setPage] = useState(1);
  const { t } = useReactItems();

  const { data, error, isLoading, isError } = useQuery({
    queryKey: ["passengerSubmittedReviews", page], // 👈 depends on page
    queryFn: () => fetchPassengerSubmittedReviews(page),
    placeholderData: true,
  });

  if (isLoading) return <CustomLoader />;

  if (isError) return <div>Error: {(error as Error).message}</div>;

  const reviews = data?.data?.reviews ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h2 className="text-2xl font-bold text-primary-900 dark:text-primary-100">
        {t("myReviews.title", "My Submitted Reviews")}
      </h2>

      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">
            {t(
              "myReviews.takeARide",
              "You haven't submitted any reviews yet. Please take a ride and share your experience!"
            )}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {reviews.map((review: any) => (
            <Card
              key={review.id}
              className="flex flex-col justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:shadow-xl transition-all duration-300 overflow-hidden group"
            >
              {/* Colored accent stripe */}
              <div className="h-1 w-full bg-gradient-to-r from-[rgb(102,159,169)] via-[rgb(26,99,115)] to-[rgb(21,79,92)]"></div>

              <CardHeader className="pt-4 pb-3">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-900 shadow-md">
                      <AvatarImage
                        src={review.driver?.profileImage?.url}
                        alt={review.driver?.firstName}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-[rgb(102,159,169)] to-[rgb(26,99,115)] text-white font-semibold">
                        {review.driver?.firstName?.charAt(0) || "D"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[rgb(26,99,115)] dark:bg-[rgb(102,159,169)] rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center">
                      <Star className="w-2 h-2 text-white" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                          {review.driver?.firstName || "Driver"}
                        </CardTitle>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[rgb(26,99,115)] dark:text-[rgb(102,159,169)]" />
                            {review.ride?.departureLocation?.city} →{" "}
                            {review.ride?.destinationLocation?.city}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            • {review.driver?.totalRatings || 0} reviews
                          </span>
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-xl font-bold text-[rgb(26,99,115)] dark:text-[rgb(102,159,169)]">
                          {review.rating}
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < review.rating
                                  ? "fill-[rgb(255,193,7)] text-[rgb(255,193,7)]"
                                  : "fill-gray-200 dark:fill-gray-700 text-gray-300 dark:text-gray-600"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="py-3">
                <div className="relative bg-gray-50 dark:bg-gray-800/30 rounded-lg p-4">
                  <Quote className="absolute top-3 left-3 w-5 h-5 text-[rgb(102,159,169)]/30 dark:text-[rgb(26,99,115)]/30" />
                  <p className="text-gray-700 dark:text-gray-300 text-sm pl-6">
                    "{review.review}"
                  </p>
                </div>
              </CardContent>

              <CardFooter className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="w-full flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(review.createdAt), "MMM d, yyyy • h:mm a")}
                  </span>
                  <span className="text-[rgb(26,99,115)] dark:text-[rgb(102,159,169)] font-medium">
                    {t("myReviews.ride", "Ride")} #{review.ride?.id}
                  </span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* --- PAGINATION --- */}
      {totalPages > 1 && (
        <Pagination
          setPage={setPage}
          page={page}
          totalPages={totalPages}
          t={t}
        />
      )}
    </div>
  );
}

export default PassengerSubmittedReviews;
