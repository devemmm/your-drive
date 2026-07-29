import React, { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/providers/Context/UseAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSingleUser } from "@/data";

export const InviteFriends = () => {
  const { t } = useTranslation();
  const { user, authenticated } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: userData } = useSingleUser({
    userId: user?.id,
    enabled: !!user?.id,
  });

  const referralCode = userData?.referralCode;

  const referralLink = `${window.location.origin}/register?referralCode=${referralCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link", {
        className: "custom-error-toast",
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join YourDrive with my referral link!",
          text: "I'm using YourDrive for ridesharing. Join me and get benefits!",
          url: referralLink,
        });
      } catch (err) {
        // User cancelled sharing
      }
    } else {
      handleCopyLink();
    }
  };

  if (!authenticated) return null;

  return (
    <section className="py-24 bg-gradient-to-b from-white to-green-50">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-7xl font-black text-black mb-6 leading-none">
            Invite Friends & Earn Rewards
          </h2>
          <div className="w-24 h-1 bg-green-600 mx-auto mb-8"></div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Share YourDrive with friends and unlock exclusive benefits for both of you
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start max-w-6xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <div className="bg-white border-2 border-gray-200 p-8 h-full hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-bold text-black mb-6">
                Your Referral Link
              </h3>
              <div className="space-y-6">
                <div className="flex items-center gap-3 p-4 bg-gray-50 border-2 border-gray-200">
                  <Input
                    value={referralLink}
                    readOnly
                    className="flex-1 bg-white border-0 text-sm font-mono text-black"
                  />
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 border-2 border-green-600 bg-white text-green-600 hover:bg-green-50 whitespace-nowrap"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleShare}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 border-2 border-green-600 font-bold"
                  >
                    Share Link
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="bg-gradient-to-br from-green-600 to-green-700 text-white p-8 h-full shadow-xl">
                <h3 className="text-2xl font-bold mb-6">
                Rewards & Benefits
                </h3>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-col items-start gap-3">
                      <h4 className="font-bold text-lg">
                      Free Rides
                      </h4>
                      <div>
                        <p className="text-sm text-white/90">
                        Get $10 credit when your friend signs up
                        </p>
                        <p className="text-sm text-white/90 mt-2">
                        Your friend gets $5 credit too
                        </p>
                      </div>
                    </div>

                  <div className="h-px w-full bg-white/20"></div>

                    <div className="flex flex-col items-start gap-3">
                      <h4 className="font-bold text-lg">
                      Friend Benefits
                      </h4>
                      <div>
                        <p className="text-sm text-white/90">
                        Your friends get exclusive welcome bonuses
                        </p>
                        <p className="text-sm text-white/90 mt-2">
                        Everyone wins with YourDrive
                        </p>
                      </div>
                    </div>

                  <div className="h-px w-full bg-white/20"></div>

                    <div>
                      <p className="text-sm text-white/90 mb-2">
                      Unlock special rewards as you refer more friends
                      </p>
                    <p className="text-sm text-white/80 border-2 border-dashed border-white/30 p-4">
                      Refer 5 friends and get a premium membership upgrade
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t-2 border-white/20">
                    <div className="text-center">
                      <div className="text-4xl font-black mb-2">∞</div>
                      <div className="text-sm text-white/90">
                      Unlimited Referrals
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl font-black text-black mb-4">
              How It Works
            </h3>
            <div className="w-24 h-1 bg-green-600 mx-auto"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center bg-white border-2 border-gray-200 p-8 hover:border-green-500 hover:shadow-lg transition-all">
              <div className="text-5xl font-black text-green-600 mb-4">01</div>
              <h4 className="font-bold text-black mb-2">
                Share Your Link
              </h4>
              <p className="text-gray-600">
                Copy your unique referral link and share it with friends
              </p>
            </div>

            <div className="text-center bg-white border-2 border-gray-200 p-8 hover:border-green-500 hover:shadow-lg transition-all">
              <div className="text-5xl font-black text-green-600 mb-4">02</div>
              <h4 className="font-bold text-black mb-2">
                Friends Sign Up
              </h4>
              <p className="text-gray-600">
                When your friends join using your link, you both get rewards
              </p>
            </div>

            <div className="text-center bg-white border-2 border-gray-200 p-8 hover:border-green-500 hover:shadow-lg transition-all">
              <div className="text-5xl font-black text-green-600 mb-4">03</div>
              <h4 className="font-bold text-black mb-2">
                Earn Rewards
              </h4>
              <p className="text-gray-600">
                Get credits and unlock special benefits as you refer more friends
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
