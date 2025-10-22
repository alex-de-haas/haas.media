"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LanguageSelect } from "@/components/language-select";
import { CountrySelect } from "@/components/country-select";
import { useNotifications } from "@/lib/notifications";
import { Loader2, Save } from "lucide-react";
import { getApiUrl } from "@/lib/env";
import { isSupportedTmdbLanguage } from "@/lib/tmdb-languages";
import type { GlobalSettings, UpdateGlobalSettingsRequest } from "@/types/global-settings";

export default function SettingsPage() {
  const { notify } = useNotifications();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [countryCode, setCountryCode] = useState("US");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("auth_token");
        const response = await fetch(`${getApiUrl()}/api/global-settings`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch settings");
        }

        const settings: GlobalSettings = await response.json();
        const code = settings.preferredMetadataLanguage ?? "en";
        setPreferredLanguage(code && isSupportedTmdbLanguage(code) ? code : "en");
        setCountryCode((settings.countryCode ?? "US").toUpperCase());
      } catch (error) {
        console.error("Error fetching settings:", error);
        notify({ message: "Failed to load settings", type: "error" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const payload: UpdateGlobalSettingsRequest = {
        preferredMetadataLanguage: preferredLanguage,
        countryCode: countryCode.toUpperCase(),
      };

      const response = await fetch(`${getApiUrl()}/api/global-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to update settings");
      }

      notify({ message: "Settings updated successfully", type: "success" });
    } catch (error) {
      console.error("Error updating settings:", error);
      notify({
        message: error instanceof Error ? error.message : "Failed to update settings",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isSubmitDisabled = useMemo(() => {
    return !preferredLanguage || !countryCode || isSaving || isLoading;
  }, [preferredLanguage, countryCode, isSaving, isLoading]);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage global application settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Metadata Preferences</CardTitle>
          <CardDescription>
            Configure default language and country for metadata. These settings are used as fallback when libraries don&apos;t specify their
            own preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="preferredLanguage">Preferred TMDB Language</Label>
                <LanguageSelect id="preferredLanguage" value={preferredLanguage} onChange={setPreferredLanguage} disabled={isSaving} />
                <p className="text-sm text-muted-foreground">Default language for fetching movie and TV show metadata from TMDB</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="countryCode">Preferred Country (ISO 3166-1 alpha-2)</Label>
                <CountrySelect id="countryCode" value={countryCode} onChange={setCountryCode} disabled={isSaving} />
                <p className="text-sm text-muted-foreground">Default country for release dates and regional content</p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="submit" disabled={isSubmitDisabled}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
