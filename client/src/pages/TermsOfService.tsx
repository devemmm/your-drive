import React, { useEffect, useState } from "react";
import {
  FileText,
  Shield,
  AlertCircle,
  Clock,
  Users,
  Car,
  CreditCard,
  XCircle,
  Scale,
  RefreshCw,
  MessageCircle,
  HelpCircle,
  Key,
  Globe,
  UserCheck,
  DollarSign,
  Ban,
  MessageSquare,
  ShieldAlert,
  Gavel,
  Lock,
  Building,
  Handshake,
} from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/sections/Header";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";

const TermsOfService = () => {
  const { t } = useTranslation();
  const [sections, setSections] = useState([]);

  useEffect(() => {
    setSections([
      {
        icon: Shield,
        title: t("TermsOfService.sections.0.title"),
        content: t("TermsOfService.sections.0.content"),
        type: "primary",
        color: "border-primary bg-primary/5",
      },
      {
        icon: Globe,
        title: t("TermsOfService.sections.1.title"),
        content: t("TermsOfService.sections.1.content"),
        type: "default",
        color: "border-border bg-card/50",
      },
      {
        icon: UserCheck,
        title: t("TermsOfService.sections.2.title"),
        content: t("TermsOfService.sections.2.content"),
        type: "default",
        color: "border-border bg-card/50",
      },
      {
        icon: Users,
        title: t("TermsOfService.sections.3.title"),
        content: t("TermsOfService.sections.3.content"),
        type: "secondary",
        color: "border-secondary bg-secondary/5",
      },
      {
        icon: DollarSign,
        title: t("TermsOfService.sections.4.title"),
        content: t("TermsOfService.sections.4.content"),
        type: "accent",
        color: "border-accent bg-accent/5",
      },
      {
        icon: Clock,
        title: t("TermsOfService.sections.5.title"),
        content: t("TermsOfService.sections.5.content"),
        type: "default",
        color: "border-border bg-card/50",
      },
      {
        icon: XCircle,
        title: t("TermsOfService.sections.6.title"),
        content: t("TermsOfService.sections.6.content"),
        type: "danger",
        color: "border-red-500 bg-red-500/5",
      },
      {
        icon: MessageSquare,
        title: t("TermsOfService.sections.7.title"),
        content: t("TermsOfService.sections.7.content"),
        type: "default",
        color: "border-border bg-card/50",
      },
      {
        icon: ShieldAlert,
        title: t("TermsOfService.sections.8.title"),
        content: t("TermsOfService.sections.8.content"),
        type: "default",
        color: "border-border bg-card/50",
      },
      {
        icon: Scale,
        title: t("TermsOfService.sections.9.title"),
        content: t("TermsOfService.sections.9.content"),
        type: "default",
        color: "border-border bg-card/50",
      },
      {
        icon: Gavel,
        title: t("TermsOfService.sections.10.title"),
        content: t("TermsOfService.sections.10.content"),
        type: "default",
        color: "border-border bg-card/50",
      },
      {
        icon: RefreshCw,
        title: t("TermsOfService.sections.11.title"),
        content: t("TermsOfService.sections.11.content"),
        type: "default",
        color: "border-border bg-card/50",
      },
      {
        icon: FileText,
        title: t("TermsOfService.sections.12.title"),
        content: t("TermsOfService.sections.12.content"),
        type: "default",
        color: "border-border bg-card/50",
      },
      {
        icon: Building,
        title: t("TermsOfService.sections.13.title"),
        content: t("TermsOfService.sections.13.content"),
        type: "default",
        color: "border-border bg-card/50",
      },
      {
        icon: Key,
        title: t("TermsOfService.sections.14.title"),
        content: t("TermsOfService.sections.14.content"),
        type: "default",
        color: "border-border bg-card/50",
      },
      {
        icon: Lock,
        title: t("TermsOfService.sections.15.title"),
        content: t("TermsOfService.sections.15.content"),
        type: "default",
        color: "border-border bg-card/50",
      },
      {
        icon: AlertCircle,
        title: t("TermsOfService.sections.16.title"),
        content: t("TermsOfService.sections.16.content"),
        type: "default",
        color: "border-border bg-card/50",
      },
      {
        icon: Handshake,
        title: t("TermsOfService.sections.17.title"),
        content: t("TermsOfService.sections.17.content"),
        type: "default",
        color: "border-border bg-card/50",
      },
      {
        icon: Ban,
        title: t("TermsOfService.sections.18.title"),
        content: t("TermsOfService.sections.18.content"),
        type: "default",
        color: "border-border bg-card/50",
      },
      {
        icon: FileText,
        title: t("TermsOfService.sections.19.title"),
        content: t("TermsOfService.sections.19.content"),
        type: "default",
        color: "border-border bg-card/50",
      },
      {
        icon: MessageCircle,
        title: t("TermsOfService.sections.20.title"),
        content: t("TermsOfService.sections.20.content"),
        type: "primary",
        color: "border-primary bg-primary/5",
      },
    ]);
  }, [t]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="bg-background min-h-screen">
      <PageHeader
        title={t("TermsOfService.title")}
        subtitle={t("TermsOfService.subtitle")}
        backgroundImage="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
      />

      <div className="container mx-auto py-20 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Important Notice Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <Card className="border-red-500/30 bg-red-700/20 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <AlertCircle
                    className="text-red-700 mt-1 flex-shrink-0"
                    size={24}
                  />
                  <div>
                    <p className="text-foreground text-xl mb-2 font-bold">
                      {t("TermsOfService.importanceTitle")}
                    </p>
                    <p className="text-foreground mb-2">
                      {t("TermsOfService.importantNotice")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Introduction Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-16"
          >
            <Card className="border-border bg-card/90 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="flex items-start space-x-6 mb-8">
                  <div className="p-4 bg-primary/10 rounded-full">
                    <FileText className="text-primary" size={36} />
                  </div>
                  <div>
                    <h2 className="text-4xl font-bold text-foreground mb-3">
                      {t("TermsOfService.Your-DriveTerms")}
                    </h2>
                    <p className="text-muted-foreground text-xl">
                      {t("TermsOfService.guidelinesDescription")}
                    </p>
                    <div className="flex items-center mt-4 text-sm text-muted-foreground">
                      <Clock className="mr-2 h-4 w-4" />
                      {t("TermsOfService.lastUpdated")}
                    </div>
                  </div>
                </div>
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <p className="text-muted-foreground leading-relaxed text-lg">
                    {t("TermsOfService.welcomeMessage")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Terms Sections */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            {sections.map((section, index) => (
              <motion.div key={index} variants={item}>
                <Card
                  className={`transition-all duration-500 border-l-4 ${section.color} backdrop-blur-sm group hover:-translate-y-1`}
                >
                  <CardContent className="p-8">
                    <div className="flex items-start space-x-6">
                      <div className="flex flex-col items-center">
                        <div className="text-2xl font-bold text-primary mb-2">
                          {index + 1}
                        </div>
                        <div
                          className={`p-4 rounded-full ${
                            section.type === "primary"
                              ? "bg-primary/10"
                              : section.type === "secondary"
                              ? "bg-secondary/10"
                              : section.type === "accent"
                              ? "bg-accent/10"
                              : section.type === "danger"
                              ? "bg-red-500/10"
                              : "bg-muted"
                          }`}
                        >
                          <section.icon
                            className={`${
                              section.type === "primary"
                                ? "text-primary"
                                : section.type === "secondary"
                                ? "text-secondary"
                                : section.type === "accent"
                                ? "text-accent"
                                : section.type === "danger"
                                ? "text-red-500"
                                : "text-muted-foreground"
                            }`}
                            size={28}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors">
                          {section.title}
                        </h3>
                        <div className="prose prose-lg dark:prose-invert max-w-none">
                          <div className="text-muted-foreground leading-relaxed text-lg">
                            {section.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Contact Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-20 text-center"
          >
            <Card className="bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground p-12 rounded-3xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent"></div>
              <CardContent className="relative z-10">
                <div className="flex items-center justify-center mb-8">
                  <FileText size={48} className="mr-4" />
                  <h3 className="text-4xl font-black">
                    {t("TermsOfService.questionsTitle")}
                  </h3>
                </div>
                <p className="text-xl mb-10 opacity-90 max-w-3xl mx-auto leading-relaxed">
                  {t("TermsOfService.questionsDescription")}
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-6">
                  <a
                    href="/contact"
                    className="inline-flex items-center bg-background text-primary px-10 py-5 rounded-2xl font-bold transform hover:-translate-y-1 transition-all duration-300 text-lg"
                  >
                    <MessageCircle className="mr-3 w-6 h-6" />
                    {t("TermsOfService.contactUs")}
                  </a>
                  <a
                    href="/help-center"
                    className="inline-flex items-center bg-secondary text-secondary-foreground px-10 py-5 rounded-2xl font-bold transform hover:-translate-y-1 transition-all duration-300 text-lg"
                  >
                    <HelpCircle className="mr-3 w-6 h-6" />
                    {t("TermsOfService.helpCenter")}
                  </a>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
