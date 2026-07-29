import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const isLoggedIn = (): boolean => {
  try {
    return Boolean(localStorage.getItem("Your-DriveToken"));
  } catch {
    return false;
  }
};

const CookieBanner: React.FC = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) return;
    try {
      const cookiesAccepted = localStorage.getItem("cookiesAccepted");
      if (!cookiesAccepted) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const acceptCookies = useCallback(() => {
    try {
      localStorage.setItem("cookiesAccepted", "true");
    } catch {
      // console.log("Error accepting cookies");
    }
    setVisible(false);
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem("cookiesAccepted", "true");
    } catch {
      // console.log("Error dismissing cookie banner");
    }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(96vw,680px)]">
      <div className="bg-card border border-border shadow-md rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex-1">
          <p className="text-sm sm:text-base font-medium text-foreground">
            {t("cookieBanner.title")}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {t("cookieBanner.description")}
          </p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={dismiss}
            className="h-9 px-3 rounded-md border border-border text-foreground hover:bg-muted"
          >
            {t("cookieBanner.dismiss")}
          </button>
          <button
            onClick={acceptCookies}
            className="h-9 px-3 rounded-md bg-primary text-primary-foreground hover:opacity-90"
          >
            {t("cookieBanner.accept")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
