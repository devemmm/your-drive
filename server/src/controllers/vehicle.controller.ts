import { catchAsync } from "../utils/CatchAsync";
import { Request, Response, NextFunction } from "express";
import { matchedData } from "express-validator";
import {
  ChageDefaultVehicleImage,
  VehicleInput,
} from "../middlewares/validators/vehicle.request.validator";
import { AppError } from "../utils/AppError";
import {
  Asset,
  AssetCategory,
  AssetType,
  Prisma,
  Ride,
  UserRole,
  Vehicle,
  FuelPolicy,
} from "@prisma/client";
import { DbUser, fileSelects, profileSelects } from "../types";
import { VehicleService } from "../services/vehicle.service";
import storageService from "../services/storage.service";
import { prisma } from "../config/database"; 
import { logger,LogLevel } from "../utils/logger";

export class VehicleController {
  // Create a new vehicle
  static createVehicle = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const matched_ata = matchedData<VehicleInput>(req);
      // Multer .fields(...) returns an object keyed by field name. We keep
      // "images" semantics (required) and treat the three KYC doc fields as
      // optional uploads that may arrive on a follow-up edit.
      const fileMap = req.files as Record<string, Express.Multer.File[]> | undefined;
      const files = fileMap?.images;
      const yellowCardFile = fileMap?.yellowCard?.[0];
      const insuranceFile = fileMap?.insurance?.[0];
      const authorizationFile = fileMap?.authorization?.[0];
      const user = req.user!;

      const userId = user.id;

      const isEnglishPreferred = req.isEnglishPreferred;
      // Check if user is admin
    if (user.role === UserRole.ADMIN) {
      return next(
        AppError(
          isEnglishPreferred
          ? "Admins are not allowed": "Les administrateurs ne sont pas autorisés",
          403
        )
      );
    }

      // Gate: only drivers whose KYC is APPROVED can add a vehicle.
      const driver = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { kycStatus: true },
      });
      if (driver.kycStatus !== "APPROVED") {
        return next(
          AppError(
            isEnglishPreferred
              ? driver.kycStatus === "REJECTED"
                ? "Your driver documents were rejected. Update them and resubmit before adding a vehicle."
                : "Your driver documents are awaiting admin approval. You can add a vehicle once approved."
              : driver.kycStatus === "REJECTED"
                ? "Vos documents de conducteur ont été rejetés. Mettez-les à jour et soumettez-les à nouveau avant d'ajouter un véhicule."
                : "Vos documents de conducteur sont en attente d'approbation par l'administrateur.",
            403
          )
        );
      }

      if (!files || !files.length) {
        const notFilesLogData = {
          level: LogLevel.ERROR,
          message: isEnglishPreferred
            ? "No files uploaded"
            : "Aucun fichier téléchargé",
          action: "CreateVehicle",
          userId,
          meta: {
            isEnglishPreferred,
          },
        };
        logger.error(notFilesLogData.message, {
          level: notFilesLogData.level,
          action: notFilesLogData.action,
          userId: notFilesLogData.userId,
          isEnglishPreferred: notFilesLogData.meta.isEnglishPreferred,
        });
        return next(
          AppError(
            isEnglishPreferred
              ? "No files uploaded"
              : "Aucun fichier téléchargé",
            422
          )
        );
      }

      // const { optimizedFiles, errors } = await validateAndOptimizeImages(
      //   files,
      //   { language: isEnglishPreferred? Language.EN: Language.FR }
      // );
      // if (!optimizedFiles.length) {
      //   const notValidFilesLogData = {
      //     level: LogLevel.ERROR,
      //     message: isEnglishPreferred
      //       ? `No valid image uploaded, ${errors.join(".\n ")}`
      //       : `Aucune image valide téléchargée, ${errors.join(".\n ")}`,
      //     action: "CreateVehicle",
      //     userId: undefined,
      //     meta: {
      //       isEnglishPreferred,
      //       errors,
      //     },
      //   };
        
      //   logger.error(notValidFilesLogData.message, {
      //     level: notValidFilesLogData.level,
      //     action: notValidFilesLogData.action,
      //     userId: notValidFilesLogData.userId,
      //     isEnglishPreferred: notValidFilesLogData.meta.isEnglishPreferred,
      //   });
      //   return next(
      //     AppError(
      //       isEnglishPreferred
      //         ? `No valid image uploaded, ${errors.join(".\n ")}`
      //         : `Aucune image valide téléchargée, ${errors.join(".\n ")}`,
      //       422
      //     )
      //   );
      // }
      const vehicle = await VehicleService.createVehicle({
        ...matched_ata,
        user: { connect: { id: userId } },
      });

      const uploadedImages = await storageService.uploadMultipleBuffers(
        files,
        "Your-Drive/vehicles"
      );

      // Upload optional KYC docs (yellow card, insurance, authorization) and
      // attach each to the vehicle's files relation with the right category.
      const docUploads: { buf: Express.Multer.File; category: AssetCategory }[] = [];
      if (yellowCardFile) docUploads.push({ buf: yellowCardFile, category: AssetCategory.YELLOW_CARD });
      if (insuranceFile) docUploads.push({ buf: insuranceFile, category: AssetCategory.VEHICLE_INSURANCE });
      if (authorizationFile) docUploads.push({ buf: authorizationFile, category: AssetCategory.VEHICLE_AUTHORIZATION });
      const uploadedDocs = docUploads.length
        ? await storageService.uploadMultipleBuffers(
            docUploads.map((d) => d.buf),
            "Your-Drive/vehicle-docs",
          )
        : [];

      const completedVehicle = await VehicleService.updateVehicle(
        vehicle.id,
        {
          files: {
            createMany: {
              data: [
                ...uploadedImages
                  .filter((img) => !!img)
                  .map((image) => ({
                    url: image.secure_url,
                    publicId: image.public_id,
                    type: AssetType.IMAGE,
                    category: AssetCategory.VEHICLE_IMAGE,
                  })),
                ...uploadedDocs
                  .map((doc, idx) => doc ? {
                    url: doc.secure_url,
                    publicId: doc.public_id,
                    type: AssetType.IMAGE,
                    category: docUploads[idx].category,
                  } : null)
                  .filter((d): d is NonNullable<typeof d> => d !== null),
              ],
            },
          },
        },
        {
          files: {
            select: { ...fileSelects, userId: false },
          },
          defaultImage: {
            select: { ...fileSelects, userId: false },
          },
          user: {
            select: profileSelects,
          }
        }
      );

      return res.status(201).json({
        success: true,
        data: completedVehicle,
      });
    }
  );

  // Add more images to tthe vehicle
  static addImagesToVehicle = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const matched_ata = matchedData<{ vehicleId: number }>(req);
      const files = req.files as Express.Multer.File[] | undefined;
      const user = req.user! as DbUser;

      const userId = user.id;

      const isEnglishPreferred = (req as any).isEnglishPreferred as boolean;

      if (!files || !files.length) {
        const notUploadedFilesLogData = {
            level: LogLevel.ERROR,
            message: isEnglishPreferred
              ? "No uploaded images."
              : "Aucune image téléchargée.",
            action: "AddImagesToVehicle",
            meta: {
              userId: req.user?.id,
              isEnglishPreferred,
            },
          };
          
        logger.error(notUploadedFilesLogData.message, {
          level: notUploadedFilesLogData.level,
          action: notUploadedFilesLogData.action,
          meta: notUploadedFilesLogData.meta,
        });
        return next(
          AppError(
            isEnglishPreferred
              ? "Please upload images to add to the vehicle"
              : "Veuillez télécharger des images à ajouter au véhicule",
            422
          )
        );
      }
      
      const vehicleToUpdate = await prisma.vehicle.findFirst({
        where: { id: matched_ata.vehicleId, userId },
        include: {
          _count: { select: { files: { where: { vehicleId: matched_ata.vehicleId }} } },
        },
      });
      if (!vehicleToUpdate) {
        return next(
          AppError(
            isEnglishPreferred ? "Vehicle not found" : "Véhicule non trouvé",
            404
          )
        );
      }
      if (vehicleToUpdate._count.files >= 4) {
        return next(
          AppError(
            isEnglishPreferred
              ? "The vehicle can have up to 4 images"
              : "Le véhicule peut avoir jusqu'à 4 images.",
            400
          )
        );
      }

      // const { optimizedFiles, errors } = await validateAndOptimizeImages(
      //   files,
      //   { language: isEnglishPreferred? Language.EN: Language.FR }
      // );
      // if (!optimizedFiles.length) {
      //   return next(
      //     AppError(
      //       isEnglishPreferred
      //         ? `No valid image uploaded, ${errors.join(".\n ")}`
      //         : `Aucune image valide téléchargée, ${errors.join(".\n ")}`,
      //       422
      //     )
      //   );
      // }

      const uploadedImages = await storageService.uploadMultipleBuffers(
        files.slice(0, 4 - vehicleToUpdate._count.files),
        "Your-Drive/vehicles"
      );
      const updatedVehicle = await VehicleService.updateVehicle(
        vehicleToUpdate.id,
        {
          files: {
            createMany: {
              data: uploadedImages
                .filter((img) => !!img)
                .map((image) => {
                  return {
                    url: image.secure_url,
                    publicId: image.public_id,
                    type: AssetType.IMAGE,
                    category: AssetCategory.VEHICLE_IMAGE,
                  };
                }),
            },
          },
        },
        {
          files: {
            select: { ...fileSelects, userId: false },
          },
          defaultImage: {
            select: { ...fileSelects, userId: false },
          },
          user: {
            select: profileSelects,
          }
        }
      );
      const addImagesToVehicleLogData = {
        level: LogLevel.INFO,
        message: isEnglishPreferred
          ? "Images added to vehicle."
          : "Images ajoutées au véhicule.",
        action: "AddImagesToVehicle",
        meta: {
          userId: req.user?.id,
          isEnglishPreferred,
          data: updatedVehicle,
        },
      };
      
      logger.info(addImagesToVehicleLogData.message, {
        level: addImagesToVehicleLogData.level,
        action: addImagesToVehicleLogData.action,
        meta: addImagesToVehicleLogData.meta,
      }); 
      return res.status(200).json({
        success: true,
        data: updatedVehicle,
      });
    }
  );

  // Get a vehicle by ID
  static getVehicleById = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const data = matchedData<{ vehicleId: number }>(req);

      const isEnglishPreferred = (req as any).isEnglishPreferred as boolean;
      const isAdmin = user.role === UserRole.ADMIN;
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: data.vehicleId, ...!isAdmin && { userId: user.id} },
        include: {

          files: {
            select: { ...fileSelects, userId: false },
          },
          defaultImage: {
            select: { ...fileSelects, userId: false },
          },
          user: {
            select: profileSelects,
          }
        }
        });
         if (!vehicle) {
        return next(
          AppError(
            isEnglishPreferred ? "Vehicle not found" : "Véhicule non trouvé",
            404
          )
        );
      }
      return res.status(200).json({
        success: true,
        data: vehicle,
      });
    }
  );

  // Set or change the default image of the vehicle
  static setDefaultImage = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const data = matchedData<ChageDefaultVehicleImage>(req);

      const isEnglishPreferred = (req as any).isEnglishPreferred as boolean;
      const vehehicleToUpdate = await prisma.vehicle.findFirst({
        where: { id: data.vehicleId, userId: user.id },
        include: {
          files: {
            where: {
              id: data.imageId,
            },
          },
        },
      });
      if (!vehehicleToUpdate) {
        return next(
          AppError(
            isEnglishPreferred ? "Vehicle not found" : "Véhicule non trouvé",
            404
          )
        );
      }
      if (
        !vehehicleToUpdate.files.length ||
        vehehicleToUpdate.files[0].id != data.imageId
      ) {
        return next(
          AppError(
            isEnglishPreferred
              ? "The chosen image to use as default, is not found in the list this vehicle's images"
              : "L'image choisie comme par défaut n'est pas trouvée dans la liste des images de ce véhicule.",
            404
          )
        );
      }
      const updatedVehicle = await prisma.vehicle.update({
        where: { id: data.vehicleId },
        data: {
          defaultImageId: data.imageId,
        },
        include: {
          files: {
            select: { ...fileSelects, userId: false },
          },
          defaultImage: {
            select: { ...fileSelects, userId: false },
          },
          user: {
            select: profileSelects,
          }
        },
      });
      // const setDefaultImageLogData = {
      //   level: LogLevel.INFO,
      //   message: isEnglishPreferred
      //     ? "Default image set successfully."
      //     : "Image par défaut définie avec succès.",
      //   action: "SetDefaultImage",
      //   userId: req.user?.id,
      //   meta: {
      //     vehicleId: data.vehicleId,
      //     data: updatedVehicle,
      //     firstName: req.user?.firstName,
      //     lastName: req.user?.lastName,
      //   },
      // };
      
      // logger.info(setDefaultImageLogData.message, {
      //   level: setDefaultImageLogData.level,
      //   action: setDefaultImageLogData.action,
      //   meta: setDefaultImageLogData.meta,
      // });
      return res.status(200).json({
        success: true,
        data: updatedVehicle,
      });
    }
  );

  // Update a single image of the vehicle
  static updateVehicleImage = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const data = matchedData<ChageDefaultVehicleImage>(req);

      const isEnglishPreferred = (req as any).isEnglishPreferred as boolean;
      const file = req.file;
      if (!file) {
        return next(
          AppError(
            isEnglishPreferred
              ? "No image uploaded."
              : "Aucune image téléchargée.",
            422
          )
        );
      }

      // const { optimizedFiles, errors } = await validateAndOptimizeImages(
      //   [file],
      //   { language: isEnglishPreferred? Language.EN: Language.FR }
      // );
      // if (!optimizedFiles.length) {
      //   return next(
      //     AppError(
      //       isEnglishPreferred
      //         ? `The uploaded image is invalid, ${errors.join(".\n ")}`
      //         : `L'image téléchargée est invalide, ${errors.join(".\n ")}`,
      //       422
      //     )
      //   );
      // }

      const vehehicleToUpdate = await prisma.vehicle.findFirst({
        where: { id: data.vehicleId, userId: user.id },
        include: {
          files: {
            where: {
              id: data.imageId,
            },
          },
        },
      });
      if (!vehehicleToUpdate) {
        return next(
          AppError(
            isEnglishPreferred ? "Vehicle not found" : "Véhicule non trouvé",
            404
          )
        );
      }
      if (
        !vehehicleToUpdate.files.length ||
        vehehicleToUpdate.files[0].id != data.imageId
      ) {
        return next(
          AppError(
            isEnglishPreferred
              ? "The chosen image to use as default, is not found in the list this vehicle's images"
              : "L'image choisie comme par défaut n'est pas trouvée dans la liste des images de ce véhicule.",
            404
          )
        );
      }
      const uploadResult = await storageService.uploadBuffer(
        file,
        "Your-Drive/vehicles"
      );

      if (!uploadResult) {
        return next(
          AppError(
            isEnglishPreferred
              ? "Error in saving the image, please try again"
              : "Erreur dans l'enregistrement de l'image, veuillez réessayer",
            500
          )
        );
      }

      const updatedVehicle = await prisma.vehicle.update({
        where: { id: data.vehicleId },
        data: {
          files: {
            update: {
              where: {
                id: data.imageId,
              },
              data: {
                url: uploadResult.secure_url,
                publicId: uploadResult.public_id,
              },
            },
          },
        },
        include: {
          files: {
            select: { ...fileSelects, userId: false },
          },
          defaultImage: {
            select: { ...fileSelects, userId: false },
          },
          user: {
            select: profileSelects,
          }
        },
      });
      // const setDefaultImageLogData = {
      //   level: LogLevel.INFO,
      //   message: isEnglishPreferred
      //     ? "Default image set successfully."
      //     : "Image par défaut définie avec succès.",
      //   action: "SetDefaultImage",
      //   userId: req.user?.id,
      //   meta: {
      //     vehicleId: data.vehicleId,
      //     data: updatedVehicle,
      //     firstName: req.user?.firstName,
      //     lastName: req.user?.lastName,

      //   },
      // };
      
      // logger.info(setDefaultImageLogData.message, {
      //   level: setDefaultImageLogData.level,
      //   action: setDefaultImageLogData.action,
      //   meta: setDefaultImageLogData.meta,
      // });
      return res.status(200).json({
        success: true,
        data: updatedVehicle,
      });
    }
  );

  // Get all vehicles
  static getAllVehicles = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const { page = 1, pageSize = 10 } = req.query;

      const isAdmin = user.role === UserRole.ADMIN;
      const where: Prisma.VehicleWhereInput = {
        userId: user.id,
      };
      const { vehicles, total } = await VehicleService.getAllVehicles(
        isAdmin ? undefined : where,
        +page,
        +pageSize,
        undefined,
        {
          defaultImage: {
            select: { ...fileSelects, userId: false },
          },
          files: {
            select: { ...fileSelects, userId: false },
          },
          user: {
            select: profileSelects,
          }
        }
      );
      res.status(200).json({
        success: true,
        data: vehicles,
        pagination: {
          page: +page,
          pageSize: +pageSize,
          total,
          totalPages: Math.ceil(total / +pageSize),
        },
      });
    }
  );

  // Update a vehicle by ID
  static updateVehicle = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const data = matchedData<Partial<VehicleInput>>(req);

      const user = req.user as DbUser;
      const isEN = (req as any).isEnglishPreferred as boolean;

      if (Object.keys(data).length === 0) {
        return next(
          AppError(
            isEN
              ? "At least one field must be provided to update the vehicle."
              : "Au moins un champ doit être fourni pour mettre à jour le véhicule.",
            422
          )
        );
      }

      const vehicleId = +req.params.vehicleId;

      const vehehicleToUpdate = await prisma.vehicle.findFirst({
        where: { id: vehicleId, userId: user.id },
      });
      if (!vehehicleToUpdate) {
        return next(
          AppError(isEN ? "Vehicle not found" : "Véhicule non trouvé", 404)
        );
      }

      const vehicle = await VehicleService.updateVehicle(
        vehicleId,
        {
          ...data,
          ...data.year && {
            year: +data.year
          }
        },
        {
          defaultImage: {
            select: { ...fileSelects, userId: false },
          },
          files: {
            select: { ...fileSelects, userId: false },
          },
          user: {
            select: profileSelects,
          }
        }
      );

      return res.status(200).json({ success: true, data: vehicle });
    }
  );

  // Delete a vehicle by ID
  static deleteVehicle = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const data = matchedData<{ vehicleId: number }>(req);

      const isEnglishPreferred = req.isEnglishPreferred;
      const vehehicleToDelete = (await VehicleService.findOneVehicle({
        where: { id: data.vehicleId, userId: user.id },
        include: {
          files: true,
          rides: true,
        },
      })) as (Vehicle & { files: Asset[], rides: Ride[] }) | null;
      if (!vehehicleToDelete) {
        return next(
          AppError(
            isEnglishPreferred ? "Vehicle not found" : "Véhicule non trouvé",
            404
          )
        );
      }
      if (vehehicleToDelete.rides.length > 0) {
        return next(
          AppError(
            isEnglishPreferred
              ? "Cannot delete a vehicle that has rides associated with it."
              : "Impossible de supprimer un véhicule qui a des trajets associés.",
            400
          )
        );
      }
      await VehicleService.deleteVehicle(vehehicleToDelete.id);
      await Promise.all(
        vehehicleToDelete.files.map(async (file) => {
          await storageService.deleteObject(file.publicId);
        })
      );
      const deleteVehicleLogData = {
        level: LogLevel.INFO,
        message: isEnglishPreferred
          ? "Vehicle deleted successfully."
          : "Véhicule supprimé avec succès.",
        action: "DeleteVehicle",
        userId: user.id,
        meta: {
          vehicleId: data.vehicleId,
          deleteBy: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        },
      };
      
      logger.info(deleteVehicleLogData.message, {
        level: deleteVehicleLogData.level,
        action: deleteVehicleLogData.action,
        meta: deleteVehicleLogData.meta,
      });
      return res.sendStatus(204);
    }
  );

  // Update rental settings for a vehicle
  static updateRentalSettings = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const data = matchedData<{
        vehicleId: number;
        isAvailableForRental?: boolean;
        hourlyRate?: number;
        dailyRate?: number;
        securityDeposit?: number;
        rentalDescription?: string;
        mileageLimit?: number;
        fuelPolicy?: string;
        pickupLocation?: {
          latitude: number;
          longitude: number;
          address: string;
          city?: string;
          country?: string;
        };
      }>(req);
      const user = req.user! as DbUser;
      const isEnglishPreferred = req.isEnglishPreferred;

      const vehicle = await prisma.vehicle.findFirst({
        where: { id: data.vehicleId, userId: user.id },
      });

      if (!vehicle) {
        return next(
          AppError(
            isEnglishPreferred ? "Vehicle not found" : "Véhicule non trouvé",
            404
          )
        );
      }

      const {
        vehicleId,
        pickupLocation,
        fuelPolicy,
        ...rentalFields
      } = data;

      const updateData: Prisma.VehicleUpdateInput = {
        ...rentalFields,
        ...(fuelPolicy ? { fuelPolicy: fuelPolicy as FuelPolicy } : {}),
      };

      if (pickupLocation) {
        const newLocation = await prisma.location.create({
          data: {
            latitude: pickupLocation.latitude,
            longitude: pickupLocation.longitude,
            address: pickupLocation.address,
            city: pickupLocation.city || "",
            country: pickupLocation.country || "Rwanda",
            region: pickupLocation.city || "",
            locationName: pickupLocation.address,
          },
        });
        updateData.pickupLocation = { connect: { id: newLocation.id } };
      }

      const updatedVehicle = await prisma.vehicle.update({
        where: { id: vehicleId },
        data: updateData,
        include: {
          files: {
            select: { ...fileSelects, userId: false },
          },
          defaultImage: {
            select: { ...fileSelects, userId: false },
          },
          pickupLocation: true,
        },
      });

      return res.status(200).json({
        success: true,
        data: updatedVehicle,
      });
    }
  );
}
