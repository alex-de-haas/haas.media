"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuthGuard } from "@/features/auth/use-auth-guard";
import { useLocalAuth } from "@/features/auth/local-auth-context";
import { usePageTitle } from "@/components/layout/layout-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotifications } from "@/lib/notifications";
import { TMDB_LANGUAGE_OPTIONS, isSupportedTmdbLanguage } from "@/lib/tmdb-languages";

export default function ProfilePage() {
  const { isAuthenticated, isLoading } = useAuthGuard();
  const { user, updateProfile, updatePassword } = useLocalAuth();
  const { notify } = useNotifications();
  const [preferredLanguage, setPreferredLanguage] = useState(() => {
    const code = user?.preferredMetadataLanguage ?? "en";
    return isSupportedTmdbLanguage(code) ? code : "en";
  });
  const [preferredCountry, setPreferredCountry] = useState(() => (user?.countryCode ?? "US").toUpperCase());
  const [profileLoading, setProfileLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  usePageTitle("Profile");

  useEffect(() => {
    if (user) {
      const code = user.preferredMetadataLanguage ?? "en";
      setPreferredLanguage(isSupportedTmdbLanguage(code) ? code : "en");
      setPreferredCountry((user.countryCode ?? "US").toUpperCase());
    }
  }, [user]);

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

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedCountry = preferredCountry.trim().toUpperCase();
    if (normalizedCountry.length !== 2 || /[^A-Z]/.test(normalizedCountry)) {
      notify({ type: "error", message: "Country code must be a two-letter ISO code (e.g. US, GB)." });
      return;
    }

    setProfileLoading(true);
    const result = await updateProfile(preferredLanguage, normalizedCountry);
    setProfileLoading(false);

    if (result.success) {
      notify({ type: "success", message: "Profile updated" });
    } else {
      notify({ type: "error", message: result.error ?? "Unable to update profile" });
    }
  };

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
          <CardDescription>Update the metadata language and preferred release country associated with your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleProfileSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" type="text" value={user?.username ?? ""} disabled readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferredLanguage">Preferred TMDB language</Label>
              <Select
                value={preferredLanguage}
                onValueChange={setPreferredLanguage}
                disabled={profileLoading}
              >
                <SelectTrigger id="preferredLanguage" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TMDB_LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.label} ({option.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferredCountry">Preferred release country (ISO 3166-1 alpha-2)</Label>
              <Input
                id="preferredCountry"
                type="text"
                value={preferredCountry}
                onChange={(event) => setPreferredCountry(event.target.value.toUpperCase())}
                maxLength={2}
                disabled={profileLoading}
                placeholder="US"
                autoCapitalize="characters"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={profileLoading}>
                {profileLoading ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
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
