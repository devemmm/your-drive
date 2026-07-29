import { catchAsync } from "../utils/CatchAsync";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { RatingReviewService } from "../services/ratingReview.service";
import { AppError } from "../utils/AppError";
import { matchedData } from "express-validator";
import { ModerationController } from "./moderation.controller";

export class ReviewRatingController {
  static createReview = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { driverId, rating, rideId, review } = matchedData<{
        driverId: number;
        rating: number;
        rideId: number;
        review?: string;
      }>(req);
      const userId = req.user!.id;

      const isEN = req.isEnglishPreferred;

      // Check if ride exists, is completed and not deleted/blocked
      const ride = await prisma.ride.findUnique({
        where: {
          id: rideId,
          driverId,
          status: "COMPLETED",
          isBlocked: false,
          isDeleted: false,
        },
        include: {
          _count: {
            select: {
              reviews: {
                where: {
                  userId,
                },
              },
            },
          },
        },
      });

      if (!ride) {
        return next(
          AppError(
            isEN
              ? "No valid completed ride found to review."
              : "Aucun trajet terminé valide trouvé pour évaluation.",
            400
          )
        );
      }

      if (ride._count.reviews > 0) {
        return next(
          AppError(
            isEN
              ? "You have already reviewed this ride."
              : "Vous avez déjà évalué ce trajet.",
            400
          )
        );
      }

      // Content moderation for review text (if provided)
      if (review && review.trim()) {
        const moderationResult =
          await ModerationController.validateContentInline(review.trim(), {
            contentType: "review",
            userRole: "USER",
            questionContext: `Review for ride ID: ${rideId}, Driver ID: ${driverId}`,
          });

        if (!moderationResult.isValid) {
          return next(
            AppError(
              isEN
                ? moderationResult.message
                : "Le contenu de l'évaluation n'est pas approprié.",
              400
            )
          );
        }
      }

      const newReview = await RatingReviewService.createRatingReview(
        driverId,
        rideId,
        rating,
        review,
        userId,
      );

      res.status(201).json({
        success: true,
        message: isEN
          ? "Review and rating submitted successfully."
          : "Avis et note soumis avec succès.",
        data: newReview,
      });
    }
  );

  static getReviewsByDriverId = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        driverId,
        page = 1,
        pageSize = 10,
      } = matchedData(req, {
        locations: ["params", "query"],
      });
      const isEN = req.isEnglishPreferred;
      const driver = await prisma.user.findFirst({
        where: {
          id: driverId,
        },
      });

      if (!driver) {
        return next(
          AppError(isEN ? "Driver not found" : "Chauffeur introuvable.", 404)
        );
      }

      const reviews = await RatingReviewService.getDriverReviews(
        driverId,
        page,
        pageSize
      );

      res.status(200).json({
        success: true,
        data: reviews,
      });
    }
  );

  static getMyReviewsAsADriver = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        page = 1,
        pageSize = 10,
      } = matchedData(req, {
        locations: ["params", "query"],
      });
      const driverId = req.user!.id;
      const reviews = await RatingReviewService.getDriverReviews(
        driverId,
        page,
        pageSize
      );

      res.status(200).json({
        success: true,
        data: reviews,
      });
    }
  );

  static getMySubmittedReviewsAsAPassenger = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        page = 1,
        pageSize = 10,
      } = matchedData(req, {
        locations: ["params", "query"],
      });
      const userId = req.user!.id;
      const [reviews, count] = await prisma.$transaction([
        prisma.review.findMany({
          where: { userId },
          include: {
            driver: {
              select: {
                id: true,
                firstName: true,
                profileImage: true,
                averageRating: true,
                totalRatings: true,
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
        prisma.review.count({ where: { userId } })
      ])

      res.status(200).json({
        success: true,
        data: {
          reviews,
          pagination: {
            page,
            pageSize,
            total: count,
            totalPages: Math.ceil(count / pageSize),
          },
        },
      });
    }
  );

  static getRatingById = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = matchedData<{ id: number }>(req);
      const isEN = req.isEnglishPreferred;

      const rating = await prisma.review.findUnique({
        where: { id },
        include: {
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
          driver: {
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

      if (!rating) {
        return res.status(404).json({
          success: false,
          message: isEN ? "Rating not found." : "Évaluation non trouvée.",
        });
      }

      res.status(200).json({
        success: true,
        message: isEN
          ? "Rating retrieved successfully."
          : "Évaluation récupérée avec succès.",
        data: rating,
      });
    }
  );

  static updateReview = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id, rating, review } = matchedData<{
        id: number;
        rating?: number;
        review?: string;
      }>(req, {
        locations: ["params", "body"],
      });

      const userId = req.user!.id;
      const isEN = req.isEnglishPreferred;
      const existingRating = await prisma.review.findFirst({
        where: {
          id: id,
        },
      });
      if (!existingRating) {
        return res.status(404).json({
          success: false,
          message: isEN ? "Rating not found." : "Évaluation non trouvée.",
        });
      }

      if (existingRating.userId !== userId) {
        return next(
          AppError(
            isEN
              ? "You do not have permission to delete this review."
              : "Vous n'êtes pas autorisé à supprimer cet avis.",
            403
          )
        );
      }

      const updatedReview = await RatingReviewService.updateReview(
        id,
        userId,
        rating,
        review
      );

      res.status(200).json({
        success: true,
        message: isEN
          ? "Review updated successfully."
          : "Avis mis à jour avec succès.",
        data: updatedReview,
      });
    }
  );

  static deleteReview = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = matchedData<{ id: number }>(req);
      const userId = req.user!.id;
      const isEN = req.isEnglishPreferred;

      const existingRating = await prisma.review.findFirst({
        where: {
          id: id,
        },
      });
      if (!existingRating) {
        return res.status(404).json({
          success: false,
          message: isEN ? "Rating not found." : "Évaluation non trouvée.",
        });
      }
      if (existingRating.userId !== userId) {
        return next(
          AppError(
            isEN
              ? "You do not have permission to delete this review."
              : "Vous n'êtes pas autorisé à supprimer cet avis.",
            403
          )
        );
      }

      await RatingReviewService.deleteReview(id);

      res.status(200).json({
        success: true,
        message: isEN
          ? "Review deleted successfully."
          : "Avis supprimé avec succès.",
      });
    }
  );
}
