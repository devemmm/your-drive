import React, { useCallback, useEffect, useState } from "react";
import i18n from "@/i18n";

const isLoggedIn = (): boolean => {
  try {
    return Boolean(localStorage.getItem("Your-DriveToken"));
  } catch {
    return false;
  }
};

const LocationPermission: React.FC = () => {
  const [locationChecked, setLocationChecked] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) return;

    try {
      const locationChecked = localStorage.getItem("locationChecked");
      if (locationChecked) {
        setLocationChecked(true);
        return;
      }
    } catch {
      // ignore
    }

    // Automatically request location permission
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`;
            const res = await fetch(url, {
              headers: {
                Accept: "application/json",
                "User-Agent": "YourDrive/1.0 (language-detection)",
              },
            });
            const data = await res.json();
            const address = data?.address || {};
            const province: string =
              address.state || address.province || address.region || "";
            if (/qu[eé]bec/i.test(province)) {
              i18n.changeLanguage("fr");
              try {
                localStorage.setItem("i18nextLng", "fr");
              } catch {
                console.log("Error setting language");
              }
            }
          } catch {
            // ignore
          } finally {
            try {
              localStorage.setItem("locationChecked", "true");
            } catch {
              console.log("Error setting locationChecked");
            }
            setLocationChecked(true);
          }
        },
        () => {
          // denied or failed
          try {
            localStorage.setItem("locationChecked", "true");
          } catch {
            console.log("Error setting locationChecked");
          }
          setLocationChecked(true);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
      );
    } else {
      // Geolocation not supported
      try {
        localStorage.setItem("locationChecked", "true");
      } catch {
        console.log("Error setting locationChecked");
      }
      setLocationChecked(true);
    }
  }, []);

  // This component doesn't render anything visible
  return null;
};

export default LocationPermission;
