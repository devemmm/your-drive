import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function useReactItems() {
  const { i18n, t } = useTranslation();
  const queryClient = useQueryClient();
  return {
    currentLanguage: i18n.language,
    t,
    queryClient,
  };
}
