import { useState, useRef, ChangeEvent } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { Plus, Minus, X, Upload, Image, Camera } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl, queryKey } from "@/data";
import axios from "axios";
import { toast } from "sonner";
import {
  RestrictedVehicleMakesSearchable,
  VehicleModelsSearchable,
  VehicleYearSelector,
} from "../GetMakes";
import { CameraCapture } from "../CameraCapture";

const getCarSchema = (hasVehicleId: boolean) =>
  z.object({
    make: hasVehicleId
      ? z.string().optional()
      : z.string().min(2, { message: "Required" }),
    model: hasVehicleId
      ? z.string().optional()
      : z.string().min(2, { message: "Required" }),
    year: hasVehicleId
      ? z.number().optional()
      : z.number().min(1, { message: "Required" }),
    color: hasVehicleId
      ? z.string().optional()
      : z.string().min(1, { message: "Required" }),
    plateNumber: hasVehicleId
      ? z.string().optional()
      : z.string().min(1, { message: "Required" }),
    maxPlaces: hasVehicleId
      ? z.number().optional()
      : z
          .number()
          .min(1, { message: "Minimum 1 seat required" })
          .max(8, { message: "Maximum 8 seats allowed" }),
    images: z
      .array(z.union([z.string(), z.instanceof(File)]))
      .min(1, "At least one image is required"),
  });
type CarData = z.infer<ReturnType<typeof getCarSchema>>;

const CreateCar = ({
  vehicleId,
  uploadImages,
}: {
  vehicleId?: string;
  uploadImages?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  //   Query client
  const queryClient = useQueryClient();

  const {
    register,
    formState: { errors },
    setValue,
    getValues,
    handleSubmit,
    trigger,
    control,
    watch,
    reset,
  } = useForm<CarData>({
    resolver: zodResolver(getCarSchema(!!vehicleId)),
    defaultValues: {
      make: "",
      model: "",
      year: new Date().getFullYear(),
      color: "",
      plateNumber: "",
      maxPlaces: 3,
      images: [],
    },
  });

  //   Upload vehicle
  const { mutate: createMutation, isPending: isPendingImageCreate } =
    useMutation({
      mutationFn: async (backData: CarData) => {
        const token =
          typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("Your-DriveToken") || "null")
            : null;

        const { data } = await axios.post(
          `${apiUrl}/api/v1/vehicles?lang=${currentLanguage}`,
          backData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey.VEHICLES] });
        toast.success("Create successful");
        setOpen(false);
        reset();
        setImagePreviews([]);
      },
      onError: (error) => {
        toast.error((error as any).response.data.message, {
          className: "custom-error-toast",
        });
      },
    });

  //   Add images
  const { mutate: addMutationImages, isPending: isPendingAddImages } =
    useMutation({
      mutationFn: async (imageData: CarData) => {
        const token =
          typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("Your-DriveToken") || "null")
            : null;

        const { data } = await axios.put(
          `${apiUrl}/api/v1/vehicles/${vehicleId}/images/add-images?lang=${currentLanguage}`,
          imageData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
        return data;
      },
      onSuccess: () => {
        if (vehicleId) {
          queryClient.invalidateQueries({
            queryKey: [queryKey.VEHICLE, vehicleId],
          });
        }
        toast.success("Update successful");
        setOpen(false);
        setImagePreviews([]);
      },
      onError: (error) => {
        toast.error((error as any).response.data.message, {
          className: "custom-error-toast",
        });
      },
    });

  // Process file
  const processUploadedImages = (files: File[]) => {
    const newImages = Array.from(files);
    const newPreviews = newImages.map((file) => URL.createObjectURL(file));

    const currentImages = getValues("images") || [];

    setValue("images", [...currentImages, ...newImages], {
      shouldValidate: true,
    });

    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  // Upload image
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processUploadedImages(Array.from(files));
  };

  const removeImage = (index: number) => {
    const currentImages = getValues("images") || [];

    const newImages = [...currentImages];
    const newPreviews = [...imagePreviews];

    if (newPreviews[index]?.startsWith("blob:")) {
      URL.revokeObjectURL(newPreviews[index]);
    }

    newImages.splice(index, 1);
    newPreviews.splice(index, 1);

    setValue("images", newImages, { shouldValidate: true });
    setImagePreviews(newPreviews);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const onSubmit = async (data: CarData) => {
    if (vehicleId) {
      const isValid = await trigger("images");

      if (!isValid) return;

      const formData = new FormData();
      data.images.forEach((file: File, index: number) => {
        formData.append("images", file);
      });

      // for (const [key, value] of formData.entries()) {
      //   console.log(`${key}:`, value);
      // }

      addMutationImages(formData as any);
    } else {
      const formData = new FormData();

      formData.append("make", data.make);
      formData.append("model", data.model);
      formData.append("color", data.color);
      formData.append("plateNumber", data.plateNumber);
      formData.append("year", data.year.toString());
      formData.append("capacity", data.maxPlaces.toString());

      data.images.forEach((file: File, index: number) => {
        formData.append("images", file);
      });

      createMutation(formData as any);
    }
  };

  const selectedMake = watch("make"); // ✅ Correct

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {uploadImages ? (
          <Button
            // variant="outline"
            className="text-white dark:text-gray-100 dark:border-gray-600"
          >
            <Image className="mr-2 h-4 w-4" />
            {t("DriverDashboard.vehicles.buttons.uploadImage")}
          </Button>
        ) : (
          <Button
            // variant="outline"
            className="w-full flex items-center justify-center text-white dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            <Plus size={16} className="mr-1" />
            {t("DriverDashboard.vehicles.add")}
          </Button>
        )}
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-[90vw] sm:min-w-[400px] h-screen max-h-screen overflow-y-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        onOpenAutoFocus={(event) => event.preventDefault()}
        style={{ zIndex: 9999 }}
      >
        <SheetHeader>
          <SheetTitle>
            {vehicleId
              ? t("DriverDashboard.vehicles.uploadTitle")
              : t("DriverDashboard.vehicles.createTitle")}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          {!vehicleId && (
            <>
              {/* Make Field */}
              <div>
                <Label htmlFor="make">
                  {t("DriverDashboard.vehicles.fields.make")}
                </Label>
                <Controller
                  control={control}
                  name="make"
                  render={({ field }) => (
                    <RestrictedVehicleMakesSearchable
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors?.make && (
                  <p className="text-red-500 dark:text-red-400 text-sm">
                    {errors.make.message}
                  </p>
                )}
              </div>

              {/** Model Field */}
              <div>
                <Label htmlFor="model">
                  {t("DriverDashboard.vehicles.fields.model")}
                </Label>
                <Controller
                  control={control}
                  name="model"
                  render={({ field }) => (
                    <VehicleModelsSearchable
                      make={watch("make")}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />

                {errors?.model && (
                  <p className="text-red-500 dark:text-red-400 text-sm">
                    {errors.model.message}
                  </p>
                )}
              </div>

              {/** Year Field */}
              <div>
                <Controller
                  control={control}
                  name="year"
                  rules={{ required: true }}
                  render={({ field }) => (
                    <VehicleYearSelector
                      value={field.value}
                      onChange={field.onChange}
                      label={t("createRide.driver.year")}
                    />
                  )}
                />
                {errors?.year && (
                  <p className="text-red-500 dark:text-red-400 text-sm">
                    {errors.year.message}
                  </p>
                )}
              </div>

              {/** Color Field */}
              <div>
                <Label htmlFor="color">
                  {t("DriverDashboard.vehicles.fields.color")}
                </Label>
                <Input
                  id="color"
                  {...register("color")}
                  className="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
                {errors?.color && (
                  <p className="text-red-500 dark:text-red-400 text-sm">
                    {errors.color.message}
                  </p>
                )}
              </div>

              {/** Plate Number Field */}
              <div>
                <Label htmlFor="plateNumber">
                  {t("DriverDashboard.vehicles.fields.plateNumber")}
                </Label>
                <Input
                  id="plateNumber"
                  {...register("plateNumber")}
                  className="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
                {errors?.plateNumber && (
                  <p className="text-red-500 dark:text-red-400 text-sm">
                    {errors.plateNumber.message}
                  </p>
                )}
              </div>

              {/** Available Seats Field */}
              <div>
                <Label htmlFor="maxPlaces">
                  {t(
                    "DriverDashboard.vehicles.fields.maxPlaces",
                    "Available Seats"
                  )}
                </Label>
                <div className="flex items-center justify-center space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      const currentValue = getValues("maxPlaces") || 3;
                      if (currentValue > 1) {
                        setValue("maxPlaces", currentValue - 1, {
                          shouldValidate: true,
                        });
                      }
                    }}
                    disabled={(getValues("maxPlaces") || 3) <= 1}
                    className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${
                      (getValues("maxPlaces") || 3) <= 1
                        ? "border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                        : "border-[#30BFDD] text-[#30BFDD] hover:bg-black hover:text-white hover:scale-105"
                    }`}
                  >
                    <Minus className="h-5 w-5" />
                  </button>

                  <div className="min-w-[80px] text-center">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {getValues("maxPlaces") || 3}
                    </span>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {(getValues("maxPlaces") || 3) === 1 ? "seat" : "seats"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const currentValue = getValues("maxPlaces") || 3;
                      if (currentValue < 8) {
                        setValue("maxPlaces", currentValue + 1, {
                          shouldValidate: true,
                        });
                      }
                    }}
                    disabled={(getValues("maxPlaces") || 3) >= 8}
                    className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${
                      (getValues("maxPlaces") || 3) >= 8
                        ? "border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                        : "border-[#30BFDD] text-[#30BFDD] hover:bg-black hover:text-white hover:scale-105"
                    }`}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <input type="hidden" {...register("maxPlaces")} />
                {errors?.maxPlaces && (
                  <p className="text-red-500 dark:text-red-400 text-sm">
                    {errors.maxPlaces.message}
                  </p>
                )}
              </div>
            </>
          )}

          {/** Images Upload */}
          <div>
            <Label>{t("DriverDashboard.vehicles.fields.images")}</Label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              multiple
              className="hidden"
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              {Array.isArray(imagePreviews) &&
                imagePreviews.map((preview, index) => (
                  <div
                    key={uuidv4()}
                    className="relative group border-[1px] border-blue-500 py-2 rounded-md bg-white dark:bg-gray-800"
                  >
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="h-36 w-36 object-cover rounded-md border mx-auto"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
            </div>

            {/* 📸 Add camera and file upload buttons side-by-side */}
            <div className="flex gap-2 mb-4">
              <CameraCapture
                onImageCapture={(file) => processUploadedImages([file])} // expects same handler as file input
                trigger={
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 h-10 w-10 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
                    title={t("camera.takePhoto", "Take Photo")}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                }
              />

              <Button
                type="button"
                variant="outline"
                className="flex-1 dark:border-gray-600 dark:text-white dark:hover:bg-gray-800"
                onClick={triggerFileInput}
              >
                <Upload size={16} className="mr-2" />
                {t("DriverDashboard.vehicles.buttons.uploadImages")}
              </Button>
            </div>

            {errors?.images && (
              <p className="text-red-500 dark:text-red-400 text-sm">
                {errors.images.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full text-white"
            disabled={isPendingImageCreate || isPendingAddImages}
          >
            {isPendingImageCreate || isPendingAddImages
              ? t("DriverDashboard.vehicles.buttons.submitting")
              : t("DriverDashboard.vehicles.buttons.submit")}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default CreateCar;
