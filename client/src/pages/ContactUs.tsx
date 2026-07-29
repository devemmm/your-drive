import { getToken } from "@/components/getToken";
import { PhoneInputComponent } from "@/components/inputs/PhoneInput";
import PageHeader from "@/components/sections/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiUrl } from "@/data";
import { useReactItems } from "@/lib/ReactTranslation";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { motion } from "framer-motion";
import { ArrowRight, Send } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    subject: "",
    message: "",
  });

  const { t, currentLanguage } = useReactItems();

  const sendMessage = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(
        `${apiUrl}/api/v1/public/contact-messages?lang=${currentLanguage}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(t("common_.msgSuccess"));
      setFormData({
        name: "",
        phoneNumber: "",
        email: "",
        subject: "",
        message: "",
      });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || "Something went wrong";
      toast.error(msg, {
        className: "custom-error-toast",
      });
    },
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage.mutate();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="bg-background min-h-screen">
      <PageHeader
        title={t("contact.title")}
        subtitle={t("contact.subtitle")}
        backgroundImage="https://images.unsplash.com/photo-1579667410546-f7079afa0601?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
      />

      <div className="container mx-auto py-24 px-4">
        <motion.div
          className="max-w-7xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Contact Methods - Enhanced Grid */}
          <motion.div variants={itemVariants} className="mb-32">
            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  title: t("contact.emailUs"),
                  content: (
                    <>
                      <p className="text-muted-foreground mb-6 text-lg">
                        {t("contact.generalInquiries")}
                      </p>
                      <a
                        href="mailto:info@Your-Drive.ca"
                        className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-bold text-xl mb-8 transition-colors group"
                      >
                        info@Your-Drive.ca
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </a>
                      <div className="pt-6 border-t border-border/50">
                        <p className="text-muted-foreground mb-4 text-lg">
                          {t("contact.support")}
                        </p>
                        <a
                          href="mailto:support@Your-Drive.ca"
                          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-bold text-xl transition-colors group"
                        >
                          support@Your-Drive.ca
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </a>
                      </div>
                    </>
                  ),
                },
                {
                  title: t("contact.callUs"),
                  content: (
                    <>
                      <p className="text-muted-foreground mb-6 text-lg">
                        {t("contact.customerService")}
                      </p>
                      <a
                        href="tel:+14388148307"
                        className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-bold text-xl mb-8 transition-colors group"
                      >
                        +1 (438) 814-8307
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </a>
                      <div className="pt-6 border-t border-border/50">
                        <p className="text-muted-foreground mb-4 text-lg">
                          {t("contact.technicalSupport")}
                        </p>
                        <a
                          href="tel:+14388148307"
                          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-bold text-xl transition-colors group"
                        >
                          +1 (438) 814-8307
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </a>
                      </div>
                    </>
                  ),
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  whileHover={{ y: -12, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="group cursor-pointer"
                >
                  <Card className="border-0 shadow-2xl bg-card h-full overflow-hidden relative">
                    {/* Background decoration */}

                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    <CardContent className="p-12 relative z-10">
                      <div className="flex flex-col items-start h-full">
                        <h3 className="text-2xl font-black mb-8 text-foreground group-hover:text-primary transition-colors duration-300">
                          {item.title}
                        </h3>
                        <div className="flex-1">{item.content}</div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-20">
            {/* Contact Form - Enhanced */}
            <motion.div variants={itemVariants}>
              <div className="mb-12">
                <div className="flex items-center gap-4 mb-8">
                  <h2 className="text-4xl md:text-5xl font-black text-foreground">
                    {t("contact.sendMessage")}
                  </h2>
                </div>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Get in touch with our team and we'll respond within 24 hours.
                </p>
              </div>

              <Card className="border-0 shadow-2xl bg-card/90 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-12">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid md:grid-cols-1 gap-8">
                      {[
                        {
                          id: "name",
                          label: t("contact.name"),
                          type: "text",
                        },
                        {
                          id: "email",
                          label: t("contact.email"),
                          type: "email",
                        },
                      ].map((field) => (
                        <div key={field.id} className="space-y-3">
                          <label
                            htmlFor={field.id}
                            className="block text-sm font-black text-foreground uppercase tracking-wide"
                          >
                            {field.label}
                          </label>
                          <input
                            id={field.id}
                            name={field.id}
                            type={field.type}
                            value={formData[field.id as keyof typeof formData]}
                            onChange={handleChange}
                            placeholder={t(`contact.placeholders.${field.id}`)}
                            required
                            className="w-full px-6 py-4 border-2 border-border rounded-2xl focus:outline-none focus:ring-0 focus:border-primary bg-background/50 text-foreground text-lg transition-all duration-300 hover:border-primary/50"
                          />
                        </div>
                      ))}

                      <div className="space-y-3">
                        <label className="block text-sm font-black text-foreground uppercase tracking-wide">
                          {t("contact.phone")}
                        </label>

                        <PhoneInputComponent
                          phoneNumber={formData.phoneNumber}
                          setPhoneNumber={(value) => {
                            setFormData((prev) => ({
                              ...prev,
                              phoneNumber: value,
                            }));
                          }}
                          editPhone={true}
                          className="w-full px-6 py-2 border-2 border-border rounded-2xl focus:outline-none focus:ring-0 focus:border-primary bg-background/50 text-foreground text-lg transition-all duration-300 hover:border-primary/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label
                        htmlFor="subject"
                        className="block text-sm font-black text-foreground uppercase tracking-wide"
                      >
                        {t("contact.subject")}
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className="w-full px-6 py-4 border-2 border-border rounded-2xl focus:outline-none focus:ring-0 focus:border-primary bg-background/50 text-foreground text-lg transition-all duration-300 hover:border-primary/50"
                      >
                        <option value="" disabled>
                          {t("contact.placeholders.subject")}
                        </option>
                        <option value="general">{t("contact.general")}</option>
                        <option value="support">
                          {t("contact.supportOption")}
                        </option>
                        <option value="billing">{t("contact.billing")}</option>
                        <option value="feedback">
                          {t("contact.feedback")}
                        </option>
                        <option value="partnership">
                          {t("contact.partnership")}
                        </option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label
                        htmlFor="message"
                        className="block text-sm font-black text-foreground uppercase tracking-wide"
                      >
                        {t("contact.message")}
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={6}
                        value={formData.message}
                        onChange={handleChange}
                        placeholder={t("contact.placeholders.message")}
                        required
                        className="w-full px-6 py-4 border-2 border-border rounded-2xl focus:outline-none focus:ring-0 focus:border-primary bg-background/50 text-foreground text-lg transition-all duration-300 hover:border-primary/50 resize-none"
                      ></textarea>
                    </div>

                    <div className="pt-4">
                      <Button
                        type="submit"
                        className="w-full bg-primary text-primary-foreground px-8 py-6 rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-primary/25 transition-all duration-300 hover:-translate-y-1 group"
                        disabled={sendMessage.isPending}
                      >
                        <span className="flex items-center justify-center gap-3">
                          {sendMessage.isPending
                            ? t("contact.sending")
                            : t("contact.send")}
                          {!sendMessage.isPending && (
                            <Send
                              size={20}
                              className="group-hover:translate-x-1 transition-transform"
                            />
                          )}
                        </span>
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* FAQ Section - Enhanced */}
            <motion.div variants={itemVariants}>
              <div className="mb-12">
                <div className="flex items-center gap-4 mb-8">
                  <h2 className="text-4xl md:text-5xl font-black text-foreground">
                    {t("contact.faq")}
                  </h2>
                </div>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Quick answers to common questions about our platform.
                </p>
              </div>

              <div className="space-y-6">
                {[
                  {
                    q: t("contact.whatIs"),
                    a: t("contact.whatIsAnswer"),
                  },
                  {
                    q: t("contact.howSignUp"),
                    a: t("contact.howSignUpAnswer"),
                  },
                  {
                    q: t("contact.infoSecure"),
                    a: t("contact.infoSecureAnswer"),
                  },
                ].map((faq, i) => (
                  <motion.div
                    key={i}
                    variants={itemVariants}
                    whileHover={{ x: 8 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Card className="border-0 shadow-xl bg-card group hover:shadow-2xl transition-all duration-300 overflow-hidden">
                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <CardContent className="p-8 relative z-10">
                        <div className="flex items-start gap-4">
                          <div>
                            <h3 className="font-bold text-xl text-foreground mb-4 group-hover:text-primary transition-colors duration-300">
                              {faq.q}
                            </h3>
                            <p className="text-muted-foreground leading-relaxed text-lg">
                              {faq.a}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <motion.div
                variants={itemVariants}
                className="mt-12 p-8 rounded-2xl border border-border bg-card/50"
              >
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-foreground mb-4">
                    {t("common_.small.help_")}
                  </h3>
                  <p className="text-muted-foreground mb-6 text-lg">
                    {t("common_.small.browser")}
                  </p>
                  <a
                    href="/help-center"
                    className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 hover:-translate-y-1 group"
                  >
                    {t("contact.viewAllFAQs")}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ContactUs;
