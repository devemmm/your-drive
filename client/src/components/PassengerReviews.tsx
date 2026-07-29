import { apiUrl, queryKey, usePassengerReviewsInfinite } from "@/data";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CheckCircle, Clock, Star, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getToken } from "./getToken";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const PassengerReviews = ({ driverId }) => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    usePassengerReviewsInfinite(driverId);

  console.log({ driverReviews: data });

  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editedRating, setEditedRating] = useState(0);
  const [editedComment, setEditedComment] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState(null);

  const driverReviews =
    data?.pages.flatMap((page) => page?.reviews ?? []) ?? [];
  const { t } = useTranslation();

  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const queryClient = useQueryClient();

  // const handleEditClick = (review) => {
  //   setEditingReviewId(review.id);
  //   setEditedRating(review.rating);
  //   setEditedComment(review.review);
  // };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setEditedRating(0);
    setEditedComment("");
  };

  //   Update Review Mutation
  const { mutate: updateReview, isPending: isUpdating } = useMutation({
    mutationFn: async ({ reviewId }: { reviewId: number }) => {
      const { data } = await axios.put(
        `${apiUrl}/api/v1/ratings/${reviewId}?lang=${currentLanguage}`,
        {
          rating: editedRating,
          review: editedComment,
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
      toast.success("Review updated successfully.");
      queryClient.invalidateQueries({
        queryKey: [queryKey.PASSENGER_REVIEWS],
      });
      setEditingReviewId(null);
    },
    onError: (error) => {
      toast.error(
        (error as any)?.response?.data?.message || "Failed to update review.",
        { className: "custom-error-toast" }
      );
    },
  });

  const handleUpdateReview = (reviewId: number) => {
    updateReview({ reviewId });
  };

  //   Delete Review Mutation
  const { mutate: deleteReview, isPending: isDeleting } = useMutation({
    mutationFn: async (reviewId: number) => {
      const { data } = await axios.delete(
        `${apiUrl}/api/v1/ratings/${reviewId}?lang=${currentLanguage}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      return data;
    },
    onSuccess: () => {
      toast.success("Review deleted successfully.");
      queryClient.invalidateQueries({
        queryKey: [queryKey.PASSENGER_REVIEWS],
      });
      setIsDeleteDialogOpen(false);
      setSelectedReviewId(null);
    },
    onError: (error) => {
      toast.error(
        (error as any)?.response?.data?.message || "Failed to delete review.",
        { className: "custom-error-toast" }
      );
    },
  });

  const handleDeleteReview = (reviewId: number) => {
    deleteReview(reviewId);
  };

  const renderStars = (rating, editable = false, onChange = null) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          onClick={editable ? () => onChange(i) : null}
          className={`${editable ? "cursor-pointer" : "cursor-default"}`}
          disabled={!editable}
        >
          {i <= rating ? (
            <Star size={16} className="text-yellow-400 fill-current" />
          ) : (
            <Star
              size={16}
              className="text-gray-300 dark:text-gray-600 fill-current"
            />
          )}
        </button>
      );
    }
    return stars;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold dark:text-white">
        {t("RideDetail.reviews")}
      </h2>

      {driverReviews.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          {t("RideDetail.noReviews")}
        </p>
      ) : (
        <div className="space-y-4">
          {driverReviews.map((review) => (
            <div
              key={review.id}
              className="border-b border-gray-200 dark:border-gray-700 pb-4"
            >
              {editingReviewId === review.id ? (
                <Card className="dark:bg-gray-900">
                  <CardContent className="space-y-4">
                    {/* Editable Star Rating */}
                    <div className="flex flex-col items-center space-y-4">
                      <div className="flex items-center space-x-2 pt-10">
                        {renderStars(editedRating, true, setEditedRating)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("RideDetail.selectRating")}
                      </p>
                    </div>

                    {/* Editable Comment Field */}
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                        value={editedComment}
                        onChange={(e) => setEditedComment(e.target.value)}
                      />
                    </div>

                    {/* Edit Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={handleCancelEdit}
                        disabled={isUpdating}
                      >
                        <X className="h-4 w-4 mr-2" />
                        {t("common.cancel")}
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => {
                          handleUpdateReview(review.id);
                        }}
                        disabled={isUpdating || editedRating === 0}
                      >
                        {isUpdating ? (
                          t("RideDetail.submitting")
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {t("RideDetail.update")}
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-start gap-3">
                  <img
                    src={
                      review?.reviewer?.profileImage?.url ||
                      "/default-avatar.png"
                    }
                    alt={review?.reviewer?.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-start gap-2">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {review?.user?.name}
                        </h3>
                        <div className="flex items-center gap-1 mt-1">
                          {renderStars(review?.rating)}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {review?.reviewer?.firstName}
                        </span>
                      </div>
                    </div>

                    <p className="mt-2 text-gray-700 dark:text-gray-300">
                      {review.review}
                    </p>

                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <Clock size={14} />
                      <span>
                        {t("RideDetail.ride")}:{" "}
                        {review.ride.departureLocation.city} →{" "}
                        {review.ride.destinationLocation.city}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] mt-3 text-gray-500 dark:text-gray-400">
                        {formatDate(review?.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="text-sm text-blue-600 dark:text-blue-400 underline mt-4"
        >
          {isFetchingNextPage
            ? t("PaymentDialog.Subscription.loading")
            : t("PaymentDialog.Subscription.loadMore")}
        </button>
      )}

      {/* create model to confirm delete */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.confirmDelete")}</DialogTitle>
            <DialogDescription>
              {t("common.confirmDeleteDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                handleDeleteReview(selectedReviewId);
              }}
            >
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PassengerReviews;
