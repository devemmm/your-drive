import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { useUserCoupons, useApplyCoupon } from "@/data";
import { toast } from "sonner";
import { Gift, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface CouponSelectorProps {
  rideId: number;
  onCouponApplied?: (discountAmount: number) => void;
  onCouponRemoved?: () => void;
}

const CouponSelector: React.FC<CouponSelectorProps> = ({
  rideId,
  onCouponApplied,
  onCouponRemoved,
}) => {
  const { t } = useTranslation();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [isApplying, setIsApplying] = useState(false);

  const { data: couponsData, isLoading: couponsLoading } = useUserCoupons();
  const { mutate: applyCoupon, isPending: isApplyingCoupon } = useApplyCoupon();

  const userCoupons = couponsData?.data || [];

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      toast.error(
        t("booking.coupon.enterCode", "Please enter a coupon code", {
          className: "custom-error-toast",
        })
      );
      return;
    }

    setIsApplying(true);
    applyCoupon(
      { rideId, couponCode: couponCode.trim() },
      {
        onSuccess: (data) => {
          setAppliedCoupon(data.data);
          setCouponCode("");
          toast.success(
            t("booking.coupon.applied", "Coupon applied successfully!")
          );
          onCouponApplied?.(data.data.discountAmount || 0);
        },
        onError: (error: any) => {
          toast.error(
            error.response?.data?.message ||
              t("booking.coupon.error", "Failed to apply coupon"),
            {
              className: "custom-error-toast",
            }
          );
        },
        onSettled: () => {
          setIsApplying(false);
        },
      }
    );
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    onCouponRemoved?.();
    toast.success(t("booking.coupon.removed", "Coupon removed"));
  };

  const handleSelectUserCoupon = (coupon: any) => {
    setCouponCode(coupon.code);
    handleApplyCoupon();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          {t("booking.coupon.title", "Apply Coupon")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Applied Coupon Display */}
        {appliedCoupon && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    {appliedCoupon.code}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {t("booking.coupon.discount", "Discount")}: $
                    {appliedCoupon.discountAmount}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveCoupon}
                className="text-red-600 hover:text-red-700"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Manual Coupon Input */}
        {!appliedCoupon && (
          <div className="space-y-2">
            <Label htmlFor="coupon-code">
              {t("booking.coupon.enterCode", "Enter Coupon Code")}
            </Label>
            <div className="flex gap-2">
              <Input
                id="coupon-code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder={t(
                  "booking.coupon.placeholder",
                  "Enter coupon code"
                )}
                disabled={isApplying}
              />
              <Button
                onClick={handleApplyCoupon}
                disabled={!couponCode.trim() || isApplying}
                className="min-w-[100px]"
              >
                {isApplying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("booking.coupon.apply", "Apply")
                )}
              </Button>
            </div>
          </div>
        )}

        {/* User's Available Coupons */}
        {!appliedCoupon && userCoupons.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t("booking.coupon.yourCoupons", "Your Available Coupons")}
            </Label>
            <div className="grid gap-2">
              {userCoupons.map((coupon: any) => (
                <div
                  key={coupon.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => handleSelectUserCoupon(coupon)}
                >
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="font-medium">{coupon.code}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t("booking.coupon.value", "Value")}: ${coupon.value}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {t("booking.coupon.available", "Available")}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {couponsLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="ml-2">
              {t("booking.coupon.loading", "Loading coupons...")}
            </span>
          </div>
        )}

        {/* No Coupons Message */}
        {!couponsLoading && userCoupons.length === 0 && !appliedCoupon && (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t("booking.coupon.noCoupons", "No coupons available")}</p>
            <p className="text-sm">
              {t("booking.coupon.earnInfo", "Complete rides to earn coupons")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CouponSelector;
