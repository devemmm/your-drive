// Interface for stored accounts
interface StoredAccount {
  id: string;
  email: string;
  name: string;
  role: "passenger" | "driver" | "admin";
  profileImage?: string;
  token: string;
  isActive: boolean;
}

// Interface for onboarding status from API
interface OnboardingStatus {
  roles: string[];
  common: {
    isOnboarded: boolean;
    profileImage?: {
      url: string;
    };
    language: string;
    theme: string;
    notificationPref: string;
    twoFactorEnabled: boolean;
  };
  driver?: {
    isDriverOnboarded: boolean;
    licenseNumber?: string;
    licenseImage?: any;
    drivingExperience?: string;
  };
  passenger?: {
    isPassengerOnboarded: boolean;
    travelPreferences?: any;
    frequentRoutes?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    referralCode?: string;
  };
}

export class AccountManager {
  private static STORAGE_KEY = "Your-DriveAccounts";

  // Get all stored accounts
  static getAccounts(): StoredAccount[] {
    const accounts = localStorage.getItem(this.STORAGE_KEY);
    return accounts ? JSON.parse(accounts) : [];
  }

  // Store accounts
  static setAccounts(accounts: StoredAccount[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(accounts));
  }

  // Add or update account
  static addAccount(accountData: {
    id: string;
    email: string;
    name: string;
    role: "passenger" | "driver" | "admin";
    profileImage?: string;
    token: string;
  }): void {
    const accounts = this.getAccounts();

    // Deactivate all accounts
    const updatedAccounts = accounts.map((acc) => ({
      ...acc,
      isActive: false,
    }));

    // Check if account already exists
    const existingIndex = updatedAccounts.findIndex(
      (acc) => acc.email === accountData.email && acc.role === accountData.role
    );

    if (existingIndex >= 0) {
      // Update existing account
      updatedAccounts[existingIndex] = {
        ...accountData,
        isActive: true,
      };
    } else {
      // Add new account
      updatedAccounts.push({
        ...accountData,
        isActive: true,
      });
    }

    this.setAccounts(updatedAccounts);
  }

  // Add multiple roles for the same user based on onboarding status
  static addUserWithMultipleRoles(userData: {
    id: string;
    email: string;
    name: string;
    profileImage?: string;
    token: string;
    onboardingStatus: OnboardingStatus;
    activeRole: "passenger" | "driver" | "admin";
  }): void {
    const accounts = this.getAccounts();
    const { onboardingStatus, activeRole, ...baseUserData } = userData;

    // Remove existing accounts for this email
    const filteredAccounts = accounts.filter(
      (acc) => acc.email !== userData.email
    );

    // Deactivate all remaining accounts
    const updatedAccounts = filteredAccounts.map((acc) => ({
      ...acc,
      isActive: false,
    }));

    let accountsAdded = 0;

    // Add accounts for each role the user has
    onboardingStatus.roles.forEach((role) => {
      // SECURITY FIX: Only process valid roles
      let roleKey: "passenger" | "driver" | "admin";
      if (role === "DRIVER" || role === "driver") {
        roleKey = "driver";
      } else if (role === "PASSENGER" || role === "passenger") {
        roleKey = "passenger";
      } else if (role === "ADMIN" || role === "admin") {
        roleKey = "admin";
      } else {
        // Skip invalid roles
        console.warn("Invalid role found in onboarding status:", role);
        return;
      }

      // Check if user is onboarded for this role
      let isOnboarded = false;
      if (roleKey === "driver") {
        isOnboarded = onboardingStatus.driver?.isDriverOnboarded || false;
      } else if (roleKey === "passenger") {
        isOnboarded = onboardingStatus.passenger?.isPassengerOnboarded || false;
      } else if (roleKey === "admin") {
        isOnboarded = true; // Admin is always considered onboarded
      }

      // console.log(
      //   `Role ${roleKey}: onboarded=${isOnboarded}, isActive=${
      //     roleKey === activeRole
      //   }`
      // );

      // Add ALL accounts for roles the user has, even if not onboarded
      // This allows switching to incomplete roles for onboarding
      const newAccount = {
        ...baseUserData,
        role: roleKey,
        isActive: roleKey === activeRole,
      };

      updatedAccounts.push(newAccount);
      accountsAdded++;
    });

    this.setAccounts(updatedAccounts);

    // Verify the accounts were saved correctly
    const savedAccounts = this.getAccounts();
  }

  // Get current active account
  static getActiveAccount(): StoredAccount | null {
    const accounts = this.getAccounts();
    return accounts.find((acc) => acc.isActive) || null;
  }

  // Get available roles for current user's email
  static getAvailableRolesForCurrentUser(): StoredAccount[] {
    const activeAccount = this.getActiveAccount();
    if (!activeAccount) return [];

    const accounts = this.getAccounts();
    return accounts.filter((acc) => acc.email === activeAccount.email);
  }

  // Switch to different role for same user
  static switchUserRole(
    role: "passenger" | "driver" | "admin"
  ): StoredAccount | null {
    const activeAccount = this.getActiveAccount();

    if (!activeAccount) {
      console.error("No active account found");
      return null;
    }

    const accounts = this.getAccounts();

    // Find the account with same email but different role
    const targetAccount = accounts.find(
      (acc) => acc.email === activeAccount.email && acc.role === role
    );

    if (!targetAccount) {
      console.error(
        `No account found for email ${activeAccount.email} with role ${role}`
      );
      console.log(
        "Available accounts for this email:",
        accounts.filter((acc) => acc.email === activeAccount.email)
      );
      return null;
    }

    // Deactivate all accounts and activate the target role
    const updatedAccounts = accounts.map((acc) => ({
      ...acc,
      isActive: acc.email === activeAccount.email && acc.role === role,
    }));

    this.setAccounts(updatedAccounts);

    // Update localStorage with new active role

    localStorage.setItem("Your-DriveToken", JSON.stringify(targetAccount.token));
    localStorage.setItem("userRole", JSON.stringify(targetAccount.role));

    return targetAccount;
  }

  // Switch account (existing method for different email accounts)
  static switchAccount(accountId: string): StoredAccount | null {
    const accounts = this.getAccounts();
    const updatedAccounts = accounts.map((acc) => ({
      ...acc,
      isActive: acc.id === accountId,
    }));

    this.setAccounts(updatedAccounts);

    const activeAccount = updatedAccounts.find((acc) => acc.id === accountId);
    if (activeAccount) {
      // Update localStorage with new active account
      localStorage.setItem("Your-DriveToken", JSON.stringify(activeAccount.token));
      localStorage.setItem("userRole", JSON.stringify(activeAccount.role));
    }

    return activeAccount || null;
  }

  // Remove account
  static removeAccount(accountId: string): void {
    const accounts = this.getAccounts();
    const updatedAccounts = accounts.filter((acc) => acc.id !== accountId);
    this.setAccounts(updatedAccounts);
  }

  // Clear all accounts
  static clearAllAccounts(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Get account by email and role
  static getAccountByEmailAndRole(
    email: string,
    role: string
  ): StoredAccount | null {
    const accounts = this.getAccounts();
    return (
      accounts.find((acc) => acc.email === email && acc.role === role) || null
    );
  }

  // Check if user has multiple roles available
  static hasMultipleRoles(): boolean {
    const availableRoles = this.getAvailableRolesForCurrentUser();
    return availableRoles.length > 1;
  }

  // Get other roles for current user (excluding active one)
  static getOtherRolesForCurrentUser(): StoredAccount[] {
    const activeAccount = this.getActiveAccount();
    if (!activeAccount) return [];

    const availableRoles = this.getAvailableRolesForCurrentUser();
    return availableRoles.filter((acc) => acc.role !== activeAccount.role);
  }
}
