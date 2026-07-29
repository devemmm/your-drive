import LoaderIndicator from "@/components/LoadingIndicator";
import PassengerOnboardingForm from "@/components/PassengerOnboardingForm";
import { Button } from "@/components/ui/button";
import { apiUrl, queryKey, useSingleUser, useUserPreference } from "@/data";
import { useAuth } from "@/providers/Context/UseAuthContext";
import { useTheme } from "@/providers/ThemeProvider";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { t } from "i18next";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { VerifyPhoneDialog } from "@/components/VerifyPhoneForm";
import { PhoneOff as PhoneOffIcon } from "lucide-react";
import DriverOnboardingForm from "@/components/DriverOnboardingForm";
import Profile from "@/components/Profile/Profile";
import ProfileNav from "@/components/Profile/ProfileNav";
import {
  DisplayPreference,
  EditPreference,
} from "@/components/Profile/Preference";
import { DisplayBasics, EditBasics } from "@/components/Profile/Basics";
import {
  ChangePassword,
  DeleteAccount,
} from "@/components/Profile/ChangePassword";
import ViewPreferences from "@/components/Profile/ViewPreferences";
import { ChauffeurSettings } from "@/components/ChauffeurSettings";

const ProfilePage = () => {
  const [activeSection, setActiveSection] = useState("preferences");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: userData, isPending } = useSingleUser({
    userId: user?.id,
    enabled: !!user?.id,
  });

  const { data: userPreference, isPending: isPendingUserPreference } =
    useUserPreference();

  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const { theme } = useTheme();

  const token =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("Your-DriveToken") || "null")
      : null;

  // Apis image
  const { mutate: mutateUser, isPending: isPendingUser } = useMutation({
    mutationFn: async (profileData: { image: string; lang: string }) => {
      const { data } = await axios.post(
        `${apiUrl}/api/v1/users/onboarding/profile-image?lang=${currentLanguage}`,
        profileData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data;
    },
    onSuccess: () => {
      if (token) {
        queryClient.invalidateQueries({ queryKey: [queryKey.USER, token] });
      }
      toast.success("Image updated");
      setEditProfile(false);
    },
    onError: (error) => {
      toast.error((error as any).response.data.message, {
        className: "custom-error-toast",
      });
    },
  });

  // Apis Preference
  const { mutate: mutatePreference, isPending: isPendingPreference } =
    useMutation({
      mutationFn: async (preferenceData: {
        language: string;
        theme: string;
        notificationPref: string;
        twoFactorEnabled: boolean;
      }) => {
        const { data } = await axios.post(
          `${apiUrl}/api/v1/users/onboarding/preferences?lang=${currentLanguage}`,
          preferenceData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        return data;
      },
      onSuccess: () => {
        if (!token) return;
        queryClient.invalidateQueries({ queryKey: [queryKey.USER, token] });
        queryClient.invalidateQueries({ queryKey: [queryKey.ONBOARDING] });
        queryClient.invalidateQueries({
          queryKey: [queryKey.PREFERENCE, token],
        });
        setEditPreferences(false);
        toast.success("Preference updated");
      },
      onError: (error) => {
        toast.error((error as any).response.data.message, {
          className: "custom-error-toast",
        });
      },
    });

  // Apis Basic
  const { mutate: mutateBasic, isPending: isPendingBasic } = useMutation({
    mutationFn: async (basicData: {
      firstName: string;
      lastName: string;
      phoneNumber?: string;
    }) => {
      const { data } = await axios.post(
        `${apiUrl}/api/v1/users/update`,
        basicData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data;
    },
    onSuccess: async () => {
      if (token) {
        await queryClient.invalidateQueries({
          queryKey: [queryKey.USER, token],
        });
        await queryClient.invalidateQueries({
          queryKey: [queryKey.PREFERENCE],
        });
      }
      toast.success("Basic information updated");
      setEditBasicInfo(false);
    },
    onError: (error) => {
      toast.error((error as any).response.data.message, {
        className: "custom-error-toast",
      });
    },
  });

  // For update
  const [preference, setPreference] = useState({
    language: "",
    theme: "",
    twoFactorEnabled: false,
    notificationPref: userPreference?.common?.notificationPref || "",
  });

  const [profileImage, setProfileImage] = useState(null);
  const [basicInfo, setBasicInfo] = useState({
    firstName: userData?.firstName || "",
    lastName: userData?.lastName || "",
    gender: userData?.gender || "",
    phoneNumber: userData?.phoneNumber || "",
  });

  const [searchParams] = useSearchParams();
  const [completeProfile, setCompleteProfile] = useState(false);
  const [completeDriver, setCompleteDriver] = useState(false);

  useEffect(() => {
    const value = searchParams.get("completeProfile");
    setCompleteProfile(value === "true");
  }, [searchParams]);

  useEffect(() => {
    if (userData) {
      setBasicInfo({
        firstName: userData.firstName,
        lastName: userData.lastName,
        gender: userData.gender,
        phoneNumber: userData.phoneNumber,
      });
    }
  }, [userData]);

  // For edit
  const [editPreferences, setEditPreferences] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [editBasicInfo, setEditBasicInfo] = useState(false);
  const [verify, setVerify] = useState(false);

  // Update the state when userPreference changes
  useEffect(() => {
    if (userPreference?.common) {
      setPreference({
        language: userPreference?.common?.language || "",
        theme: userPreference?.common?.theme || "",
        twoFactorEnabled: userPreference?.common?.twoFactorEnabled ?? false,
        notificationPref: userPreference?.common?.notificationPref || "",
      });
    }
  }, [userPreference]);

  const languages = [
    { value: "EN", label: "English" },
    { value: "FR", label: "Français" },
  ];

  const handleBasicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBasicInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: any) => {
    // Handle both file upload events and direct File objects from camera
    const file = e.target?.files?.[0] || e;
    setProfileImage(file);
    if (file) {
      setEditProfile(true);
    }
  };

  if (isPending || isPendingUserPreference) return <LoaderIndicator />;

  const isVerified = userPreference?.driver?.isPhoneVerified;
  const phone = userPreference?.passenger?.phoneNumber;

  return (
    <>
      {completeProfile && (
        <div className="min-h-screen py-10 bg-white dark:bg-gray-900">
          <PassengerOnboardingForm
            onComplete={async () => {
              // Refresh user data after onboarding
              await queryClient.invalidateQueries({
                queryKey: [queryKey.USER],
              });
              await queryClient.invalidateQueries({
                queryKey: [queryKey.PREFERENCE],
              });
            }}
          />

          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              className="dark:border-gray-600 dark:text-white dark:bg-gray-600"
              onClick={() => setCompleteProfile(false)}
            >
              {t("profile.preferences.reset")}
            </Button>
          </div>
        </div>
      )}

      {completeDriver && (
        <div className="min-h-screen py-10 bg-white dark:bg-gray-900">
          <DriverOnboardingForm
            update={true}
            setCompleteDriver={setCompleteDriver}
          />

          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              className="dark:border-gray-600 dark:text-white dark:bg-gray-600"
              onClick={() => setCompleteDriver(false)}
            >
              {t("profile.preferences.reset")}
            </Button>
          </div>
        </div>
      )}

      {!completeDriver && !completeProfile && (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pt-20 pb-12">
          {/* Background Pattern */}
          <div className="fixed inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-800/50 bg-[size:40px_40px] pointer-events-none" />

          <div className="relative px-4 mx-auto max-w-[1600px]">
            {/* Profile Header Section */}
            <div className="mb-12">
              <Profile
                profileImage={profileImage}
                userData={userData}
                editProfile={editProfile}
                t={t}
                handleFileChange={handleFileChange}
                languages={languages}
                mutateUser={mutateUser}
                currentLanguage={currentLanguage}
                isPendingUser={isPendingUser}
              />
            </div>

            {/* Mobile Navigation Tabs */}
            <div className="lg:hidden mx-4 mb-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
                <div className="p-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    {t("profile.tabs.title", "Profile")}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      {
                        id: "preferences",
                        label: t("profile.tabs.preferences"),
                      },
                      { id: "basicInfo", label: t("profile.tabs.basicInfo") },
                      { id: "security", label: t("profile.tabs.security") },
                      {
                        id: "viewPreferences",
                        label: t("profile.tabs.viewPreferences"),
                      },
                      {
                        id: "chauffeur",
                        label: t("chauffeur.settings.title"),
                      },
                      {
                        id: "deleteAccount",
                        label: t("profile.tabs.deleteAccount"),
                      },
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => setActiveSection(id)}
                        className={`px-3 py-2 text-sm font-medium transition-colors ${
                          activeSection === id
                            ? "bg-primary-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Phone Verification Alert */}
            {!isVerified && phone && (
              <div className="mx-4 lg:mx-8 mb-8 bg-amber-500 dark:bg-amber-600 border border-amber-400/20 px-6 py-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 backdrop-blur-sm">
                      <PhoneOffIcon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-white font-semibold">
                      {t("profile_.phone.notVerified", { phone })}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVerify(true)}
                    className="ml-4 bg-white text-amber-700 border-0 hover:bg-white/90 font-semibold shadow-lg"
                  >
                    {t("profile_.phone.verifyNow")}
                  </Button>
                </div>
              </div>
            )}

            {verify && (
              <VerifyPhoneDialog
                phoneNumber={phone}
                open={verify}
                onOpenChange={setVerify}
              />
            )}

            {/* Main Content Grid */}
            <div className="mx-4 lg:mx-8 flex flex-col lg:flex-row gap-6">
              {/* Sidebar Navigation - Desktop Only */}
              <div className="hidden lg:block">
                <ProfileNav
                  activeSection={activeSection}
                  setActiveSection={setActiveSection}
                />
              </div>

              {/* Content Area */}
              <div className="flex-1 min-w-0 w-full lg:w-auto">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
                  <div className="p-4 sm:p-6 lg:p-8">
                    {activeSection === "preferences" && (
                      <>
                        {editPreferences ? (
                          <EditPreference
                            t={t}
                            preference={preference}
                            setPreference={setPreference}
                            setEditPreferences={setEditPreferences}
                            mutatePreference={mutatePreference}
                            isPendingPreference={isPendingPreference}
                            languages={languages}
                          />
                        ) : (
                          <DisplayPreference
                            t={t}
                            setEditPreferences={setEditPreferences}
                            userPreference={userPreference}
                            theme={theme}
                          />
                        )}
                      </>
                    )}

                    {activeSection === "basicInfo" && (
                      <>
                        {editBasicInfo ? (
                          <EditBasics
                            t={t}
                            basicInfo={basicInfo}
                            handleBasicChange={handleBasicChange}
                            userData={userData}
                            setEditBasicInfo={setEditBasicInfo}
                            mutateBasic={mutateBasic}
                            isPendingBasic={isPendingBasic}
                          />
                        ) : (
                          <DisplayBasics
                            t={t}
                            setEditBasicInfo={setEditBasicInfo}
                            userData={userData}
                          />
                        )}
                      </>
                    )}

                    {activeSection === "security" && (
                      <ChangePassword
                        phone={userData.phoneNumber}
                        isVerified={userPreference.driver.isPhoneVerified}
                      />
                    )}
                    {activeSection === "deleteAccount" && <DeleteAccount />}
                    {activeSection === "viewPreferences" && (
                      <ViewPreferences
                        setCompleteProfile={setCompleteProfile}
                        setCompleteDriver={setCompleteDriver}
                      />
                    )}
                    {activeSection === "chauffeur" && (
                      <ChauffeurSettings
                        initialData={{
                          isAvailableForChauffeur: userData?.isAvailableForChauffeur ?? false,
                          chauffeurHourlyRate: userData?.chauffeurHourlyRate ?? null,
                          chauffeurDailyRate: userData?.chauffeurDailyRate ?? null,
                          chauffeurDescription: userData?.chauffeurDescription ?? null,
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfilePage;
