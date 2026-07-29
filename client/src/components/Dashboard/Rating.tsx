import { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { CheckCircle, Star } from "lucide-react";
import { Button } from "../ui/button";
import { useReactItems } from "@/lib/ReactTranslation";
import { getToken } from "../getToken";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { apiUrl, queryKey } from "@/data";

export default function Rating({
  driverId,
  rideId,
}: {
  driverId: number;
  rideId: number;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const { t, queryClient } = useReactItems();

  const { mutate: submitRating, isPending: isSubmittingRating } = useMutation({
    mutationFn: async ({
      driverId,
      rating,
      review,
      rideId,
    }: {
      driverId: number;
      rating: number;
      review: string;
      rideId: number;
    }) => {
      const { data } = await axios.post(
        `${apiUrl}/api/v1/ratings`,
        {
          driverId,
          rating,
          review,
          rideId,
        },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      return data;
    },
    onSuccess: () => {
      setRating(0);
      setComment("");
      toast.success(t("RideDetail.ratingSubmitted"));
      if (driverId) {
        queryClient.invalidateQueries({
          queryKey: [queryKey.PASSENGER_REVIEWS, driverId],
        });
      }
    },
    onError: (error: any) => {
      console.error("Failed to submit rating:", error);
      toast.error(
        error?.response?.data?.message || t("RideDetail.ratingError"),
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  const handleSubmitRating = () => {
    if (rating === 0) return;

    submitRating({
      driverId: driverId,
      rating,
      review: comment,
      rideId: rideId,
    });
  };

  return (
    <Card className="sticky top-16 dark:bg-gray-900">
      <CardHeader>
        <h2 className="text-lg font-semibold">
          {t("RideDetail.rateYourDriver")}
        </h2>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="text-2xl focus:outline-none"
                aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
              >
                {star <= rating ? (
                  <Star className="h-8 w-8 fill-yellow-400 text-yellow-400" />
                ) : (
                  <Star className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                )}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("RideDetail.selectRating")}
          </p>
        </div>

        {/* Comment Field */}
        <div className="space-y-2">
          <label htmlFor="comment" className="block text-sm font-medium">
            {t("RideDetail.additionalComments")} ({t("RideDetail.optional")})
          </label>
          <textarea
            id="comment"
            rows={3}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            placeholder={t("RideDetail.commentPlaceholder")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {/* Submit Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={() => handleSubmitRating()}
          disabled={isSubmittingRating || rating === 0}
        >
          {isSubmittingRating ? (
            <>{t("RideDetail.submitting")}</>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              {t("RideDetail.submitRating")}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
