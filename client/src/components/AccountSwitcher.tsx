import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/providers/Context/UseAuthContext";
import { Link, useLocation } from "react-router-dom";
import { AccountManager } from "@/utils/accountManager";
import { dashboardPathForRole } from "@/utils/roleRoutes";
import { useTranslation } from "react-i18next";
import LogoutButton from "./LogoutModal";

// Remove all role-based logic and UI
interface StoredAccount {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
  token: string;
  isActive: boolean;
}

export const AccountSwitcher: React.FC = () => {
  const { user: currentUser, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const location = useLocation();

  // Get navbar background color based on current route
  const getNavbarBackgroundColor = () => {
    if (location.pathname === "/post-a-ride") {
      return "bg-black dark:bg-black";
    }
    return "bg-primary dark:bg-primary";
  };

  const [accounts, setAccounts] = useState<StoredAccount[]>(
    AccountManager.getAccounts()
  );

  // Get current active account
  const currentAccount = AccountManager.getActiveAccount();

  // Switch to different account (for different emails)
  const switchAccount = async (account: StoredAccount) => {
    try {
      AccountManager.switchAccount(account.id);
      window.location.replace("/");
    } catch (error) {
      console.error("Error switching account:", error);
    }
  };

  // Remove account
  const removeAccount = (accountId: string) => {
    AccountManager.removeAccount(accountId);
    setAccounts(AccountManager.getAccounts());
    if (currentAccount?.id === accountId) {
      logout();
    }
  };

  if (!currentUser) return null;

  const userInitials =
    currentUser.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  // Only show accounts with different emails
  const otherEmailAccounts = accounts.filter(
    (account) =>
      account.email !== currentUser.email && account.id !== currentAccount?.id
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          data-testid="account-menu-trigger"
          variant="ghost"
          className="relative h-10 w-auto px-2 hover:bg-white/20 dark:hover:bg-white/20 transition-all duration-200"
        >
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={currentUser.profileImage?.url}
                alt={currentUser.name}
                className="h-8 w-8 object-cover"
              />
              <AvatarFallback className="bg-white/20 text-white text-sm">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="h-4 w-4 text-white" />
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className={`w-80 p-2 shadow-xl border border-slate-200 ${
          location.pathname === "/post-a-ride"
            ? "bg-black"
            : "bg-primary-500"
        }  text-white dark:border-slate-800 dark:bg-slate-900`}
      >
        {/* Current Account */}
        <DropdownMenuLabel className="px-4 py-3">
          <Link to="/profile" onClick={() => setOpen(false)}>
            <div className="flex items-center justify-between p-3 hover:bg-primary-300 dark:hover:bg-slate-800/50 transition-all cursor-pointer">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={currentUser.profileImage?.url}
                    alt={currentUser.name}
                  />
                  <AvatarFallback className="bg-primary text-white">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate hover:text-primary transition-colors">
                    {currentUser.name}
                  </p>
                  <p className="text-xs text-white truncate  transition-colors">
                    {currentUser.email}
                  </p>
                </div>
              </div>

              <Check className="h-4 w-4 text-primary" />
            </div>
          </Link>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />

        {/* Quick Actions */}
        <div className="px-2 py-1">
          <Link to={dashboardPathForRole(currentUser.role)} onClick={() => setOpen(false)}>
            <DropdownMenuItem className="px-4 py-2 text-white hover:bg-primary-300 dark:hover:bg-slate-800 transition-colors cursor-pointer">
              <LayoutDashboard className="mr-3 h-4 w-4" />
              {t("switcher.dashboard")}
            </DropdownMenuItem>
          </Link>
        </div>

        <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />

        {/* Other Email Accounts */}
        {otherEmailAccounts.length > 0 && (
          <>
            <DropdownMenuLabel className="px-4 py-2 text-xs text-white uppercase tracking-wider">
              {t("switcher.account")}
            </DropdownMenuLabel>
            <div className="px-2 py-1 max-h-48 overflow-y-auto">
              {otherEmailAccounts.map((account) => {
                const accountInitials = account.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase();

                return (
                  <DropdownMenuItem
                    key={account.id}
                    className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-white transition-colors cursor-pointer"
                    onClick={() => switchAccount(account)}
                  >
                    <div className="flex items-center space-x-3 w-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={account.profileImage}
                          alt={account.name}
                        />
                        <AvatarFallback className="bg-white text-primary">
                          {accountInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">
                          {account.name}
                        </p>
                        <p className="text-xs text-white truncate">
                          {account.email}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </div>
            <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
          </>
        )}

        <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />

        {/* Sign out */}
        <div className="px-2 py-1">
          <DropdownMenuItem>
            <LogoutButton className="px-4 py-2 text-white bg-red-700 hover:bg-red-600 dark:hover:bg-red-900/20 transition-colors cursor-pointer w-full" />
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AccountSwitcher;
