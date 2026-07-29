import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save } from "lucide-react";
import {
  useWalletSettings,
  useUpdateWalletSettings,
} from "@/hooks/useWalletSettings";

export const WalletSettingsTab: React.FC = () => {
  const { data, isLoading } = useWalletSettings();
  const update = useUpdateWalletSettings();
  const [limit, setLimit] = useState(0);
  const [enforce, setEnforce] = useState(false);

  useEffect(() => {
    if (data) {
      setLimit(data.defaultDebtLimitCents / 100);
      setEnforce(data.enforceDebtLimit);
    }
  }, [data]);

  if (isLoading || !data) return <Loader2 className="animate-spin" />;

  const save = () =>
    update.mutateAsync({
      defaultDebtLimitCents: Math.round(limit * 100),
      enforceDebtLimit: enforce,
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-w-md">
        <div>
          <label className="text-sm">
            Default debt limit (whole units)
          </label>
          <Input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          />
          <p className="text-xs text-gray-500 mt-1">
            Drivers can go this far below zero before the online toggle blocks
            them.
          </p>
        </div>
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={enforce}
            onChange={(e) => setEnforce(e.target.checked)}
          />
          Enforce debt limit (block going online when below limit)
        </label>
        <Button onClick={save} disabled={update.isPending}>
          <Save size={16} className="mr-1" /> Save
        </Button>
      </CardContent>
    </Card>
  );
};
