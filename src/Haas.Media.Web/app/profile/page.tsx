"use client";

import { FormEvent, useState } from "react";
import { useAuthGuard } from "@/features/auth/use-auth-guard";
import { useLocalAuth } from "@/features/auth/local-auth-context";
import { usePageTitle } from "@/components/layout/layout-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/lib/notifications";

export default function ProfilePage() {
  const { isAuthenticated, isLoading } = useAuthGuard();
  const { user, updatePassword } = useLocalAuth();
  const { notify } = useNotifications();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  usePageTitle("Profile");

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword.length < 8) {
      notify({ type: "error", message: "New password must be at least 8 characters" });
      return;
    }

    if (newPassword !== confirmPassword) {
      notify({ type: "error", message: "New password and confirmation do not match" });
      return;
    }

    setPasswordLoading(true);
    const result = await updatePassword(currentPassword, newPassword);
    setPasswordLoading(false);

    if (result.success) {
      notify({ type: "success", message: "Password updated" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      notify({ type: "error", message: result.error ?? "Unable to update password" });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>View your account information. Configure metadata preferences per library in the Libraries page.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" type="text" value={user?.username ?? ""} disabled readOnly />
            </div>
            <p className="text-sm text-muted-foreground">
              To change metadata language and country preferences, configure them individually for each library in the Libraries page.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Choose a strong password to keep your account secure.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handlePasswordSubmit}>
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                required
                disabled={passwordLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                required
                disabled={passwordLoading}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
                disabled={passwordLoading}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={passwordLoading}>
                {passwordLoading ? "Updating..." : "Update password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
