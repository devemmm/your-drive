import PageHeader from "@/components/sections/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, HelpCircle, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

const PolicyDetailPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { policyId } = useParams();

  // Map policy IDs to titles (you'll add full content later)
  const policyTitles = {
    "account-data-deletion": t("policy.details.accountDataDeletionTitle"),
    driveshare: t("policy.details.driveshareTitle"),
    "door-to-door": t("policy.details.doorToDoorTitle"),
    cancellation: t("policy.details.cancellationTitle"),
    "community-guidelines": t("policy.details.communityGuidelinesTitle"),
    "payments-refunds": t("policy.details.paymentsRefundsTitle"),
    privacy: t("policy.details.privacyTitle"),
    "safety-trust": t("policy.details.safetyTrustTitle"),
  };

  const policies = [
    {
      description: t("policy.accountDataDeletionDescription"),
    },
    {
      description: t("policy.driveshareDescription"),
    },
    {
      description: t("policy.doorToDoorDescription"),
    },
    {
      description: t("policy.cancellationDescription"),
    },
    {
      description: t("policy.communityGuidelinesDescription"),
    },
    {
      description: t("policy.paymentsRefundsDescription"),
    },
    {
      description: t("policy.privacyDescription"),
    },
    {
      description: t("policy.safetyTrustDescription"),
    },
  ];

  const policyContents = {
    "account-data-deletion": {
      header: {
        title: t("policy.accountDeletion.header.title"),
        effectiveDate: t("policy.accountDeletion.header.effectiveDate"),
        dateLabel: t("policy.accountDeletion.header.dateLabel"),
      },
      sections: [
        {
          number: 1,
          title: t("policy.accountDeletion.sections.1.title"),
          content: t("policy.accountDeletion.sections.1.content"),
        },
        {
          number: 2,
          title: t("policy.accountDeletion.sections.2.title"),
          content: t("policy.accountDeletion.sections.2.content"),
        },
        {
          number: 3,
          title: t("policy.accountDeletion.sections.3.title"),
          content: t("policy.accountDeletion.sections.3.content"),
        },
        {
          number: 4,
          title: t("policy.accountDeletion.sections.4.title"),
          content: t("policy.accountDeletion.sections.4.content"),
        },
        {
          number: 5,
          title: t("policy.accountDeletion.sections.5.title"),
          content: t("policy.accountDeletion.sections.5.content"),
        },
        {
          number: 6,
          title: t("policy.accountDeletion.sections.6.title"),
          content: t("policy.accountDeletion.sections.6.content"),
        },
        {
          number: 7,
          title: t("policy.accountDeletion.sections.7.title"),
          content: t("policy.accountDeletion.sections.7.content"),
        },
        {
          number: 8,
          title: t("policy.accountDeletion.sections.8.title"),
          content: t("policy.accountDeletion.sections.8.content"),
        },
        {
          number: 9,
          title: t("policy.accountDeletion.sections.9.title"),
          content: t("policy.accountDeletion.sections.9.content"),
        },
        {
          number: 10,
          title: t("policy.accountDeletion.sections.10.title"),
          content: t("policy.accountDeletion.sections.10.content"),
        },
        {
          number: 11,
          title: t("policy.accountDeletion.sections.11.title"),
          content: t("policy.accountDeletion.sections.11.content"),
        },
      ],
    },

    driveshare: {
      header: {
        title: t("policy.driveSharePolicy.header.title"),
        effectiveDate: t("policy.driveSharePolicy.header.effectiveDate"),
        dateLabel: t("policy.driveSharePolicy.header.dateLabel"),
      },
      sections: [
        {
          number: 1,
          title: t("policy.driveSharePolicy.sections.1.title"),
          content: t("policy.driveSharePolicy.sections.1.content"),
        },
        {
          number: 2,
          title: t("policy.driveSharePolicy.sections.2.title"),
          content: t("policy.driveSharePolicy.sections.2.content"),
        },
        {
          number: 3,
          title: t("policy.driveSharePolicy.sections.3.title"),
          content: t("policy.driveSharePolicy.sections.3.content"),
        },
        {
          number: 4,
          title: t("policy.driveSharePolicy.sections.4.title"),
          content: t("policy.driveSharePolicy.sections.4.content"),
        },
        {
          number: 5,
          title: t("policy.driveSharePolicy.sections.5.title"),
          content: t("policy.driveSharePolicy.sections.5.content"),
        },
        {
          number: 6,
          title: t("policy.driveSharePolicy.sections.6.title"),
          content: t("policy.driveSharePolicy.sections.6.content"),
        },
        {
          number: 7,
          title: t("policy.driveSharePolicy.sections.7.title"),
          content: t("policy.driveSharePolicy.sections.7.content"),
        },
        {
          number: 8,
          title: t("policy.driveSharePolicy.sections.8.title"),
          content: t("policy.driveSharePolicy.sections.8.content"),
        },
        {
          number: 9,
          title: t("policy.driveSharePolicy.sections.9.title"),
          content: t("policy.driveSharePolicy.sections.9.content"),
        },
        {
          number: 10,
          title: t("policy.driveSharePolicy.sections.10.title"),
          content: t("policy.driveSharePolicy.sections.10.content"),
        },
        {
          number: 11,
          title: t("policy.driveSharePolicy.sections.11.title"),
          content: t("policy.driveSharePolicy.sections.11.content"),
        },
        {
          number: 12,
          title: t("policy.driveSharePolicy.sections.12.title"),
          content: t("policy.driveSharePolicy.sections.12.content"),
        },
        {
          number: 13,
          title: t("policy.driveSharePolicy.sections.13.title"),
          content: t("policy.driveSharePolicy.sections.13.content"),
        },
      ],
    },

    "door-to-door": {
      header: {
        title: t("policy.doorToDoorPolicy.header.title"),
        effectiveDate: t("policy.doorToDoorPolicy.header.effectiveDate"),
        dateLabel: t("policy.doorToDoorPolicy.header.dateLabel"),
      },
      sections: [
        {
          number: 1,
          title: t("policy.doorToDoorPolicy.sections.1.title"),
          content: t("policy.doorToDoorPolicy.sections.1.content"),
        },
        {
          number: 2,
          title: t("policy.doorToDoorPolicy.sections.2.title"),
          content: t("policy.doorToDoorPolicy.sections.2.content"),
        },
        {
          number: 3,
          title: t("policy.doorToDoorPolicy.sections.3.title"),
          content: t("policy.doorToDoorPolicy.sections.3.content"),
        },
        {
          number: 4,
          title: t("policy.doorToDoorPolicy.sections.4.title"),
          content: t("policy.doorToDoorPolicy.sections.4.content"),
        },
        {
          number: 5,
          title: t("policy.doorToDoorPolicy.sections.5.title"),
          content: t("policy.doorToDoorPolicy.sections.5.content"),
        },
        {
          number: 6,
          title: t("policy.doorToDoorPolicy.sections.6.title"),
          content: t("policy.doorToDoorPolicy.sections.6.content"),
        },
        {
          number: 7,
          title: t("policy.doorToDoorPolicy.sections.7.title"),
          content: t("policy.doorToDoorPolicy.sections.7.content"),
        },
        {
          number: 8,
          title: t("policy.doorToDoorPolicy.sections.8.title"),
          content: t("policy.doorToDoorPolicy.sections.8.content"),
        },
        {
          number: 9,
          title: t("policy.doorToDoorPolicy.sections.9.title"),
          content: t("policy.doorToDoorPolicy.sections.9.content"),
        },
        {
          number: 10,
          title: t("policy.doorToDoorPolicy.sections.10.title"),
          content: t("policy.doorToDoorPolicy.sections.10.content"),
        },
        {
          number: 11,
          title: t("policy.doorToDoorPolicy.sections.11.title"),
          content: t("policy.doorToDoorPolicy.sections.11.content"),
        },
        {
          number: 12,
          title: t("policy.doorToDoorPolicy.sections.12.title"),
          content: t("policy.doorToDoorPolicy.sections.12.content"),
        },
        {
          number: 13,
          title: t("policy.doorToDoorPolicy.sections.13.title"),
          content: t("policy.doorToDoorPolicy.sections.13.content"),
        },
      ],
    },

    cancellation: {
      header: {
        title: t("policy.cancellationPolicy.header.title"),
        effectiveDate: t("policy.cancellationPolicy.header.effectiveDate"),
        dateLabel: t("policy.cancellationPolicy.header.dateLabel"),
      },
      sections: [
        {
          number: 1,
          title: t("policy.cancellationPolicy.sections.1.title"),
          content: t("policy.cancellationPolicy.sections.1.content"),
        },
        {
          number: 2,
          title: t("policy.cancellationPolicy.sections.2.title"),
          content: t("policy.cancellationPolicy.sections.2.content"),
        },
        {
          number: 3,
          title: t("policy.cancellationPolicy.sections.3.title"),
          content: t("policy.cancellationPolicy.sections.3.content"),
        },
        {
          number: 4,
          title: t("policy.cancellationPolicy.sections.4.title"),
          content: t("policy.cancellationPolicy.sections.4.content"),
        },
        {
          number: 5,
          title: t("policy.cancellationPolicy.sections.5.title"),
          content: t("policy.cancellationPolicy.sections.5.content"),
        },
        {
          number: 6,
          title: t("policy.cancellationPolicy.sections.6.title"),
          content: t("policy.cancellationPolicy.sections.6.content"),
        },
        {
          number: 7,
          title: t("policy.cancellationPolicy.sections.7.title"),
          content: t("policy.cancellationPolicy.sections.7.content"),
        },
        {
          number: 8,
          title: t("policy.cancellationPolicy.sections.8.title"),
          content: t("policy.cancellationPolicy.sections.8.content"),
        },
        {
          number: 9,
          title: t("policy.cancellationPolicy.sections.9.title"),
          content: t("policy.cancellationPolicy.sections.9.content"),
        },
        {
          number: 10,
          title: t("policy.cancellationPolicy.sections.10.title"),
          content: t("policy.cancellationPolicy.sections.10.content"),
        },
        {
          number: 11,
          title: t("policy.cancellationPolicy.sections.11.title"),
          content: t("policy.cancellationPolicy.sections.11.content"),
        },
      ],
    },

    "community-guidelines": {
      header: {
        title: t("policy.communityGuidelines.header.title"),
        effectiveDate: t("policy.communityGuidelines.header.effectiveDate"),
        dateLabel: t("policy.communityGuidelines.header.dateLabel"),
      },
      sections: [
        {
          number: 1,
          title: t("policy.communityGuidelines.sections.1.title"),
          content: t("policy.communityGuidelines.sections.1.content"),
        },
        {
          number: 2,
          title: t("policy.communityGuidelines.sections.2.title"),
          content: t("policy.communityGuidelines.sections.2.content"),
        },
        {
          number: 3,
          title: t("policy.communityGuidelines.sections.3.title"),
          content: t("policy.communityGuidelines.sections.3.content"),
        },
        {
          number: 4,
          title: t("policy.communityGuidelines.sections.4.title"),
          content: t("policy.communityGuidelines.sections.4.content"),
        },
        {
          number: 5,
          title: t("policy.communityGuidelines.sections.5.title"),
          content: t("policy.communityGuidelines.sections.5.content"),
        },
        {
          number: 6,
          title: t("policy.communityGuidelines.sections.6.title"),
          content: t("policy.communityGuidelines.sections.6.content"),
        },
        {
          number: 7,
          title: t("policy.communityGuidelines.sections.7.title"),
          content: t("policy.communityGuidelines.sections.7.content"),
        },
        {
          number: 8,
          title: t("policy.communityGuidelines.sections.8.title"),
          content: t("policy.communityGuidelines.sections.8.content"),
        },
        {
          number: 9,
          title: t("policy.communityGuidelines.sections.9.title"),
          content: t("policy.communityGuidelines.sections.9.content"),
        },
        {
          number: 10,
          title: t("policy.communityGuidelines.sections.10.title"),
          content: t("policy.communityGuidelines.sections.10.content"),
        },
        {
          number: 11,
          title: t("policy.communityGuidelines.sections.11.title"),
          content: t("policy.communityGuidelines.sections.11.content"),
        },
        {
          number: 12,
          title: t("policy.communityGuidelines.sections.12.title"),
          content: t("policy.communityGuidelines.sections.12.content"),
        },
      ],
    },

    "payments-refunds": {
      header: {
        title: t("policy.paymentsRefundsPolicy.header.title"),
        effectiveDate: t("policy.paymentsRefundsPolicy.header.effectiveDate"),
        dateLabel: t("policy.paymentsRefundsPolicy.header.dateLabel"),
      },
      sections: [
        {
          number: 1,
          title: t("policy.paymentsRefundsPolicy.sections.1.title"),
          content: t("policy.paymentsRefundsPolicy.sections.1.content"),
        },
        {
          number: 2,
          title: t("policy.paymentsRefundsPolicy.sections.2.title"),
          content: t("policy.paymentsRefundsPolicy.sections.2.content"),
          importantNote: t(
            "policy.paymentsRefundsPolicy.sections.2.importantNote"
          ),
        },
        {
          number: 3,
          title: t("policy.paymentsRefundsPolicy.sections.3.title"),
          content: t("policy.paymentsRefundsPolicy.sections.3.content"),
          securityNote: t(
            "policy.paymentsRefundsPolicy.sections.3.securityNote"
          ),
        },
        {
          number: 4,
          title: t("policy.paymentsRefundsPolicy.sections.4.title"),
          content: t("policy.paymentsRefundsPolicy.sections.4.content"),
          note: t("policy.paymentsRefundsPolicy.sections.4.note"),
        },
        {
          number: 5,
          title: t("policy.paymentsRefundsPolicy.sections.5.title"),
          bullets: t("policy.paymentsRefundsPolicy.sections.5.bullets", {
            returnObjects: true,
          }),
        },
        {
          number: 6,
          title: t("policy.paymentsRefundsPolicy.sections.6.title"),
          content: t("policy.paymentsRefundsPolicy.sections.6.content"),
          consequence: t("policy.paymentsRefundsPolicy.sections.6.consequence"),
        },
        {
          number: 7,
          title: t("policy.paymentsRefundsPolicy.sections.7.title"),
          content: t("policy.paymentsRefundsPolicy.sections.7.content"),
          note: t("policy.paymentsRefundsPolicy.sections.7.note"),
        },
        {
          number: 8,
          title: t("policy.paymentsRefundsPolicy.sections.8.title"),
          content: t("policy.paymentsRefundsPolicy.sections.8.content"),
          responsibility: t(
            "policy.paymentsRefundsPolicy.sections.8.responsibility"
          ),
        },
        {
          number: 9,
          title: t("policy.paymentsRefundsPolicy.sections.9.title"),
          content: t("policy.paymentsRefundsPolicy.sections.9.content"),
          note: t("policy.paymentsRefundsPolicy.sections.9.note"),
        },
        {
          number: 10,
          title: t("policy.paymentsRefundsPolicy.sections.10.title"),
          content: t("policy.paymentsRefundsPolicy.sections.10.content"),
          compliance: t("policy.paymentsRefundsPolicy.sections.10.compliance"),
        },
        {
          number: 11,
          title: t("policy.paymentsRefundsPolicy.sections.11.title"),
          content: t("policy.paymentsRefundsPolicy.sections.11.content"),
          communication: t(
            "policy.paymentsRefundsPolicy.sections.11.communication"
          ),
        },
        {
          number: 12,
          title: t("policy.paymentsRefundsPolicy.sections.12.title"),
          content: t("policy.paymentsRefundsPolicy.sections.12.content"),
        },
      ],
    },

    privacy: {
      header: {
        title: t("policy.privacyPolicy.header.title"),
        lastUpdated: t("policy.privacyPolicy.header.lastUpdated"),
        updatedLabel: t("policy.privacyPolicy.header.updatedLabel"),
      },
      sections: [
        {
          number: 1,
          title: t("policy.privacyPolicy.sections.1.title"),
          content: t("policy.privacyPolicy.sections.1.content"),
        },
        {
          number: 2,
          title: t("policy.privacyPolicy.sections.2.title"),
          content: t("policy.privacyPolicy.sections.2.content"),
          subsections: [
            {
              title: t("policy.privacyPolicy.sections.2.subsections.0.title"),
              content: t(
                "policy.privacyPolicy.sections.2.subsections.0.content"
              ),
            },
            {
              title: t("policy.privacyPolicy.sections.2.subsections.1.title"),
              content: t(
                "policy.privacyPolicy.sections.2.subsections.1.content"
              ),
            },
            {
              title: t("policy.privacyPolicy.sections.2.subsections.2.title"),
              content: t(
                "policy.privacyPolicy.sections.2.subsections.2.content"
              ),
            },
            {
              title: t("policy.privacyPolicy.sections.2.subsections.3.title"),
              content: t(
                "policy.privacyPolicy.sections.2.subsections.3.content"
              ),
            },
            {
              title: t("policy.privacyPolicy.sections.2.subsections.4.title"),
              content: t(
                "policy.privacyPolicy.sections.2.subsections.4.content"
              ),
            },
            {
              title: t("policy.privacyPolicy.sections.2.subsections.5.title"),
              content: t(
                "policy.privacyPolicy.sections.2.subsections.5.content"
              ),
            },
          ],
        },
        {
          number: 3,
          title: t("policy.privacyPolicy.sections.3.title"),
          subsections: [
            {
              title: t("policy.privacyPolicy.sections.3.subsections.0.title"),
              content: t(
                "policy.privacyPolicy.sections.3.subsections.0.content"
              ),
            },
            {
              title: t("policy.privacyPolicy.sections.3.subsections.1.title"),
              content: t(
                "policy.privacyPolicy.sections.3.subsections.1.content"
              ),
            },
            {
              title: t("policy.privacyPolicy.sections.3.subsections.2.title"),
              content: t(
                "policy.privacyPolicy.sections.3.subsections.2.content"
              ),
            },
            {
              title: t("policy.privacyPolicy.sections.3.subsections.3.title"),
              content: t(
                "policy.privacyPolicy.sections.3.subsections.3.content"
              ),
            },
            {
              title: t("policy.privacyPolicy.sections.3.subsections.4.title"),
              content: t(
                "policy.privacyPolicy.sections.3.subsections.4.content"
              ),
            },
          ],
        },
        {
          number: 4,
          title: t("policy.privacyPolicy.sections.4.title"),
          subsections: [
            {
              title: t("policy.privacyPolicy.sections.4.subsections.0.title"),
              content: t(
                "policy.privacyPolicy.sections.4.subsections.0.content"
              ),
            },
            {
              title: t("policy.privacyPolicy.sections.4.subsections.1.title"),
              content: t(
                "policy.privacyPolicy.sections.4.subsections.1.content"
              ),
            },
            {
              title: t("policy.privacyPolicy.sections.4.subsections.2.title"),
              content: t(
                "policy.privacyPolicy.sections.4.subsections.2.content"
              ),
            },
          ],
        },
        {
          number: 5,
          title: t("policy.privacyPolicy.sections.5.title"),
          content: t("policy.privacyPolicy.sections.5.content"),
        },
        {
          number: 6,
          title: t("policy.privacyPolicy.sections.6.title"),
          content: t("policy.privacyPolicy.sections.6.content"),
        },
        {
          number: 7,
          title: t("policy.privacyPolicy.sections.7.title"),
          content: t("policy.privacyPolicy.sections.7.content"),
        },
        {
          number: 8,
          title: t("policy.privacyPolicy.sections.8.title"),
          content: t("policy.privacyPolicy.sections.8.content"),
        },
      ],
    },

    "safety-trust": {
      header: {
        title: t("policy.safetyTrustPolicy.header.title"),
        effectiveDate: t("policy.safetyTrustPolicy.header.effectiveDate"),
        dateLabel: t("policy.safetyTrustPolicy.header.dateLabel"),
      },
      sections: [
        {
          number: 1,
          title: t("policy.safetyTrustPolicy.sections.1.title"),
          content: t("policy.safetyTrustPolicy.sections.1.content"),
        },
        {
          number: 2,
          title: t("policy.safetyTrustPolicy.sections.2.title"),
          content: t("policy.safetyTrustPolicy.sections.2.content"),
        },
        {
          number: 3,
          title: t("policy.safetyTrustPolicy.sections.3.title"),
          content: t("policy.safetyTrustPolicy.sections.3.content"),
        },
        {
          number: 4,
          title: t("policy.safetyTrustPolicy.sections.4.title"),
          content: t("policy.safetyTrustPolicy.sections.4.content"),
        },
        {
          number: 5,
          title: t("policy.safetyTrustPolicy.sections.5.title"),
          content: t("policy.safetyTrustPolicy.sections.5.content"),
        },
        {
          number: 6,
          title: t("policy.safetyTrustPolicy.sections.6.title"),
          content: t("policy.safetyTrustPolicy.sections.6.content"),
        },
        {
          number: 7,
          title: t("policy.safetyTrustPolicy.sections.7.title"),
          content: t("policy.safetyTrustPolicy.sections.7.content"),
        },
        {
          number: 8,
          title: t("policy.safetyTrustPolicy.sections.8.title"),
          content: t("policy.safetyTrustPolicy.sections.8.content"),
        },
        {
          number: 9,
          title: t("policy.safetyTrustPolicy.sections.9.title"),
          content: t("policy.safetyTrustPolicy.sections.9.content"),
        },
        {
          number: 10,
          title: t("policy.safetyTrustPolicy.sections.10.title"),
          content: t("policy.safetyTrustPolicy.sections.10.content"),
        },
        {
          number: 11,
          title: t("policy.safetyTrustPolicy.sections.11.title"),
          content: t("policy.safetyTrustPolicy.sections.11.content"),
        },
        {
          number: 12,
          title: t("policy.safetyTrustPolicy.sections.12.title"),
          content: t("policy.safetyTrustPolicy.sections.12.content"),
        },
        {
          number: 13,
          title: t("policy.safetyTrustPolicy.sections.13.title"),
          content: t("policy.safetyTrustPolicy.sections.13.content"),
        },
      ],
    },
  };

  const currentPolicyContent = policyContents[policyId];

  const currentPolicyTitle = policyTitles[policyId] || t("Policy.notFound");
  const currentPolicyDescription =
    policies.find((_, index) => Object.keys(policyTitles)[index] === policyId)
      ?.description || t("Policy.notFound");

  return (
    <div className="bg-background min-h-screen">
      <PageHeader
        title={currentPolicyTitle}
        subtitle={currentPolicyDescription}
        backgroundImage="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=2070&q=80"
      />

      <div className="container mx-auto py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/policies")}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("policy.details.backToAllPolicies")}
          </Button>

          <div className="bg-card rounded-lg p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-4">{`YourDrive – ${currentPolicyTitle}`}</h1>
              <div className="h-1 w-20 bg-primary rounded-full"></div>
            </div>

            <div className="whitespace-pre-line">
              {currentPolicyContent ? (
                <>
                  <div className="mb-6 text-sm text-muted-foreground">
                    <span>
                      {currentPolicyContent.header.dateLabel ||
                        currentPolicyContent.header.updatedLabel}
                      :{" "}
                    </span>
                    <span>
                      {currentPolicyContent.header.effectiveDate ||
                        currentPolicyContent.header.lastUpdated}
                    </span>
                  </div>

                  {currentPolicyContent.sections.map((section) => (
                    <div key={section.number} className="mb-6">
                      <h2 className="font-semibold text-lg mb-3">
                        {section.number}. {section.title}
                      </h2>

                      {section.content && (
                        <p className="text-muted-foreground">
                          {section.content}
                        </p>
                      )}

                      {section?.bullets && Array.isArray(section.bullets) && (
                        <ul className="pl-6 space-y-2 text-muted-foreground marker:text-blue-400 list-disc">
                          {section.bullets.map((bullet, index) => (
                            <li key={index} className="leading-relaxed">
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}

                      {section.subsections && (
                        <div className="ml-4 mt-4">
                          {section.subsections.map((subsection, index) => (
                            <div key={index} className="mb-4">
                              <h3 className="font-semibold text-lg mb-2">
                                {subsection.title}
                              </h3>
                              <p className="text-muted-foreground">
                                {subsection.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {section.importantNote && (
                        <p className="mt-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
                          <strong>{t("policy.details.importantNote")}:</strong>{" "}
                          {section.importantNote}
                        </p>
                      )}

                      {section.securityNote && (
                        <p className="mt-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
                          <strong>{t("policy.details.securityNote")}:</strong>{" "}
                          {section.securityNote}
                        </p>
                      )}

                      {section.note && (
                        <p className="mt-4 p-4 bg-blue-100 border-l-4 border-blue-500 text-blue-700">
                          <strong>{t("policy.details.note")}:</strong>{" "}
                          {section.note}
                        </p>
                      )}

                      {section.consequence && (
                        <p className="mt-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
                          <strong>{t("policy.details.consequence")}:</strong>{" "}
                          {section.consequence}
                        </p>
                      )}

                      {section.responsibility && (
                        <p className="mt-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
                          <strong>{t("policy.details.responsibility")}:</strong>{" "}
                          {section.responsibility}
                        </p>
                      )}

                      {section.compliance && (
                        <p className="mt-4 p-4 bg-green-100 border-l-4 border-green-500 text-green-700">
                          <strong>{t("policy.details.compliance")}:</strong>{" "}
                          {section.compliance}
                        </p>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {t("policy.details.contentComingSoon")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t("policy.details.checkBackLater")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
  );
};

export default PolicyDetailPage;
