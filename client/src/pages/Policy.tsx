import PageHeader from "@/components/sections/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom"; // or your routing method

const PolicyHubPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate(); // or your navigation method

  const policies = [
    {
      id: "account-data-deletion",
      title: t("policy.accountDataDeletionTitle"),
      description: t("policy.accountDataDeletionDescription"),
      color: "border-primary-500 bg-primary-500/5",
      route: "/policies/account-data-deletion",
    },
    {
      id: "driveshare",
      title: t("policy.driveshareTitle"),
      description: t("policy.driveshareDescription"),
      color: "border-primary-500 bg-primary-500/5",
      route: "/policies/driveshare",
    },
    {
      id: "door-to-door",
      title: t("policy.doorToDoorTitle"),
      description: t("policy.doorToDoorDescription"),
      color: "border-primary-500 bg-primary-500/5",
      route: "/policies/door-to-door",
    },
    {
      id: "cancellation",
      title: t("policy.cancellationTitle"),
      description: t("policy.cancellationDescription"),
      color: "border-primary-500 bg-primary-500/5",
      route: "/policies/cancellation",
    },
    {
      id: "community-guidelines",
      title: t("policy.communityGuidelinesTitle"),
      description: t("policy.communityGuidelinesDescription"),
      color: "border-primary-500 bg-primary-500/5",
      route: "/policies/community-guidelines",
    },
    {
      id: "payments-refunds",
      title: t("policy.paymentsRefundsTitle"),
      description: t("policy.paymentsRefundsDescription"),
      color: "border-primary-500 bg-primary-500/5",
      route: "/policies/payments-refunds",
    },
    {
      id: "privacy",
      title: t("policy.privacyTitle"),
      description: t("policy.privacyDescription"),
      color: "border-primary-500 bg-primary-500/5",
      route: "/policies/privacy",
    },
    {
      id: "safety-trust",
      title: t("policy.safetyTrustTitle"),
      description: t("policy.safetyTrustDescription"),
      color: "border-primary-500 bg-primary-500/5",
      route: "/policies/safety-trust",
    },
  ];

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

  const handlePolicyClick = (route) => {
    navigate(route);
  };

  return (
    <div className="bg-background min-h-screen">
      <PageHeader
        title={t("policy.policyHubTitle")}
        subtitle={t("policy.policyHubSubtitle")}
        backgroundImage="https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=2070&q=80"
        overlay={true} // Enabled
        overlayOpacity={0.5} // 50% opacity
        overlayColor="black" // Black overlay
      />

      <div className="container mx-auto py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              {t("policy.allPoliciesTitle")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("policy.allPoliciesDescription")}
            </p>
          </div>

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {policies.map((policy, index) => (
              <motion.div key={policy.id} variants={item} className="flex">
                <Card
                  className={`transition-all duration-300 border-l-8 ${policy.color} backdrop-blur-sm group hover:-translate-y-1 hover:shadow-lg cursor-pointer flex flex-col h-full w-full`}
                  onClick={() => handlePolicyClick(policy.route)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col">
                      <div className="flex items-start space-x-4 mb-4">
                        {/* <div className="text-3xl">{policy.icon}</div> */}
                        <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors flex-1">
                          {policy.title}
                        </h3>
                      </div>

                      <p className="text-muted-foreground mb-6 flex-1">
                        {policy.description}
                      </p>

                      <div className="flex justify-between items-center mt-auto pt-4 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="group/btn px-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePolicyClick(policy.route);
                          }}
                        >
                          {t("policy.viewPolicyButton")}
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {index + 1} of {policies.length}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              {t("policy.lastUpdated")} •{" "}
              <a href="/contact" className="text-blue-700 hover:underline">
                {t("policy.contactSupport")}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PolicyHubPage;
