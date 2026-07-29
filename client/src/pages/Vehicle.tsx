import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Check, X, Star } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { apiUrl, queryKey, useSingleVehicle } from "@/data";
import LoaderIndicator from "@/components/LoadingIndicator";
import { RentalSettings } from "@/components/RentalSettings";

import { FaRepeat } from "react-icons/fa6";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CreateCar from "@/components/Car/CreateCar";
import { DeleteVehicleModal } from "@/components/DeleteVehicleModal";
import { useTranslation } from "react-i18next";
import CustomLoader from "@/components/CustomLoader";
import {
  RestrictedVehicleMakesSearchable,
  VehicleModelsSearchable,
} from "@/components/GetMakes";

interface EditVehicleData {
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  capacity: number;
}

const VehicleDetailPage = () => {
  const location = useLocation();
  const id = new URLSearchParams(location.search).get("vehicleId");

  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.language;

  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<EditVehicleData>({
    make: "",
    model: "",
    year: 0,
    color: "",
    plateNumber: "",
    capacity: 0,
  });
  const [selectedImageId, setSelectedImageId] = useState(null);

  //   Query client
  const queryClient = useQueryClient();

  // const { t } = useTranslation();

  //   Update image
  const { mutate: replaceMutation, isPending: isPendingImageReplace } =
    useMutation({
      mutationFn: async (backImage: {
        imageId: string;
        vehicleId: string;
        image: File;
      }) => {
        const token =
          typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("Your-DriveToken") || "null")
            : null;

        const formData = new FormData();
        formData.append("image", backImage.image);

        const { data } = await axios.patch(
          `${apiUrl}/api/v1/vehicles/${backImage.vehicleId}/images/${backImage.imageId}?lang=${currentLanguage}`,
          formData,
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
        if (id) {
          queryClient.invalidateQueries({ queryKey: [queryKey.VEHICLE, id] });
        }
        toast.success("Uploaded successful");
        setSelectedImageId(null);
      },
      onError: (error) => {
        toast.error(
          "The uploaded image is invalid, Image is too small. Minimum file size is 50KB and Minimum resolution is 640x480",
          { className: "custom-error-toast" }
        );
        setSelectedImageId(null);
      },
    });

  // Set default
  const { mutate: defaultMutation, isPending: isPendingDefault } = useMutation({
    mutationFn: async (backImage: { imageId: number; vehicleId: string }) => {
      const token =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("Your-DriveToken") || "null")
          : null;

      const { data } = await axios.patch(
        `${apiUrl}/api/v1/vehicles/${backImage.vehicleId}/images/default-image?lang=${currentLanguage}`,
        { imageId: backImage.imageId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data;
    },
    onSuccess: () => {
      if (id) {
        queryClient.invalidateQueries({ queryKey: [queryKey.VEHICLE] });
      }
      toast.success("Successful");
      setSelectedImageId(null);
    },
    onError: () => {
      toast.error("Error setting default", { className: "custom-error-toast" });
      setSelectedImageId(null);
    },
  });

  // Update property
  const { mutate: propertyMutation, isPending: isPendingProperty } =
    useMutation({
      mutationFn: async () => {
        const token =
          typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("Your-DriveToken") || "null")
            : null;

        const { data } = await axios.put(
          `${apiUrl}/api/v1/vehicles/${id}?lang=${currentLanguage}`,
          editData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        return data;
      },
      onSuccess: () => {
        if (id) {
          queryClient.invalidateQueries({ queryKey: [queryKey.VEHICLE] });
        }
        toast.success("Successful");
        setIsEditing(false);
        setSelectedImageId(null);
      },
      onError: (error) => {
        toast.error((error as any).response.data.message, {
          className: "custom-error-toast",
        });
        setSelectedImageId(null);
      },
    });

  // Delete vehicle
  const { mutate: deleteMutation, isPending: isPendingDelete } = useMutation({
    mutationFn: async () => {
      const token =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("Your-DriveToken") || "null")
          : null;

      if (!token) {
        throw new Error("No authentication token found");
      }

      if (!id) {
        throw new Error("Vehicle ID is required");
      }

      try {
        const response = await axios.delete(
          `${apiUrl}/api/v1/vehicles/${id}?lang=${currentLanguage}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        return response.data;
      } catch (error) {
        console.error("Delete vehicle error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (id) {
        queryClient.invalidateQueries({ queryKey: [queryKey.VEHICLE] });
        queryClient.invalidateQueries({ queryKey: [queryKey.VEHICLES] });
      }
      toast.success(
        t("DriverDashboard.vehicles.delete.success") ||
          "Vehicle deleted successfully"
      );
      navigate("/dashboard");
    },
    onError: (error: any) => {
      console.error("Delete mutation error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to delete vehicle";
      toast.error(errorMessage, {
        className: "custom-error-toast",
      });
    },
  });

  //   Fetch single vehicle
  const {
    data: vehicle,
    isPending,
    error,
  } = useSingleVehicle({
    id: id ?? "",
    enable: !!id,
  });

  useEffect(() => {
    if (vehicle) {
      setEditData({
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        plateNumber: vehicle.plateNumber,
        capacity: vehicle.capacity,
      });
    }
  }, [vehicle]);

  //   Replace image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const replaceData = {
      imageId: selectedImageId,
      vehicleId: id,
      image: file,
    };

    if (!selectedImageId || !id) {
      toast.error("Image or vehicle ID missing", {
        className: "custom-error-toast",
      });
      return;
    }

    replaceMutation(replaceData);
  };

  //   Set default
  const handleSetDefaultImage = async (imageId: number) => {
    defaultMutation({
      imageId,
      vehicleId: id,
    });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditData((prev) => ({
      ...prev,
      [name]: name === "year" ? parseInt(value) || 0 : value,
    }));
  };

  const handleVehicleChange = (e: any) => {
    const { name, value } = e.target;
    setEditData({
      ...editData,
      [name]: value,
    });
  };

  if (isPending) {
    return <LoaderIndicator />;
  }

  if (!vehicle) {
    navigate("/");
  }

  // console.log("vehicle", vehicle);

  return (
    <div className="container mx-auto px-4 py-6 mt-16 max-w-6xl dark:bg-gray-900">
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <CardTitle className="dark:text-white text-xl md:text-2xl">
            {vehicle.make} {vehicle.model} ({vehicle.year})
          </CardTitle>
          <div className="flex gap-2 w-full md:w-auto">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isPendingProperty}
                  className="dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 w-1/2 md:w-auto"
                >
                  <X className="mr-2 h-4 w-4" />{" "}
                  {t("DriverDashboard.vehicles.cancel")}
                </Button>
                <Button
                  onClick={() => propertyMutation()}
                  disabled={isPendingProperty}
                  className="dark:bg-blue-600 dark:hover:bg-blue-700 w-1/2 md:w-auto"
                >
                  {isPendingProperty ? (
                    t("DriverDashboard.vehicles.saving")
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />{" "}
                      {t("DriverDashboard.vehicles.save")}
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 w-1/2 md:w-auto"
                >
                  <Edit className="mr-2 h-4 w-4" />{" "}
                  {t("DriverDashboard.vehicles.edit")}
                </Button>
                <DeleteVehicleModal
                  deleteMutation={deleteMutation}
                  isPendingDelete={isPendingDelete}
                />
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 dark:text-gray-300">
          {/* Vehicle Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-3">
              <div>
                <Label htmlFor="make" className="dark:text-gray-300 text-sm">
                  {t("DriverDashboard.vehicles.make")}
                </Label>
                {isEditing ? (
                  <RestrictedVehicleMakesSearchable
                    value={editData.make}
                    onChange={(val) =>
                      handleVehicleChange({
                        target: { name: "make", value: val },
                      })
                    }
                  />
                ) : (
                  <div className="font-medium dark:text-white mt-1">
                    {vehicle.make}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="model" className="dark:text-gray-300 text-sm">
                  {t("DriverDashboard.vehicles.model")}
                </Label>
                {isEditing ? (
                  <VehicleModelsSearchable
                    make={editData.make}
                    value={editData.model}
                    onChange={(selectedModel) =>
                      setEditData((prev) => ({
                        ...prev,
                        model: selectedModel,
                      }))
                    }
                  />
                ) : (
                  <div className="font-medium dark:text-white mt-1">
                    {vehicle.model}
                  </div>
                )}

                <div>
                  <Label
                    htmlFor="capacity"
                    className="dark:text-gray-300 text-sm"
                  >
                    {t("vehicles.capacity")}
                  </Label>
                  {isEditing ? (
                    <Input
                      id="capacity"
                      name="capacity"
                      value={editData.capacity}
                      onChange={handleEditChange}
                      className="dark:bg-gray-800 dark:border-gray-700 dark:text-white mt-1 h-10"
                    />
                  ) : (
                    <div className="font-medium dark:text-white mt-1">
                      {vehicle.capacity}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="year" className="dark:text-gray-300 text-sm">
                  {t("DriverDashboard.vehicles.year")}
                </Label>
                {isEditing ? (
                  <Input
                    id="year"
                    name="year"
                    type="number"
                    value={editData.year}
                    onChange={handleEditChange}
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-white mt-1 h-10"
                  />
                ) : (
                  <div className="font-medium dark:text-white mt-1">
                    {vehicle.year}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="color" className="dark:text-gray-300 text-sm">
                  {t("DriverDashboard.vehicles.color")}
                </Label>
                {isEditing ? (
                  <Input
                    id="color"
                    name="color"
                    value={editData.color}
                    onChange={handleEditChange}
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-white mt-1 h-10"
                  />
                ) : (
                  <div className="font-medium dark:text-white mt-1">
                    {vehicle.color}
                  </div>
                )}
              </div>

              <div>
                <Label
                  htmlFor="plateNumber"
                  className="dark:text-gray-300 text-sm"
                >
                  {t("DriverDashboard.vehicles.plateNumber")}
                </Label>
                {isEditing ? (
                  <Input
                    id="plateNumber"
                    name="plateNumber"
                    value={editData.plateNumber}
                    onChange={handleEditChange}
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-white mt-1 h-10"
                  />
                ) : (
                  <div className="font-medium dark:text-white mt-1">
                    {vehicle.plateNumber}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Images Section */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-3">
              <Label className="dark:text-gray-300">
                {t("DriverDashboard.vehicles.images")}
              </Label>
              <div>
                <input
                  type="file"
                  id="upload-file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <CreateCar vehicleId={id} uploadImages={true} />
              </div>
            </div>

            {vehicle.files.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 text-center py-8 border-2 border-dashed dark:border-gray-700 rounded-lg">
                {t("DriverDashboard.vehicles.noImages")}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {vehicle?.files?.map((file) => (
                  <div key={file.id} className="relative group">
                    <div className="aspect-square overflow-hidden rounded-lg border dark:border-gray-700">
                      <img
                        src={file.url}
                        alt={`Vehicle ${vehicle.make} ${vehicle.model}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-white/20 p-2 h-auto"
                          onClick={() => handleSetDefaultImage(file.id)}
                          title={
                            vehicle.defaultImageId === file.id
                              ? t("DriverDashboard.vehicles.defaultImage")
                              : t("DriverDashboard.vehicles.setDefault")
                          }
                        >
                          <Star
                            className={`h-4 w-4 ${
                              vehicle.defaultImageId === file.id
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-white"
                            }`}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-white/20 hover:text-white p-2 h-auto"
                          onClick={() => setSelectedImageId(file.id)}
                          title={t("DriverDashboard.vehicles.replaceImage")}
                        >
                          <label
                            htmlFor="upload-file"
                            className="cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </label>
                        </Button>
                      </div>
                    </div>
                    {vehicle.defaultImageId === file.id && (
                      <div className="absolute top-2 left-2 bg-yellow-400 text-black px-2 py-0.5 rounded-full text-xs font-bold dark:bg-yellow-500">
                        {t("DriverDashboard.vehicles.default")}
                      </div>
                    )}
                    {(isPendingImageReplace && selectedImageId === file.id) ||
                    isPendingDefault ? (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <CustomLoader className="w-6 h-6 text-white" />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rental Settings */}
          <div className="mt-6">
            <RentalSettings
              vehicleId={vehicle.id}
              initialData={{
                isAvailableForRental: vehicle.isAvailableForRental ?? false,
                hourlyRate: vehicle.hourlyRate ?? null,
                dailyRate: vehicle.dailyRate ?? null,
                securityDeposit: vehicle.securityDeposit ?? null,
                rentalDescription: vehicle.rentalDescription ?? null,
                mileageLimit: vehicle.mileageLimit ?? null,
                fuelPolicy: vehicle.fuelPolicy ?? "FULL_TO_FULL",
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VehicleDetailPage;
