import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/Context/UseAuthContext";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, User } from "lucide-react";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { useReactItems } from "@/lib/ReactTranslation";

export default function LogoutButton({ className }: { className?: string }) {
  const { isLogout, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useReactItems();

  const handleLogout = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (isLogout) return; // Prevent multiple logout attempts

    try {
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className={className}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
        >
          {t("common_.small.logout")}
        </Button>
      </DialogTrigger>
      <DialogContent className="dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle>{t("common_.small.logoutHeader")}</DialogTitle>
          <DialogDescription>{t("common_.small.logoutDesc")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={isLogout}
            className="dark:bg-gray-700"
            onClick={() => setOpen(false)}
          >
            {t("common_.small.logoutCancel")}
          </Button>
          <Button onClick={handleLogout} disabled={isLogout}>
            {isLogout ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("common_.small.logoutProcessing")}
              </>
            ) : (
              t("common_.small.logoutConfirm")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const UserAvatar = ({
  name,
  image,
}: {
  name: string;
  image?: string;
}) => {
  const [open, setOpen] = useState(false);
  const { user: loggedInUser } = useAuth();

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const handleRoleSwitch = () => {
    const currentRole = loggedInUser?.role;
    const newRole = currentRole === "passenger" ? "driver" : "passenger";

    localStorage.setItem("userRole", JSON.stringify(newRole));
    window.location.reload();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-10 w-10 cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-red-500 hover:scale-105">
          <AvatarImage src={image} alt={name} className="object-cover" />
          <AvatarFallback className="bg-gradient-to-br from-red-500 to-red-700 text-white font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-64 p-2 rounded-xl shadow-lg border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-900"
      >
        <DropdownMenuLabel className="px-4 py-2 flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={image} alt={name} />
            <AvatarFallback className="bg-red-100 text-red-800 dark:bg-red-800 dark:text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              View profile
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-gray-100 dark:bg-gray-700" />

        <Link to="/profile">
          <DropdownMenuItem className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-600/20 hover:text-red-600 dark:hover:text-red-400 focus:bg-red-50 dark:focus:bg-red-600/20 focus:text-red-600 dark:focus:text-red-400 transition-colors cursor-pointer">
            <User className="mr-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
            Profile
          </DropdownMenuItem>
        </Link>

        <DropdownMenuItem className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-600/20 hover:text-red-600 dark:hover:text-red-400 focus:bg-red-50 dark:focus:bg-red-600/20 focus:text-red-600 dark:focus:text-red-400 transition-colors cursor-pointer">
          <Settings className="mr-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-gray-100 dark:bg-gray-700" />

        <DropdownMenuItem
          className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-600/20 hover:text-red-600 dark:hover:text-red-400 focus:bg-red-50 dark:focus:bg-red-600/20 focus:text-red-600 dark:focus:text-red-400 transition-colors cursor-pointer"
          onClick={handleRoleSwitch}
        >
          <div className="flex items-center justify-between w-full">
            <Label
              htmlFor="role-switch"
              className="text-sm font-medium cursor-pointer"
            >
              Switch to{" "}
              {loggedInUser?.role === "passenger" ? "Driver" : "Passenger"}
            </Label>
            <Switch
              id="role-switch"
              checked={loggedInUser?.role === "driver"}
              className="ml-2"
            />
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-gray-100 dark:bg-gray-700" />

        <DropdownMenuItem
          className="px-2 py-2"
          onSelect={(e) => {
            e.preventDefault(); // Prevent dropdown from closing
          }}
        >
          <LogoutButton className="w-full bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export function ShowCustomToast(
  toast: any,
  title: string,
  description: string
) {
  return toast({
    title,
    description,
    style: {
      backgroundColor: "#309898",
      color: "#ffffff",
      border: "1px solid #103b45",
      borderRadius: "8px",
      padding: "12px 20px",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
    },
  });
}
