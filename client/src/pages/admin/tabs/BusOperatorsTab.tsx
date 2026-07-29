import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, BusFront } from "lucide-react";
import CustomLoader from "@/components/CustomLoader";
import { useBusOperators, useCreateBusOperator } from "@/hooks/useBusOperators";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  password: "",
};

export const BusOperatorsTab: React.FC = () => {
  const { data: operators, isLoading, error } = useBusOperators();
  const createMutation = useCreateBusOperator();
  const [form, setForm] = useState(EMPTY_FORM);

  const handleChange =
    (field: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync(form);
    setForm(EMPTY_FORM);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <CustomLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500 dark:text-red-400">
        Failed to load bus operators
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
          <BusFront className="h-6 w-6" />
          Bus Operators
        </h2>
        <p className="text-muted-foreground mt-1">
          Create and manage users with the BUS_OPERATOR role.
        </p>
      </div>

      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle>Create bus operator</CardTitle>
          <CardDescription>
            Creates a new account with the BUS_OPERATOR role and the password you
            set here. The operator can log in to the operator dashboard
            immediately and should change their password after first login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="bo-firstName">First name</Label>
              <Input
                id="bo-firstName"
                placeholder="First name"
                value={form.firstName}
                onChange={handleChange("firstName")}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="bo-lastName">Last name</Label>
              <Input
                id="bo-lastName"
                placeholder="Last name"
                value={form.lastName}
                onChange={handleChange("lastName")}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="bo-email">Email</Label>
              <Input
                id="bo-email"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange("email")}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="bo-phone">Phone number</Label>
              <Input
                id="bo-phone"
                placeholder="+263..."
                value={form.phoneNumber}
                onChange={handleChange("phoneNumber")}
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="bo-password">Temporary password</Label>
              <Input
                id="bo-password"
                type="password"
                placeholder="Minimum 4 characters"
                value={form.password}
                onChange={handleChange("password")}
                minLength={4}
                required
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex items-center gap-2"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Create operator
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Operators table */}
      <Card>
        <CardHeader>
          <CardTitle>Operators ({operators?.length ?? 0})</CardTitle>
          <CardDescription>
            Users with role = BUS_OPERATOR.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["Name", "Email", "Phone", "Status", "Registered"].map(
                    (header) => (
                      <th
                        key={header}
                        className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400"
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {operators && operators.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-gray-500 dark:text-gray-400"
                    >
                      No bus operators found. Create one above.
                    </td>
                  </tr>
                ) : (
                  operators?.map((op) => (
                    <tr
                      key={op.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                        {op.firstName} {op.lastName}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {op.email}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {op.phoneNumber ?? "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            op.status === "ACTIVE" || op.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                          }`}
                        >
                          {op.status ?? (op.isActive ? "Active" : "Inactive")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {op.createdAt
                          ? new Date(op.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
