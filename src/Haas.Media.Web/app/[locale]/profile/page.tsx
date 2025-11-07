"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuthGuard } from "@/features/auth/use-auth-guard";
import { useLocalAuth } from "@/features/auth/local-auth-context";
import { usePageTitle } from "@/components/layout/layout-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/lib/notifications";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const { isAuthenticated, isLoading } = useAuthGuard();
  const { user, updatePassword } = useLocalAuth();
  const { notify } = useNotifications();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  usePageTitle(t("pageTitle"));

  if (isLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">{t("loading")}</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword.length < 8) {
      notify({ type: "error", message: t("passwordTooShort") });
      return;
    }

    if (newPassword !== confirmPassword) {
      notify({ type: "error", message: t("passwordsDoNotMatch") });
      return;
    }

    setPasswordLoading(true);
    const result = await updatePassword(currentPassword, newPassword);
    setPasswordLoading(false);

    if (result.success) {
      notify({ type: "success", message: t("passwordUpdated") });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      notify({ type: "error", message: result.error ?? t("passwordUpdateFailed") });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t("username")}</Label>
              <Input id="username" type="text" value={user?.username ?? ""} disabled readOnly />
            </div>
            <p className="text-sm text-muted-foreground">{t("metadataPreferencesNote")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("changePassword")}</CardTitle>
          <CardDescription>{t("changePasswordDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handlePasswordSubmit}>
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t("currentPassword")}</Label>
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
              <Label htmlFor="newPassword">{t("newPassword")}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                required
                disabled={passwordLoading}
                placeholder={t("newPasswordPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("confirmNewPassword")}</Label>
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
                {passwordLoading ? t("updating") : t("updatePassword")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
