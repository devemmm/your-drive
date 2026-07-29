import React, { useEffect, useState } from "react";
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  MessageCircle,
  Headphones,
  BookOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/sections/Header";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";

type FAQItem = {
  question: string;
  answer: string | React.ReactNode;
  category: string;
};

const HelpCenter: React.FC = () => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>(
    t("HelpCenter.general")
  );
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const toggleItem = (index: number) => {
    setExpandedItem(expandedItem === index ? null : index);
  };

  useEffect(() => {
    setActiveCategory(t("HelpCenter.general"));
  }, [t]);

  const faqItems: FAQItem[] = [
    {
      question: t("HelpCenter.whatIsYourDrive"),
      answer: t("HelpCenter.whatIsYourDriveDesc"),
      category: t("HelpCenter.general"),
    },
    {
      question: t("HelpCenter.howItWorks"),
      answer: t("HelpCenter.howItWorksDesc"),
      category: t("HelpCenter.general"),
    },
    {
      question: t("HelpCenter.redeSharing"),
      answer: t("HelpCenter.redeSharingDesc"),
      category: t("HelpCenter.general"),
    },
    {
      question: t("HelpCenter.create"),
      answer: t("HelpCenter.createDesc"),
      category: t("HelpCenter.account"),
    },
    {
      question: t("HelpCenter.reset"),
      answer: t("HelpCenter.resetDesc"),
      category: t("HelpCenter.account"),
    },
    {
      question: t("HelpCenter.post"),
      answer: t("HelpCenter.postDesc"),
      category: t("HelpCenter.drivers"),
    },
    {
      question: t("HelpCenter.verify"),
      answer: t("HelpCenter.verifyDesc"),
      category: t("HelpCenter.drivers"),
    },
    {
      question: t("HelpCenter.book"),
      answer: t("HelpCenter.bookDesc"),
      category: t("HelpCenter.passengers"),
    },
    {
      question: t("HelpCenter.cancel"),
      answer: t("HelpCenter.cancelDesc"),
      category: t("HelpCenter.passengers"),
    },
    {
      question: t("HelpCenter.payment"),
      answer: t("HelpCenter.paymentDesc"),
      category: t("HelpCenter.payments"),
    },
    {
      question: t("HelpCenter.coupons"),
      answer: t("HelpCenter.couponsDesc"),
      category: t("HelpCenter.payments"),
    },
    {
      question: t("HelpCenter.cities"),
      answer: t("HelpCenter.citiesDesc"),
      category: t("HelpCenter.general"),
    },
    {
      question: t("HelpCenter.safety"),
      answer: t("HelpCenter.safetyDesc"),
      category: t("HelpCenter.general"),
    },
    {
      question: t("HelpCenter.needApp"),
      answer: t("HelpCenter.needAppDesc"),
      category: t("HelpCenter.general"),
    },
    {
      question: t("HelpCenter.bookRide"),
      answer: t("HelpCenter.bookRideDesc"),
      category: t("HelpCenter.general"),
    },
    {
      question: t("HelpCenter.messageDriver"),
      answer: t("HelpCenter.messageDriverDesc"),
      category: t("HelpCenter.passengers"),
    },
    {
      question: t("HelpCenter.bookingFees"),
      answer: t("HelpCenter.bookingFeesDesc"),
      category: t("HelpCenter.passengers"),
    },
    {
      question: t("HelpCenter.cancelBooking"),
      answer: t("HelpCenter.cancelBookingDesc"),
      category: t("HelpCenter.account"),
    },
    {
      question: t("HelpCenter.choosePassenger"),
      answer: t("HelpCenter.choosePassengerDesc"),
      category: t("HelpCenter.account"),
    },
    {
      question: t("HelpCenter.postRide"),
      answer: t("HelpCenter.postRideDesc"),
      category: t("HelpCenter.drivers"),
    },
    {
      question: t("HelpCenter.setPrice"),
      answer: t("HelpCenter.setPriceDesc"),
      category: t("HelpCenter.drivers"),
    },
    {
      question: t("HelpCenter.whenPaid"),
      answer: t("HelpCenter.whenPaidDesc")
        .split("-")
        .map((line, index) => (
          <p key={index}>
            {line.split(":").map((el, i) => {
              if (i === 0) {
                return <b key={i}>{el} </b>;
              }
              return <span key={i}>{el}</span>;
            })}
          </p>
        )),
      category: t("HelpCenter.drivers"),
    },
    {
      question: t("HelpCenter.driverFees"),
      answer: t("HelpCenter.driverFeesDesc"),
      category: t("HelpCenter.drivers"),
    },
    {
      question: t("HelpCenter.noShow"),
      answer: t("HelpCenter.noShowDesc"),
      category: t("HelpCenter.drivers"),
    },
    {
      question: t("HelpCenter.payment"),
      answer: t("HelpCenter.paymentDesc"),
      category: t("HelpCenter.payments"),
    },
    {
      question: t("HelpCenter.rewards"),
      answer: t("HelpCenter.rewardsDesc"),
      category: t("HelpCenter.payments"),
    },
    {
      question: t("HelpCenter.couponExpiry"),
      answer: t("HelpCenter.couponExpiryDesc"),
      category: t("HelpCenter.payments"),
    },
  ];

  const filteredItems = faqItems.filter(
    (item) => item.category === activeCategory
  );

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
    <div className="bg-background">
      <PageHeader
        title={t("HelpCenter.title")}
        subtitle={t("HelpCenter.subtitle")}
        backgroundImage="https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8aGVscHxlbnwwfHwwfHx8MA%3D%3D"
      />

      <div className="container mx-auto py-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Category Filter */}
          <div className="mb-16">
            <motion.div
              className="flex flex-wrap gap-4 justify-center"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {[
                t("HelpCenter.general"),
                t("HelpCenter.account"),
                t("HelpCenter.drivers"),
                t("HelpCenter.passengers"),
                t("HelpCenter.payments"),
              ].map((category) => (
                <motion.button
                  key={category}
                  variants={item}
                  onClick={() => setActiveCategory(category)}
                  className={`px-8 py-4  font-semibold transition-all duration-300 text-lg border-2 ${
                    activeCategory === category
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:bg-muted hover:border-primary/50"
                  }`}
                >
                  {category[0].toUpperCase() + category.slice(1)}
                </motion.button>
              ))}
            </motion.div>
          </div>

          {/* FAQ Items */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {filteredItems.map((item, index) => (
              <motion.div key={index}>
                <Card className="border-2 border-border bg-card/90 backdrop-blur-sm group hover:border-primary/50 transition-all duration-300">
                  <CardContent className="p-6">
                    <button
                      onClick={() => toggleItem(index)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <h3 className="text-xl font-bold text-foreground pr-6 group-hover:text-primary transition-colors">
                        {item.question}
                      </h3>
                      {expandedItem === index ? (
                        <ChevronUp className="text-muted-foreground flex-shrink-0 text-2xl" />
                      ) : (
                        <ChevronDown className="text-muted-foreground flex-shrink-0 text-2xl" />
                      )}
                    </button>
                    {expandedItem === index && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4 }}
                        className="mt-6 pt-6 border-t border-border"
                      >
                        <p className="text-muted-foreground leading-relaxed text-lg">
                          {item.answer}
                        </p>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Contact Support */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-20 text-center"
          >
            <Card className="bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground p-12  relative overflow-hidden border-2 border-primary">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent"></div>
              <CardContent className="relative z-10">
                <div className="flex items-center justify-center mb-6">
                  <Headphones size={48} className="mr-4" />
                  <h3 className="text-3xl font-black">
                    {t("HelpCenter.stillNeedHelp")}
                  </h3>
                </div>
                <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
                  {t("HelpCenter.supportDescription")}
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <a
                    href="/contact"
                    className="inline-flex items-center bg-background text-primary px-8 py-4  font-bold border-2 border-background hover:border-primary/50 transition-all duration-300"
                  >
                    <MessageCircle className="mr-2 w-5 h-5" />
                    {t("HelpCenter.contactSupport")}
                  </a>
                  <a
                    href="/help-center"
                    className="inline-flex items-center bg-secondary text-secondary-foreground px-8 py-4  font-bold border-2 border-secondary hover:border-primary/50 transition-all duration-300"
                  >
                    <BookOpen className="mr-2 w-5 h-5" />
                    {t("HelpCenter.browseAllFAQs")}
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

export default HelpCenter;
