import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlarmSmoke,
  ArrowLeft,
  MapPin,
  Music,
  PawPrint,
  Plus,
  Star,
  User,
} from "lucide-react";
import { useState } from "react";

import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAllVehicles } from "@/data";

const dummyVehicles = [
  {
    id: 1,
    make: "Honda",
    model: "Civic",
    year: 2022,
    color: "Blue",
    licensePlate: "ABC 123",
    isVerified: true,
  },
  {
    id: 2,
    make: "Toyota",
    model: "RAV4",
    year: 2020,
    color: "Silver",
    licensePlate: "XYZ 789",
    isVerified: true,
  },
];

export function RideDetailsSheet({ ride }: { ride: any }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="bg-primary-400 hover:bg-primary-500 text-white hover:text-white dark:bg-primary-600 dark:hover:bg-primary-700"
            onClick={() => setOpen(true)}
          >
            {t("PassengerHome.viewDetails")}
          </Button>
        </SheetTrigger>

        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
          <div className="sticky top-0 z-10 bg-background dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-600 dark:text-gray-300"
              onClick={() => setOpen(false)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <SheetHeader className="text-left flex-1">
              <SheetTitle className="text-lg font-semibold dark:text-white">
                {t("PassengerHome.rideDetails")}
              </SheetTitle>
            </SheetHeader>
          </div>

          <div className="p-6 space-y-6">
            {/* Driver Profile Section */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={ride.driver.image} />
                <AvatarFallback>{ride.driver.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{ride.driver.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-400 mt-1">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                    {ride.driver.rating}
                  </div>
                  <span>•</span>
                  <span>
                    {ride.driver.trips} {t("PassengerHome.trips")}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">${ride.price}</div>
                <div className="text-sm text-muted-foreground dark:text-gray-400">
                  {t("PassengerHome.perSeat")}
                </div>
              </div>
            </div>

            {/* Ride Information Card */}
            <div className="bg-muted/50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground dark:text-gray-400 font-medium uppercase">
                    {t("PassengerHome.from")}
                  </p>
                  <p className="font-medium text-xs text-gray-600 dark:text-gray-200">
                    {ride.from}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground dark:text-gray-400 font-medium uppercase">
                    {t("PassengerHome.to")}
                  </p>
                  <p className="font-medium text-xs text-gray-600 dark:text-gray-200">
                    {ride.to}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground dark:text-gray-400 font-medium uppercase">
                    {t("PassengerHome.date")}
                  </p>
                  <p className="font-medium text-xs text-gray-600 dark:text-gray-200">
                    {new Date(ride.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    <span className="text-muted-foreground dark:text-gray-400">
                      {" "}
                      • {ride.time}
                    </span>
                  </p>
                </div>
              </div>

              {/* Preferences Badges */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge className="gap-1 dark:bg-gray-700 dark:text-white">
                  <User className="h-3 w-3" />
                  {ride.seats} {t("PassengerHome.number")}
                </Badge>
                {ride.preferences.pets && (
                  <Badge className="gap-1 dark:bg-gray-700 dark:text-white">
                    <PawPrint className="h-3 w-3" />
                    {t("PassengerHome.petsAllowed")}
                  </Badge>
                )}
                {!ride.preferences.smoking && (
                  <Badge className="gap-1 dark:bg-gray-700 dark:text-white">
                    <AlarmSmoke className="h-3 w-3" />
                    {t("PassengerHome.noSmoking")}
                  </Badge>
                )}
                {ride.preferences.music && (
                  <Badge className="gap-1 dark:bg-gray-700 dark:text-white">
                    <Music className="h-3 w-3" />
                    {t("PassengerHome.music")}
                  </Badge>
                )}
              </div>
            </div>

            {/* Map Preview */}
            <div className="bg-muted/50 dark:bg-gray-800 rounded-lg aspect-video flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground dark:text-gray-400">
                <MapPin className="h-6 w-6" />
                <p className="text-sm">
                  {t("PassengerHome.routeFromTo", {
                    from: ride.from,
                    to: ride.to,
                  })}
                </p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function PassengerCancellation() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900 dark:bg-white/25 dark:text-red-400 dark:hover:text-red-300"
        >
          {t("PassengerHome.cancelBookingButton")}
        </Button>
      </DialogTrigger>

      <DialogPortal>
        <DialogOverlay className="bg-black/40 dark:bg-black/70 backdrop-blur-sm" />
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("PassengerHome.cancelTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              {t("PassengerHome.cancelDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason" className="dark:text-gray-300">
                {t("PassengerHome.reasonLabel")}
              </Label>
              <Select>
                <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200">
                  <SelectValue placeholder={t("PassengerHome.selectReason")} />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:text-gray-100">
                  <SelectItem value="plans">
                    {t("PassengerHome.reasonPlans")}
                  </SelectItem>
                  <SelectItem value="ride">
                    {t("PassengerHome.reasonRide")}
                  </SelectItem>
                  <SelectItem value="emergency">
                    {t("PassengerHome.reasonEmergency")}
                  </SelectItem>
                  <SelectItem value="other">
                    {t("PassengerHome.reasonOther")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="explanation" className="dark:text-gray-300">
                {t("PassengerHome.explanationLabel")}
              </Label>
              <Textarea
                id="explanation"
                placeholder={t("PassengerHome.explanationPlaceholder")}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              />
            </div>

            <div className="text-sm text-yellow-800 bg-yellow-100 border border-yellow-300 p-4 rounded-xl dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700">
              {t("PassengerHome.warning")}{" "}
              <span className="font-semibold">
                {t("PassengerHome.cancellationFee")}
              </span>
              . {t("PassengerHome.policyNote")}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button
                variant="outline"
                className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {t("PassengerHome.back")}
              </Button>
            </DialogClose>
            <Button variant="default">
              {t("PassengerHome.confirmCancellation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

export const PostRideButton = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  const { t } = useTranslation();

  const { data: vehiclesData } = useAllVehicles();

  const handlePostRide = (vehicleId?: number) => {
    if (vehicleId) {
      navigate(`/driver?vehicleId=${vehicleId}`);
    } else {
      navigate("/driver");
    }
    setIsDialogOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => setIsDialogOpen(true)}
        className="flex items-center bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 text-white dark:text-white"
      >
        <Plus size={16} className="mr-2" />
        {t("DriverDashboard.postRide.button")}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {t("DriverDashboard.postRide.dialogTitle")}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {t("DriverDashboard.postRide.dialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {vehiclesData?.map((vehicle: any) => (
                <div
                  key={vehicle.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors border-gray-200 dark:border-gray-700"
                  onClick={() => handlePostRide(vehicle.id)}
                >
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {vehicle.make} {vehicle.model} ({vehicle.year})
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {vehicle.color} • {vehicle.plateNumber}
                    </p>
                  </div>
                  {vehicle.isVerified && (
                    <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded-full">
                      {t("DriverDashboard.postRide.verified")}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 dark:bg-gray-800"
            >
              {t("DriverDashboard.postRide.continueWithout")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
