import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Logo from "../logos/Logo";
import { Mail, Phone, MapPin } from "lucide-react";

const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white mt-24 border-t-4 border-green-600">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link
              to="/"
              className="inline-flex items-center mb-6"
            >
              <Logo className="h-10 w-10 text-white" />
              <span className="ml-3 text-2xl font-black text-white">
                {t("navbar.appName")}
              </span>
            </Link>
            <p className="text-gray-400 mb-6 leading-relaxed">
              {t("footer.companyDescription")}
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center space-x-3 text-gray-300">
                <Mail className="h-4 w-4 text-green-400" />
                <span className="text-sm">info@yourdrive.com</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <Phone className="h-4 w-4 text-green-400" />
                <span className="text-sm">+250 788 123 456</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <MapPin className="h-4 w-4 text-green-400" />
                <span className="text-sm">Kigali, Rwanda</span>
              </div>
            </div>

            <div className="flex space-x-4">
              <a
                href="#"
                className="w-10 h-10 bg-white/10 hover:bg-green-600 flex items-center justify-center transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5">
                  <path d="M24,4.6c-0.9,0.4-1.8,0.7-2.8,0.8c1-0.6,1.8-1.6,2.2-2.7c-1,0.6-2,1-3.1,1.2c-0.9-1-2.2-1.6-3.6-1.6 c-2.7,0-4.9,2.2-4.9,4.9c0,0.4,0,0.8,0.1,1.1C7.7,8.1,4.1,6.1,1.7,3.1C1.2,3.9,1,4.7,1,5.6c0,1.7,0.9,3.2,2.2,4.1 C2.4,9.7,1.6,9.5,1,9.1c0,0,0,0,0,0.1c0,2.4,1.7,4.4,3.9,4.8c-0.4,0.1-0.8,0.2-1.3,0.2c-0.3,0-0.6,0-0.9-0.1c0.6,2,2.4,3.4,4.6,3.4 c-1.7,1.3-3.8,2.1-6.1,2.1c-0.4,0-0.8,0-1.2-0.1c2.2,1.4,4.8,2.2,7.5,2.2c9.1,0,14-7.5,14-14c0-0.2,0-0.4,0-0.6 C22.5,6.4,23.3,5.5,24,4.6z" />
                </svg>
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-white/10 hover:bg-green-600 flex items-center justify-center transition-colors"
              >
                <svg viewBox="0 0 30 30" fill="currentColor" className="h-6">
                  <circle cx="15" cy="15" r="4" />
                  <path d="M19.999,3h-10C6.14,3,3,6.141,3,10.001v10C3,23.86,6.141,27,10.001,27h10C23.86,27,27,23.859,27,19.999v-10   C27,6.14,23.859,3,19.999,3z M15,21c-3.309,0-6-2.691-6-6s2.691-6,6-6s6,2.691,6,6S18.309,21,15,21z M22,9c-0.552,0-1-0.448-1-1   c0-0.552,0.448-1,1-1s1,0.448,1,1C23,8.552,22.552,9,22,9z" />
                </svg>
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-white/10 hover:bg-green-600 flex items-center justify-center transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5">
                  <path d="M22,0H2C0.895,0,0,0.895,0,2v20c0,1.105,0.895,2,2,2h11v-9h-3v-4h3V8.413c0-3.1,1.893-4.788,4.659-4.788 c1.325,0,2.463,0.099,2.795,0.143v3.24l-1.918,0.001c-1.504,0-1.795,0.715-1.795,1.763V11h4.44l-1,4h-3.44v9H22c1.105,0,2-0.895,2-2 V2C24,0.895,23.105,0,22,0z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-bold text-lg mb-6 text-white border-b-2 border-green-600 pb-2 inline-block">
              {t("footer.company")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/about-us"
                  className="text-gray-400 hover:text-green-400 transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-green-600 mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>{t("navbar.about")}</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/post-a-ride"
                  className="text-gray-400 hover:text-green-400 transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-green-600 mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>{t("navbar.driver")}</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/book-a-ride"
                  className="text-gray-400 hover:text-green-400 transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-green-600 mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>{t("navbar.passenger")}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Help Links */}
          <div>
            <h3 className="font-bold text-lg mb-6 text-white border-b-2 border-green-600 pb-2 inline-block">
              {t("footer.help")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/help-center"
                  className="text-gray-400 hover:text-green-400 transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-green-600 mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>{t("footer.helpCenter")}</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-gray-400 hover:text-green-400 transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-green-600 mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>{t("footer.contact")}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-bold text-lg mb-6 text-white border-b-2 border-green-600 pb-2 inline-block">
              {t("footer.documents")}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/terms-of-service"
                  className="text-gray-400 hover:text-green-400 transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-green-600 mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>{t("footer.termsOfService")}</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/policies"
                  className="text-gray-400 hover:text-green-400 transition-colors flex items-center group"
                >
                  <span className="w-2 h-2 bg-green-600 mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span>{t("common_.small.policy")}</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t-2 border-white/10 pt-8 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              {t("navbar.copyright", {
                year: new Date().getFullYear(),
                appName: t("navbar.appName"),
              })}
            </p>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span>Made with</span>
              <span className="text-green-500">❤️</span>
              <span>for travelers in Rwanda</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
