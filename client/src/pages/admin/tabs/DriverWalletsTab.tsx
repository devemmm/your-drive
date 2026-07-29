import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import {
  useDriverWallets,
  useCreditWallet,
  type WalletRow,
} from "@/hooks/useDriverWallets";

export const DriverWalletsTab: React.FC = () => {
  const [negativeOnly, setNegativeOnly] = useState(false);
  const { data, isLoading } = useDriverWallets({ negative: negativeOnly });
  const credit = useCreditWallet();
  const [open, setOpen] = useState<WalletRow | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  if (isLoading) return <Loader2 className="animate-spin" />;

  const submit = async () => {
    if (!open) return;
    const cents = Math.round(Number(amount) * 100);
    if (!cents || !reason) return;
    await credit.mutateAsync({ userId: open.id, amountCents: cents, reason });
    setOpen(null);
    setAmount("");
    setReason("");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Driver wallets ({(data ?? []).length})</CardTitle>
          <label className="text-sm flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={negativeOnly}
              onChange={(e) => setNegativeOnly(e.target.checked)}
            />
            Negative balances only
          </label>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th>Name</th>
                <th>Role</th>
                <th>Balance</th>
                <th>Limit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="py-2">
                    {u.firstName} {u.lastName}
                  </td>
                  <td>{u.role}</td>
                  <td
                    className={u.walletBalanceCents < 0 ? "text-red-600" : ""}
                  >
                    {(u.walletBalanceCents / 100).toLocaleString()}
                  </td>
                  <td>
                    {u.walletDebtLimitCents != null
                      ? (u.walletDebtLimitCents / 100).toLocaleString()
                      : "default"}
                  </td>
                  <td>
                    <Button size="sm" onClick={() => setOpen(u)}>
                      Credit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Credit {open.firstName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Input
                placeholder="Reason (required)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setOpen(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={submit}
                  disabled={credit.isPending || !amount || !reason}
                >
                  Confirm
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
