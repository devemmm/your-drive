export function getToken() {
  if (typeof window === "undefined") return null;
  
  try {
    return JSON.parse(localStorage.getItem("Your-DriveToken") || "null");
  } catch {
    // If parsing fails, clear the corrupted token and return null
    localStorage.removeItem("Your-DriveToken");
    return null;
  }
}

export const userRole = (() => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("userRole") || "null");
  } catch {
    localStorage.removeItem("userRole");
    return null;
  }
})();
// export const userRole = (localStorage.getItem("userRole") || "").toUpperCase();
