import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  UserPlus,
  Home,
  Plus,
  Search,
  LayoutDashboard,
} from "lucide-react";
import Logo from "../logos/Logo";
import { motion, useScroll, useSpring, AnimatePresence } from "framer-motion";
import { useAuth } from "@/providers/Context/UseAuthContext";
import { dashboardPathForRole } from "@/utils/roleRoutes";
import LogoutButton from "../LogoutModal";
import AccountSwitcher from "../AccountSwitcher";
import { useTranslation } from "react-i18next";
import NotificationBell from "../Notifications";
import { LanguageSwitcher } from "../LanguageSwitcher";

const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  const { authenticated, user } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Get navbar background color based on current route
  const getNavbarBackgroundColor = () =>
    location.pathname === "/post-a-ride"
      ? "bg-green-600 dark:bg-green-600"
      : "bg-green-600 dark:bg-green-600";

  // Get text color based on current route
  const getNavbarTextColor = () => "text-white";

  // Get hover text color based on current route
  const getHoverTextColor = () => "hover:text-green-100 dark:hover:text-green-100";

  // Get hover background color based on current route
  const getHoverBackgroundColor = () => "hover:bg-green-700 dark:hover:bg-green-700";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        mobileMenuOpen &&
        !target.closest(".mobile-menu") &&
        !target.closest(".menu-button")
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY >= 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.header
        className={`sticky top-0 w-full transition-all duration-300 ${getNavbarBackgroundColor()} relative`}
        initial="hidden"
        animate="visible"
        style={{
          zIndex: 2000,
        }}
      >
        {/* Progress bar */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px bg-white"
          style={{ scaleX, transformOrigin: "0%" }}
        />


        <nav className="container mx-auto px-2 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center space-x-3 z-10 group hover:bg-primary-200/20 py-5 px-2"
            >
              <Logo className="h-9 w-9 transition-transform duration-300 group-hover:scale-105" />
              <span className="text-2xl font-black text-white">
                {t("navbar.appName")}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className={"hidden lg:flex items-center space-x-1"}>
              <Link
                to="/"
                className={`flex items-center space-x-2 px-2 py-2.5  font-medium ${getNavbarTextColor()} ${getHoverTextColor()} ${getHoverBackgroundColor()} transition-all duration-200`}
              >
                <Home className="h-5 w-5 hidden xl:block" />
                <span>{t("navbar.home")}</span>
              </Link>


              <Link
                to="/post-a-ride"
                className={`flex items-center space-x-2 px-2 py-2.5  font-medium ${getNavbarTextColor()} ${getHoverTextColor()} ${getHoverBackgroundColor()} transition-all duration-200`}
              >
                <Plus className="h-6 w-6 hidden xl:block" />
                <span>{t("navbar.driver")}</span>
              </Link>

              <Link
                to="/marketplace"
                className={`flex items-center space-x-2 px-2 py-2.5  font-medium ${getNavbarTextColor()} ${getHoverTextColor()} ${getHoverBackgroundColor()} transition-all duration-200`}
              >
                <Search className="h-5 w-5 hidden xl:block" />
                <span>{t("navbar.passenger")}</span>
              </Link>
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center space-x-3">
              <LanguageSwitcher />
              {authenticated ? (
                <div className="flex items-center space-x-3">
                  <AccountSwitcher />
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/register"
                    className={`flex items-center space-x-2 px-5 py-2.5 bg-white text-green-600 border-2 border-white font-bold hover:bg-green-50 transition-all duration-200 rounded-lg`}
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>{t("navbar.getStarted")}</span>
                  </Link>
                </div>
              )}
              {authenticated && <NotificationBell />}
            </div>

            {/* Mobile menu button and actions */}
            <div className="flex items-center space-x-2 lg:hidden">
              <LanguageSwitcher />
              {authenticated && <NotificationBell />}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`p-2  ${getNavbarTextColor()} ${getHoverTextColor()} ${getHoverBackgroundColor()} transition-all duration-200 menu-button`}
                aria-label={t("navbar.toggleMenu")}
              >
                <div className="relative w-6 h-6">
                  <motion.div
                    animate={mobileMenuOpen ? "open" : "closed"}
                    className="absolute inset-0"
                  >
                    <motion.span
                      variants={{
                        closed: { rotate: 0, y: 0 },
                        open: { rotate: 45, y: 8 },
                      }}
                      className="absolute top-1 left-0 w-6 h-0.5 bg-current transform origin-center transition-all duration-300"
                    />
                    <motion.span
                      variants={{
                        closed: { opacity: 1 },
                        open: { opacity: 0 },
                      }}
                      className="absolute top-3 left-0 w-6 h-0.5 bg-current transform origin-center transition-all duration-300"
                    />
                    <motion.span
                      variants={{
                        closed: { rotate: 0, y: 0 },
                        open: { rotate: -45, y: -8 },
                      }}
                      className="absolute top-5 left-0 w-6 h-0.5 bg-current transform origin-center transition-all duration-300"
                    />
                  </motion.div>
                </div>
              </button>
            </div>
          </div>

        </nav>
      </motion.header>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setMobileMenuOpen(false)}
            />

            <motion.div
              className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-gray-900 z-50 overflow-y-auto mobile-menu lg:hidden"
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Mobile Navigation Links */}
              <div className="p-6 space-y-2 pt-24">
                <Link
                  to="/"
                  className={`flex items-center space-x-3 p-3  ${getNavbarTextColor()} ${getHoverTextColor()} ${getHoverBackgroundColor()} transition-all duration-200`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Home className="h-5 w-5 text-primary-500" />
                  <span className="font-medium">{t("navbar.home")}</span>
                </Link>


                <Link
                  to="/post-a-ride"
                  className={`flex items-center space-x-3 p-3  ${getNavbarTextColor()} ${getHoverTextColor()} ${getHoverBackgroundColor()} transition-all duration-200`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-medium">{t("navbar.driver")}</span>
                </Link>

                <Link
                  to="/marketplace"
                  className={`flex items-center space-x-3 p-3  ${getNavbarTextColor()} ${getHoverTextColor()} ${getHoverBackgroundColor()} transition-all duration-200`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Search className="h-5 w-5" />
                  <span className="font-medium">{t("navbar.passenger")}</span>
                </Link>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pb-4">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("navbar.language", "Language")}</span>
                    <div className="[&_button]:bg-gray-100 [&_button]:dark:bg-gray-800 [&_button]:border-gray-300 [&_button]:dark:border-gray-600 [&_button]:text-gray-900 [&_button]:dark:text-gray-100">
                      <LanguageSwitcher />
                    </div>
                  </div>
                </div>
                {authenticated ? (
                  <div className="space-y-4 p-4">
                    <Link to={dashboardPathForRole((user as { role?: string } | null)?.role)} className="block">
                      <div className="flex items-center gap-2 px-2 py-2 font-semibold text-primary-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                        <LayoutDashboard className="mr-3 h-4 w-4" />
                        {t("common_.small.go")}
                      </div>
                    </Link>
                    <div className="px-3">
                      <LogoutButton className="w-full bg-red-800" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Link
                      to="/register"
                      className="block w-full bg-green-600 text-white py-3 px-2 border-2 border-green-600 hover:bg-green-700 transition-colors text-center font-bold rounded-lg"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t("navbar.getStarted")}
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
