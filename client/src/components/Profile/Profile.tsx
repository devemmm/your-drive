import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Activity,
  BadgeCheck,
  Calendar,
  Check,
  Globe,
  Loader2,
  Moon,
  Pencil,
  Phone,
  PhoneOff,
  Sun,
  XCircle,
  Camera,
  Gift,
  TrendingUp,
  Award,
  Sparkles,
} from "lucide-react";
import { CameraCapture } from "../CameraCapture";

export default function Profile({
  profileImage,
  userData,
  editProfile,
  t,
  handleFileChange,
  languages,
  mutateUser,
  currentLanguage,
  isPendingUser,
}) {
  return (
    <div className="w-full -mt-32">
      {/* Hero Section with Solid Primary Background */}
      <div className="relative w-full h-48 bg-primary-600 dark:bg-primary-700 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="absolute inset-0 bg-black/10" />

        {/* Decorative Elements */}
        <div className="absolute top-10 right-20 w-32 h-32 bg-white/5 backdrop-blur-3xl" />
        <div className="absolute bottom-10 left-20 w-40 h-40 bg-white/5 backdrop-blur-3xl" />
      </div>

      {/* Main Profile Card */}
      <div className="relative -mt-20 mx-4 lg:mx-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <div className="p-8">
            {/* Profile Header Section */}
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Avatar Section */}
              <div className="relative">
                <div className="relative group">
                  {/* Avatar Container */}
                  <div className="relative">
                    <Avatar className="w-32 h-32 border-4 border-white dark:border-slate-900">
                      <AvatarImage
                        src={
                          profileImage instanceof File
                            ? URL.createObjectURL(profileImage)
                            : userData.profileImage?.url || ""
                        }
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-primary-600 text-white text-4xl font-bold">
                        {userData.firstName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Camera Controls */}
                  <div className="absolute -bottom-2 -right-2 flex gap-2">
                    <CameraCapture
                      onImageCapture={handleFileChange}
                      trigger={
                        <Button
                          variant="outline"
                          size="icon"
                          className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-10 w-10 shadow-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-110 transition-all"
                          title={t("camera.takePhoto", "Take Photo")}
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      }
                    />

                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-10 w-10 shadow-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-110 transition-all"
                      title={t("profile.uploadPhoto", "Upload Photo")}
                    >
                      <Label
                        htmlFor="profile-picture"
                        className="cursor-pointer flex items-center justify-center w-full h-full"
                      >
                        <Pencil className="h-4 w-4" />
                      </Label>
                    </Button>
                    <Input
                      id="profile-picture"
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept="image/*"
                    />
                  </div>
                </div>

                {/* Save Profile Button */}
                {editProfile && (
                  <Button
                    onClick={() => {
                      mutateUser({
                        image: profileImage,
                        lang: currentLanguage,
                      });
                    }}
                    disabled={isPendingUser}
                    className="mt-4 w-full bg-primary-600 hover:bg-primary-700 text-white shadow-lg"
                  >
                    {isPendingUser ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        {t("profile.profile.card.saveProfile")}
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Profile Info Section */}
              <div className="flex-1 space-y-6">
                {/* Name and Email */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl font-bold dark:text-white tracking-tight text-slate-900">
                      {userData.firstName} {userData.lastName}
                    </h1>
                    {userData.isVerified && (
                      <BadgeCheck className="h-7 w-7 text-primary-600 dark:text-primary-400" />
                    )}
                  </div>
                  <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">
                    {userData.email}
                  </p>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-3">
                  <Badge
                    variant={
                      userData.status === "ACTIVE" ? "default" : "destructive"
                    }
                    className="px-4 py-2 text-sm font-semibold shadow-md border-0 bg-green-600 hover:bg-green-700"
                  >
                    <Sparkles className="h-3 w-3 mr-2" />
                    {t(`profile.profile.status.${userData.status}`)}
                  </Badge>
                  {userData.isVerified && (
                    <Badge className="px-4 py-2 text-sm font-semibold shadow-md border-0 bg-primary-600 hover:bg-primary-700">
                      <Award className="h-3 w-3 mr-2" />
                      {t("common_.small.verify_status")}
                    </Badge>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  {/* Member Since */}
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {t("profile.profile.card.memberSince")}
                      </span>
                    </div>
                    <p className="text-sm font-bold dark:text-white">
                      {new Date(userData.createdAt).toLocaleDateString(
                        undefined,
                        {
                          year: "numeric",
                          month: "short",
                        }
                      )}
                    </p>
                  </div>

                  {/* Email Status */}
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      {userData.isVerified ? (
                        <BadgeCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {t("profile.profile.card.emailVerified")}
                      </span>
                    </div>
                    <p className="text-sm font-bold dark:text-white">
                      {userData.isVerified
                        ? t("profile.profile.common.yes")
                        : t("profile.profile.common.no")}
                    </p>
                  </div>

                  {/* Phone Status */}
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      {userData.isPhoneVerified ? (
                        <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <PhoneOff className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {t("common_.profile.Phone")}
                      </span>
                    </div>
                    <p className="text-sm font-bold dark:text-white">
                      {userData.isPhoneVerified
                        ? t("profile.profile.common.yes")
                        : t("profile.profile.common.no")}
                    </p>
                  </div>

                  {/* Language */}
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {t("profile.profile.card.language")}
                      </span>
                    </div>
                    <p className="text-sm font-bold dark:text-white">
                      {languages.find(
                        (lang) => lang.value === userData.language
                      )?.label || userData.language}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Coupons Section - Modern Card */}
            <div className="mt-8 relative overflow-hidden bg-primary-600 dark:bg-primary-700 border border-primary-500/20">
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />

              <div className="relative p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  {/* Left Section */}
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 backdrop-blur-sm p-4 border border-white/20">
                      <Gift className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {t("common_.profile.coupons", "Coupons")}
                      </h3>
                      <p className="text-white/80 text-sm">
                        {t("common_.profile.available")} •{" "}
                        {t("common_.profile.couponBenefit1")}
                      </p>
                    </div>
                  </div>

                  {/* Center - Coupon Count */}
                  <div className="bg-white/10 backdrop-blur-md px-8 py-4 border border-white/20">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-6 w-6 text-white" />
                      <div className="text-5xl font-black text-white">
                        {userData.coupons ?? 0}
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Benefits */}
                  <div className="space-y-2 text-white/90 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-white" />
                      <span>{t("common_.profile.couponBenefit1")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-white" />
                      <span>{t("common_.profile.couponBenefit2")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-white" />
                      <span>{t("common_.profile.couponBenefit3")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
