import { toast } from "sonner";

function SubmitFunction({
  step,
  createMutation,
  setRideDetails,
  t,
  rideDetails,
  vehicleInfo,
  setStep,
  userPreference,
  tzlookup,
  DateTime,
  createRideMutation,
  departureCity,
  destinationCity,
  imagePreviews,
  clearAllImagesFromDB,
  authenticated,
  vehicleId,
  setVehicleInfo,
  setImagePreviews,
  removeItemsFromLocalStorage,
  setAddCar,
  getLocationName,
}) {
  const preferenceItems = [
    {
      id: "smoking",
      label: t("driver.smoking"),
      icon: "🚭",
      description: t("driver.smokingDescription"),
    },
    {
      id: "pets",
      label: t("driver.pets"),
      icon: "🐕",
      description: t("driver.petsDescription"),
    },
    {
      id: "airConditioning",
      label: t("driver.airConditioning"),
      icon: "❄️",
      description: t("driver.airConditioningDescription"),
    },
    {
      id: "bicycleSupport",
      label: t("driver.bicycleSupport"),
      icon: "🚴",
      description: t("driver.bicycleSupportDescription"),
    },
    {
      id: "snowTires",
      label: t("driver.snowTires"),
      icon: "🎿",
      description: t("driver.snowTiresDescription"),
    },
    {
      id: "skiRack",
      label: t("driver.skiRack"),
      icon: "⛷️",
      description: t("driver.skiRackDescription"),
    },
    {
      id: "ladiesOnly",
      label: t("driver.ladiesOnly"),
      icon: "👩",
      description: t("driver.ladiesOnlyDescription"),
    },
    {
      id: "gentsOnly",
      label: t("driver.gentsOnly"),
      icon: "👨",
      description: t("driver.gentsOnlyDescription"),
    },
  ];

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Submit form when on step 5 (payment step - review step removed)
    // Only proceed with submission if we're on step 5
    if (step !== 5) {
      console.log("Not on step 5, returning early. Current step:", step);
      return;
    }

    // For D2D rides, use driverStartLocation; for regular rides, use departure
    const locationForTimezone = rideDetails.enableD2D
      ? rideDetails.driverStartLocation || rideDetails.departure
      : rideDetails.departure;

    // Validate coordinates before calling tzlookup
    const departureLat = locationForTimezone?.latitude;
    const departureLng = locationForTimezone?.longitude;

    // Check if coordinates exist and are valid numbers (allow 0 as valid coordinate)
    if (
      departureLat === undefined ||
      departureLat === null ||
      departureLng === undefined ||
      departureLng === null ||
      typeof departureLat !== "number" ||
      typeof departureLng !== "number" ||
      isNaN(departureLat) ||
      isNaN(departureLng) ||
      departureLat < -90 ||
      departureLat > 90 ||
      departureLng < -180 ||
      departureLng > 180
    ) {
      console.error("Invalid coordinates:", { departureLat, departureLng });
      toast.error(
        t(
          "createRide.driver.invalidCoordinates",
          rideDetails.enableD2D
            ? "Invalid driver start coordinates. Please select a valid starting location."
            : "Invalid departure coordinates. Please select a valid departure location."
        ),
        { className: "custom-error-toast" }
      );
      return;
    }

    // Get timezone from DEPARTURE/DRIVER START LOCATION
    const timezone = tzlookup(departureLat, departureLng);

    // Convert the naive datetime to a Luxon DateTime in the proper zone
    let localDepartureTime;
    try {
      localDepartureTime = DateTime.fromISO(rideDetails.departureTime, {
        zone: timezone,
      });

      if (!localDepartureTime.isValid) {
        console.error("Invalid departure time:", rideDetails.departureTime);
        toast.error(
          t(
            "createRide.driver.invalidDepartureTime",
            "Invalid departure time. Please select a valid departure time."
          ),
          { className: "custom-error-toast" }
        );
        return;
      }
    } catch (error) {
      console.error("Error parsing departure time:", error);
      toast.error(
        t(
          "createRide.driver.invalidDepartureTime",
          "Invalid departure time. Please select a valid departure time."
        ),
        { className: "custom-error-toast" }
      );
      return;
    }
    const utcDepartureTime = localDepartureTime.toUTC().toISO();

    // Validate Stripe onboarding for platform payments
    if (
      !userPreference?.driver?.isStripeOnboarded &&
      rideDetails.contributionCollectionMethod === "VIA_PLATFORM"
    ) {
      toast.error(t("common_.small.stripe"), {
        className: "custom-error-toast",
      });
      setTimeout(() => {
        setStep((step) => step - 1);
      }, 2000);
      return;
    }

    // Only validate stopovers for normal rides (D2D doesn't use stopovers)
    if (!rideDetails.enableD2D) {
      const isStopValid = rideDetails.stopovers.every(
        (stop) =>
          stop.city &&
          stop.locationName &&
          stop.region &&
          typeof stop.latitude === "number" &&
          !isNaN(stop.latitude) &&
          typeof stop.longitude === "number" &&
          !isNaN(stop.longitude)
      );

      if (!isStopValid) {
        toast.error(
          t(
            "createRide.driver.fillStopoverDetails",
            "Please fill in all fields for each stopover."
          ),
          { className: "custom-error-toast" }
        );
        return;
      }
    }

    // Create vehicle in database
    if (vehicleInfo.color && vehicleInfo.plateNumber) {
      // Create vehicle immediately
      const vehicleFormData = new FormData();
      vehicleFormData.append("make", vehicleInfo.make);
      vehicleFormData.append("model", vehicleInfo.model);
      vehicleFormData.append("year", vehicleInfo.year.toString());
      vehicleFormData.append("color", vehicleInfo.color);
      vehicleFormData.append("capacity", rideDetails.availableSeats);
      vehicleFormData.append("plateNumber", vehicleInfo.plateNumber);

      // Append vehicle images
      vehicleInfo.images.forEach((file) => {
        vehicleFormData.append("images", file);
      });

      // Create vehicle and then proceed
      createMutation(vehicleFormData, {
        onSuccess: (vehicleData) => {
          const newVehicleId = vehicleData?.data?.id;
          if (newVehicleId)
            localStorage.setItem("vehicleId", newVehicleId.toString());
          if (!newVehicleId) return;

          // Store and update rideDetails
          setRideDetails((prev) => ({
            ...prev,
            vehicleId: newVehicleId,
          }));

          // Prepare ride creation object
          const departureTimeStamp = new Date(utcDepartureTime).getTime();

          // Handle estimatedArrivalTime - if empty, calculate fallback (departure + 2 hours default)
          let estimatedArrivalTimeStamp: number;
          if (
            !rideDetails.estimatedArrivalTime ||
            rideDetails.estimatedArrivalTime === "" ||
            (typeof rideDetails.estimatedArrivalTime === "string" &&
              rideDetails.estimatedArrivalTime.trim() === "")
          ) {
            // Fallback: add 2 hours to departure time if ETA is missing
            console.warn(
              "Estimated arrival time is empty, using fallback (departure + 2 hours)"
            );
            estimatedArrivalTimeStamp = departureTimeStamp + 2 * 60 * 60 * 1000; // 2 hours in milliseconds
          } else {
            estimatedArrivalTimeStamp = new Date(
              rideDetails.estimatedArrivalTime
            ).getTime();
          }

          const rideWithVehicle: any = {
            contributionCollectionMethod:
              rideDetails.contributionCollectionMethod,
            vehicleId: newVehicleId,
            availableSeats: rideDetails.availableSeats,
            contribution: rideDetails.contribution,
            preferences: {
              smoking: Boolean(rideDetails.preferences?.smoking ?? false),
              pets: Boolean(rideDetails.preferences?.pets ?? false),
              airConditioning: Boolean(
                rideDetails.preferences?.airConditioning ?? false
              ),
              ladiesOnly: Boolean(rideDetails.preferences?.ladiesOnly ?? false),
              gentsOnly: Boolean(rideDetails.preferences?.gentsOnly ?? false),
              bicycleSupport: Boolean(
                rideDetails.preferences?.bicycleSupport ?? false
              ),
              snowTires: Boolean(rideDetails.preferences?.snowTires ?? false),
              luggageSize: String(
                rideDetails.preferences?.luggageSize || "NONE"
              ),
              luggageCount: Number(rideDetails.preferences?.luggageCount ?? 0),
              music: String(rideDetails.preferences?.music || "NONE"),
              additionalNotes: String(
                rideDetails.preferences?.additionalNotes || ""
              ),
            },
            // Both D2D and regular rides use timestamps (numbers)
            estimatedArrivalTime: estimatedArrivalTimeStamp,
            departureTime: departureTimeStamp,
            // Add D2D flag and fields if D2D is enabled
            isD2DRide: rideDetails.enableD2D || false,
          };

          // For D2D rides, use driverStartLocation/driverStopLocation
          if (rideDetails.enableD2D) {
            const driverStartLocation =
              rideDetails.driverStartLocation || rideDetails.departure;
            const driverStopLocation =
              rideDetails.driverStopLocation || rideDetails.destination;

            rideWithVehicle.driverStartLocation = {
              region: String(driverStartLocation?.region || ""),
              city:
                String(driverStartLocation?.city || "") ||
                departureCity?.name ||
                "",
              locationName: String(
                driverStartLocation?.locationName ||
                  driverStartLocation?.address ||
                  ""
              ),
              latitude: Number(driverStartLocation?.latitude) || 0,
              longitude: Number(driverStartLocation?.longitude) || 0,
              address: String(driverStartLocation?.address || ""),
              description: String(driverStartLocation?.description || ""),
            };
            rideWithVehicle.driverStopLocation = {
              region: String(driverStopLocation?.region || ""),
              city:
                String(driverStopLocation?.city || "") ||
                destinationCity?.name ||
                "",
              locationName: String(
                driverStopLocation?.locationName ||
                  driverStopLocation?.address ||
                  ""
              ),
              latitude: Number(driverStopLocation?.latitude) || 0,
              longitude: Number(driverStopLocation?.longitude) || 0,
              address: String(driverStopLocation?.address || ""),
              description: String(driverStopLocation?.description || ""),
            };
            rideWithVehicle.detourRadius = rideDetails.d2dRadiusKm || 5;
            rideWithVehicle.extraKmPrice = rideDetails.extraKmPrice || 0;
          } else {
            // For regular rides, use departure/destination with all required fields
            rideWithVehicle.departure = {
              region: rideDetails.departure.region || "",
              city: rideDetails.departure.city || departureCity?.name || "",
              locationName: rideDetails.departure.locationName || "",
              latitude: rideDetails.departure.latitude || 0,
              longitude: rideDetails.departure.longitude || 0,
              address: rideDetails.departure.address || "",
            };
            rideWithVehicle.destination = {
              region: rideDetails.destination.region || "",
              city: rideDetails.destination.city || destinationCity?.name || "",
              locationName: rideDetails.destination.locationName || "",
              latitude: rideDetails.destination.latitude || 0,
              longitude: rideDetails.destination.longitude || 0,
              address: rideDetails.destination.address || "",
            };
            // Include stopovers for regular rides
            rideWithVehicle.stopovers = rideDetails.stopovers || [];
            // Include bookingType for regular rides
            rideWithVehicle.bookingType =
              rideDetails.bookingType || "AUTOMATIC";
          }

          // Create ride
          createRideMutation(rideWithVehicle, {
            onSuccess: async (data) => {
              const rideId = data.data.id;
              imagePreviews.forEach((url) => URL.revokeObjectURL(url));
              await clearAllImagesFromDB();

              setVehicleInfo((prev) => ({
                ...prev,
                images: [],
              }));
              setImagePreviews([]);

              removeItemsFromLocalStorage([
                "createRideStep",
                "rideDetails",
                "duration",
                "distance",
                "vehicleInfo",
                "postLoginRedirect",
                "vehicleId",
                "departureCity",
                "destinationCity",
                "resubmit",
              ]);

              toast.success(t("common_.vehicle"));

              if (authenticated) {
                setTimeout(
                  () => window.location.replace(`/rides?rideId=${rideId}`),
                  500
                );
              }
              return;
              // For non-authenticated users, show step 6 (login prompt)
              setStep(6);
            },
            onError: (err) => {
              console.log(err);
              toast.error(
                t(
                  "createRide.driver.rideCreationError",
                  "Ride creation failed, please resubmit the form"
                ),
                { className: "custom-error-toast" }
              );
            },
          });

          // Reset vehicle form
          setVehicleInfo({
            make: "",
            model: "",
            year: new Date().getFullYear(),
            color: "",
            plateNumber: "",
            images: [],
          });
          clearAllImagesFromDB();
          setImagePreviews([]);

          // Close the add car form
          setAddCar(false);
        },
        onError: () => {
          toast.error(
            t(
              "createRide.driver.vehicleCreationError",
              "Vehicle creation failed"
            ),
            { className: "custom-error-toast" }
          );
        },
      });

      return;
    }

    // Vehicle should already be created by now, just create the ride
    const storedVehicleId = localStorage.getItem("vehicleId");
    const finalVehicleId =
      rideDetails.vehicleId || vehicleId || storedVehicleId;

    if (!finalVehicleId) {
      toast.error(
        t(
          "createRide.driver.noVehicleSelected",
          "No vehicle selected. Please go back and select a vehicle."
        ),
        { className: "custom-error-toast" }
      );
      return;
    }

    const departureTimeStamp = new Date(utcDepartureTime).getTime();

    // Handle estimatedArrivalTime - if empty, calculate fallback (departure + 2 hours default)
    let estimatedArrivalTimeStamp: number;
    if (
      !rideDetails.estimatedArrivalTime ||
      rideDetails.estimatedArrivalTime === "" ||
      (typeof rideDetails.estimatedArrivalTime === "string" &&
        rideDetails.estimatedArrivalTime.trim() === "")
    ) {
      // Fallback: add 2 hours to departure time if ETA is missing
      console.warn(
        "Estimated arrival time is empty, using fallback (departure + 2 hours)"
      );
      estimatedArrivalTimeStamp = departureTimeStamp + 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    } else {
      estimatedArrivalTimeStamp = new Date(
        rideDetails.estimatedArrivalTime
      ).getTime();
    }

    const newDataObject: any = {
      contributionCollectionMethod: rideDetails.contributionCollectionMethod,
      vehicleId: finalVehicleId,
      availableSeats: rideDetails.availableSeats,
      contribution: rideDetails.contribution,
      preferences: {
        smoking: Boolean(rideDetails.preferences?.smoking ?? false),
        pets: Boolean(rideDetails.preferences?.pets ?? false),
        airConditioning: Boolean(
          rideDetails.preferences?.airConditioning ?? false
        ),
        ladiesOnly: Boolean(rideDetails.preferences?.ladiesOnly ?? false),
        gentsOnly: Boolean(rideDetails.preferences?.gentsOnly ?? false),
        bicycleSupport: Boolean(
          rideDetails.preferences?.bicycleSupport ?? false
        ),
        snowTires: Boolean(rideDetails.preferences?.snowTires ?? false),
        luggageSize: String(rideDetails.preferences?.luggageSize || "NONE"),
        luggageCount: Number(rideDetails.preferences?.luggageCount ?? 0),
        music: String(rideDetails.preferences?.music || "NONE"),
        additionalNotes: String(rideDetails.preferences?.additionalNotes || ""),
      },
      estimatedArrivalTime: estimatedArrivalTimeStamp,
      departureTime: departureTimeStamp,
      isD2DRide: rideDetails.enableD2D || false,
    };

    // For D2D rides, use driverStartLocation/driverStopLocation
    if (rideDetails.enableD2D) {
      const driverStartLocation =
        rideDetails.driverStartLocation || rideDetails.departure;
      const driverStopLocation =
        rideDetails.driverStopLocation || rideDetails.destination;

      const startLocationName = getLocationName(
        driverStartLocation,
        "Driver Start"
      );
      const stopLocationName = getLocationName(
        driverStopLocation,
        "Driver Stop"
      );

      newDataObject.driverStartLocation = {
        region: String(driverStartLocation?.region || ""),
        city:
          String(driverStartLocation?.city || "") || departureCity?.name || "",
        locationName: String(startLocationName || ""),
        latitude: Number(driverStartLocation?.latitude) || 0,
        longitude: Number(driverStartLocation?.longitude) || 0,
        address: String(driverStartLocation?.address || ""),
        description: String(driverStartLocation?.description || ""),
      };
      newDataObject.driverStopLocation = {
        region: String(driverStopLocation?.region || ""),
        city:
          String(driverStopLocation?.city || "") || destinationCity?.name || "",
        locationName: String(stopLocationName || ""),
        latitude: Number(driverStopLocation?.latitude) || 0,
        longitude: Number(driverStopLocation?.longitude) || 0,
        address: String(driverStopLocation?.address || ""),
        description: String(driverStopLocation?.description || ""),
      };
      newDataObject.detourRadius = rideDetails.d2dRadiusKm || 5;
      newDataObject.extraKmPrice = rideDetails.extraKmPrice || 0;
    } else {
      // For regular rides, use departure/destination with all required fields
      newDataObject.departure = {
        region: rideDetails.departure.region || "",
        city: rideDetails.departure.city || departureCity?.name || "",
        locationName: rideDetails.departure.locationName || "",
        latitude: rideDetails.departure.latitude || 0,
        longitude: rideDetails.departure.longitude || 0,
        address: rideDetails.departure.address || "",
      };
      newDataObject.destination = {
        region: rideDetails.destination.region || "",
        city: rideDetails.destination.city || destinationCity?.name || "",
        locationName: rideDetails.destination.locationName || "",
        latitude: rideDetails.destination.latitude || 0,
        longitude: rideDetails.destination.longitude || 0,
        address: rideDetails.destination.address || "",
      };
      newDataObject.stopovers = rideDetails.stopovers || [];
      newDataObject.bookingType = rideDetails.bookingType || "AUTOMATIC";
    }

    console.log(newDataObject);
    createRideMutation(newDataObject, {
      onSuccess: async (data) => {
        // Clean up image previews to prevent memory leaks
        imagePreviews.forEach((url) => URL.revokeObjectURL(url));
        await clearAllImagesFromDB();
        // Update state to reflect cleanup
        setVehicleInfo((prev) => ({
          ...prev,
          images: [],
        }));
        setImagePreviews([]);

        removeItemsFromLocalStorage([
          "createRideStep",
          "rideDetails",
          "duration",
          "distance",
          "vehicleInfo",
          "postLoginRedirect",
          "vehicleId",
          "departureCity",
          "destinationCity",
          "resubmit",
        ]);

        toast.success(t("common_.vehicle"));

        if (authenticated) {
          setTimeout(() => {
            // Redirect to ride details for D2D rides, dashboard for regular rides
            const rideId = data?.data?.id;
            if (rideDetails.enableD2D && rideId) {
              window.location.replace(`/rides?rideId=${rideId}`);
            } else {
              window.location.replace(`/dashboard`);
            }
          }, 500);
          return;
        }
        // For non-authenticated users, redirect to login
        setTimeout(() => {
          window.location.replace(`/login`);
        }, 500);
      },

      onError: (error) => {
        console.error("Error creating ride:", error);
        toast.error((error as any).response.data.message, {
          className: "custom-error-toast",
        });
      },
    });
  };

  return { handleSubmit, preferenceItems };
}

export default SubmitFunction;
