import React from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  keywords,
  image = "/logo/logo.png",
  url,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const defaultTitle = t("seo.metaTitle");
  const defaultDescription = t("seo.metaDescription");
  const finalTitle = title || defaultTitle;
  const finalDescription = description || defaultDescription;
  const finalUrl = url || `${window.location.origin}${location.pathname}`;

  return (
    <Helmet>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="YourDrive" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@Your-Drive" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={image} />
      <meta name="robots" content="index, follow" />
      <meta name="author" content="YourDrive" />
      <link rel="canonical" href={finalUrl} />
      <html lang={t("language") === "French" ? "fr" : "en"} />
      <meta
        property="og:locale"
        content={t("language") === "French" ? "fr_CA" : "en_CA"}
      />
    </Helmet>
  );
};

export default SEOHead;
