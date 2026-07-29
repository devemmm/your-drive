import { ReviewType } from "@prisma/client";
import { prisma } from "../config/database";

export class RatingReviewService {
  static async createRatingReview(
    driverId: number,
    rideId: number,
    rating: number,
    review?: string,
    userId?: number,
    reviewType?: ReviewType
  ) {
    // Create new review
    const newRatingReview = await prisma.review.create({
      data: {
        rideId,
        userId,
        driverId,
        rating,
        ...review && { review },
        ...reviewType && { type: reviewType },
      },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    });

    // Update driver's average rating
    await this.updateDriverAverageRating(driverId);

    return newRatingReview;
  }

  static async updateDriverAverageRating(driverId: number) {
    const result = await prisma.review.aggregate({
      where: { driverId },
      _avg: { rating: true },
      _count: { id: true },
    });

    await prisma.user.update({
      where: { id: driverId },
      data: {
        averageRating: result._avg.rating || 0,
        totalRatings: result._count.id,
      },
    });
  }

  static async getDriverReviews(
    driverId: number,
    page: number,
    pageSize: number
  ) {
    const [reviews, aggResult] = await Promise.all([
      prisma.review.findMany({
        where: { driverId },
        include: {
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
          ride: {
            select: {
              id: true,
              departureLocation: true,
              destinationLocation: true,
              departureTime: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.review.aggregate({
        where: { driverId },
        _avg: { rating: true },
        _count: { id: true}
      }),
    ]);

    const total = aggResult._count.id;

    return {
      averageRating: aggResult._avg.rating || 0,
      totalReviews: total,
      reviews,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  static async updateReview(
    reviewId: number,
    userId: number,
    rating?: number,
    review?: string,
  ) {
    const updatedReview = await prisma.review.update({
      where: {
        id: reviewId,
        userId,
      },
      data: { ...rating && { rating }, ...review && { review } },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        ride: {
          select: {
            id: true,
            departureLocation: true,
            destinationLocation: true,
          },
        },
      },
    });
    await this.updateDriverAverageRating(updatedReview.driverId);

    return updatedReview;
  }

  static async deleteReview(reviewId: number) {
    const review = await prisma.review.delete({
      where: { id: reviewId },
    });
    await this.updateDriverAverageRating(review.driverId);
  }
}