import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/CatchAsync";
import {
  ModerationService,
  ModerationContext,
} from "../services/moderation.service";;
import { logger,LogLevel } from "../utils/logger";

export class ModerationController {
  static moderateContent = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { content, context } = req.body;

      if (!content) {
        const NotContentLogData = {
          level: LogLevel.WARN,
          message: "Content is required for moderation",
          action: "ModerateContent",
          userId: req.user?.id,
          meta: {
            context: context || {},
          },
        };
        
        logger.warn(NotContentLogData.message, {
          userId: NotContentLogData.userId,
          context: NotContentLogData.meta.context,
        });
        return next(AppError("Content is required for moderation"));
      }

      if (!context || !context.contentType) {

        return next(AppError("Context with contentType is required"));
      }

      const moderationContext: ModerationContext = {
        contentType: context.contentType,
        questionContext: context.questionContext,
        previousMessages: context.previousMessages,
        userRole: req.user?.role === "ADMIN" ? undefined : context.userRole,
      };

      const result = await ModerationService.moderateContent(
        content,
        moderationContext
      );

      const moderationLogData = {
        level: LogLevel.INFO,
        message: "Content moderation completed",
        action: "ModerateContent",
        userId: req.user?.id,
        meta: {
          content: content.substring(0, 50),
          result,
        },
      };
      
      logger.info(moderationLogData.message, {
        userId: moderationLogData.userId,
        content: moderationLogData.meta.content,
        result: moderationLogData.meta.result,
      });

      return res.status(200).json({
        success: true,
        message: "Content moderation completed",
        data: {
          result,
          content:
            content.substring(0, 100) + (content.length > 100 ? "..." : ""),
        },
      });
    }
  );

  static moderateMultiple = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { contents } = req.body;

      if (!Array.isArray(contents) || contents.length === 0) {
        return next(AppError("Contents array is required"));
      }

      if (contents.length > 10) {
        return next(AppError("Maximum 10 contents can be moderated at once"));
      }

      // Validate each content item
      for (const item of contents) {
        if (!item.content || !item.context || !item.context.contentType) {
          return next(
            AppError(
              "Each content item must have content and context with contentType"
            )
          );
        }
      }

      const moderationRequests = contents.map((item) => ({
        content: item.content,
        context: {
          contentType: item.context.contentType,
          questionContext: item.context.questionContext,
          previousMessages: item.context.previousMessages,
          userRole:
            req.user?.role === "ADMIN" ? undefined : item.context.userRole,
        } as ModerationContext,
      }));

      const results = await ModerationService.moderateMultipleContents(
        moderationRequests
      );

      const moderationLogData = {
        level: LogLevel.INFO,
        message: "Multiple content moderation completed",
        action: "ModerateMultipleContents",
        userId: req.user?.id,
        meta: {
          contentCount: contents.length,
          results,
          data: results.map((result, index) => ({
            ...result,
            originalContent:
              contents[index].content.substring(0, 100) +
              (contents[index].content.length > 100 ? "..." : ""),
          })),
        },
      };
      
      logger.info(moderationLogData.message, {
        userId: moderationLogData.userId,
        contentCount: moderationLogData.meta.contentCount,
        results: moderationLogData.meta.results,
      });

      return res.status(200).json({
        success: true,
        message: "Multiple content moderation completed",
        data: {
          results: results.map((result, index) => ({
            ...result,
            originalContent:
              contents[index].content.substring(0, 100) +
              (contents[index].content.length > 100 ? "..." : ""),
          })),
          totalModerated: results.length,
        },
      });
    }
  );

  // Helper method for inline moderation during content creation
  static async validateContentInline(
    content: string,
    context: ModerationContext
  ): Promise<{ isValid: boolean; message: string }> {
    const result = await ModerationService.moderateContent(content, context);

    return {
      isValid: result.isValid,
      message: result.message,
    };
  }
}
