import React from "react";
import { useCouponRedemptionRules } from "@/hooks/useCouponRedemptionRules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { Minus, Plus, Save } from "lucide-react";
import CustomLoader from "@/components/CustomLoader";

export const CouponRedemptionRulesTab: React.FC = () => {
  const { t } = useTranslation();
  const { rules, isLoading, error, updateRule } = useCouponRedemptionRules();

  const targetLabels: Record<string, string> = {
    RIDE_BOOKING: t("setting.Ride"),
    RIDE_POSTING: t("setting.Posting"),
    DRIVER_SUBSCRIPTION: t("setting.Driver"),
    PASSENGER_SUBSCRIPTION: t("setting.Passenger"),
    BOTH_SUBSCRIPTION: t("setting.Both"),
  };

  const [editable, setEditable] = React.useState<
    Record<
      number,
      {
        requiredCoupons: number;
        description: string;
      }
    >
  >({});

  // We keep increment/decrement purely local; actual update happens on Save
  const [loadingDesc, setLoadingDesc] = React.useState<Record<number, boolean>>(
    {}
  );

  React.useEffect(() => {
    if (rules?.length) {
      const initial: Record<
        number,
        { requiredCoupons: number; description: string }
      > = {};
      rules.forEach((r) => {
        initial[r.id] = {
          requiredCoupons: r.requiredCoupons,
          description: r.description,
        };
      });
      setEditable((prev) => ({ ...initial, ...prev }));
    }
  }, [rules]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-6">
          <CustomLoader />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6 text-red-600">
        {t("common.error", "Something went wrong")}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {rules.map((rule) => {
        const edit = editable[rule.id] || {
          requiredCoupons: rule.requiredCoupons,
          description: rule.description,
        };
        return (
          <Card key={rule.id} className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {targetLabels[rule.target] || rule.target}
              </div>
              <div className="text-xs text-muted-foreground">#{rule.id}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  {t("couponRules.requiredCoupons", "Required Coupons")}
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="decrement"
                    disabled={edit.requiredCoupons <= 0}
                    onClick={() => {
                      const next = Math.max(0, edit.requiredCoupons - 1);
                      setEditable((prev) => ({
                        ...prev,
                        [rule.id]: { ...prev[rule.id], requiredCoupons: next },
                      }));
                      // No API call here – update only on Save
                    }}
                  >
                    <Minus size={16} />
                  </Button>
                  <div className="min-w-10 text-center font-medium">
                    {edit.requiredCoupons}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="increment"
                    disabled={false}
                    onClick={() => {
                      const next = edit.requiredCoupons + 1;
                      setEditable((prev) => ({
                        ...prev,
                        [rule.id]: { ...prev[rule.id], requiredCoupons: next },
                      }));
                      // No API call here – update only on Save
                    }}
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-medium">
                  {t("couponRules.description", "Description")}
                </label>
                <Input
                  value={edit.description}
                  onChange={(e) =>
                    setEditable((prev) => ({
                      ...prev,
                      [rule.id]: {
                        ...prev[rule.id],
                        description: e.target.value,
                      },
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                disabled={!!loadingDesc[rule.id]}
                onClick={() => {
                  setLoadingDesc((prev) => ({ ...prev, [rule.id]: true }));
                  updateRule(
                    {
                      id: rule.id,
                      payload: {
                        requiredCoupons: edit.requiredCoupons,
                        description: edit.description,
                      },
                    },
                    {
                      onSettled: () =>
                        setLoadingDesc((prev) => ({
                          ...prev,
                          [rule.id]: false,
                        })),
                    }
                  );
                }}
              >
                {loadingDesc[rule.id] ? (
                  t("common.saving", "Saving...")
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Save size={16} /> {t("common.save", "Save")}
                  </span>
                )}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default CouponRedemptionRulesTab;
