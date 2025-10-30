"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthGuard } from "@/features/auth/use-auth-guard";
import { usePageTitle } from "@/components/layout/layout-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotifications } from "@/lib/notifications";
import { fetchJsonWithAuth, fetchWithAuth } from "@/lib/auth/fetch-with-auth";
import { getApiUrl } from "@/lib/api";
import type { ExternalTokenInfo, ExternalTokenResponse } from "@/types/auth";
import { Trash2, Copy, Plus, Key, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function TokensPage() {
  const { isAuthenticated, isLoading } = useAuthGuard();
  const { notify } = useNotifications();
  const [tokens, setTokens] = useState<ExternalTokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [createdToken, setCreatedToken] = useState<ExternalTokenResponse | null>(null);
  const [deleteTokenId, setDeleteTokenId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  usePageTitle("API Tokens");

  const loadTokens = useCallback(async () => {
    try {
      setLoading(true);
      const apiUrl = getApiUrl();
      const data = await fetchJsonWithAuth<ExternalTokenInfo[]>(`${apiUrl}/api/auth/tokens`);
      setTokens(data);
    } catch (error) {
      notify({ type: "error", message: "Failed to load tokens" });
      console.error("Failed to load tokens:", error);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (isAuthenticated) {
      loadTokens();
    }
  }, [isAuthenticated, loadTokens]);

  const handleCreateToken = async () => {
    if (!newTokenName.trim()) {
      notify({ type: "error", message: "Token name is required" });
      return;
    }

    try {
      setActionLoading(true);
      const apiUrl = getApiUrl();
      const response = await fetchWithAuth(`${apiUrl}/api/auth/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTokenName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create token");
      }

      const data: ExternalTokenResponse = await response.json();
      setCreatedToken(data);
      setNewTokenName("");
      setCreateDialogOpen(false);
      loadTokens();
      notify({ type: "success", message: "Token created successfully" });
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Failed to create token" });
      console.error("Failed to create token:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    try {
      setActionLoading(true);
      const apiUrl = getApiUrl();
      const response = await fetchWithAuth(`${apiUrl}/api/auth/tokens/${tokenId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete token");
      }

      setDeleteTokenId(null);
      loadTokens();
      notify({ type: "success", message: "Token revoked successfully" });
    } catch (error) {
      notify({ type: "error", message: "Failed to revoke token" });
      console.error("Failed to delete token:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notify({ type: "success", message: "Copied to clipboard" });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  if (isLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Tokens</h1>
          <p className="mt-1 text-muted-foreground">Manage external tokens for API access and node connections</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Token
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          External tokens do not expire and are used for node-to-node communication and API integrations. Keep them secure and revoke tokens
          that are no longer needed.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Your Tokens</CardTitle>
          <CardDescription>These tokens can be used to authenticate API requests without expiration</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading tokens...</div>
          ) : tokens.length === 0 ? (
            <div className="py-8 text-center">
              <Key className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">No tokens created yet</p>
              <Button className="mt-4" variant="outline" onClick={() => setCreateDialogOpen(true)}>
                Create your first token
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {tokens.map((token) => (
                <div key={token.id} className="flex flex-col gap-3 rounded-lg border border-border bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{token.name}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Created: {formatDate(token.createdAt)}
                        {token.lastUsedAt && <span className="ml-4">Last used: {formatDate(token.lastUsedAt)}</span>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTokenId(token.id)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 overflow-hidden rounded-md border bg-background px-3 py-2 font-mono text-xs">
                      <div className="overflow-x-auto">{token.token}</div>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(token.token)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Token Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create External Token</DialogTitle>
            <DialogDescription>Create a new token for API access or node connections.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="token-name">Token Name</Label>
              <Input
                id="token-name"
                placeholder="e.g., Node Connection, API Integration"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                disabled={actionLoading}
              />
              <p className="text-xs text-muted-foreground">Choose a descriptive name to help you remember what this token is for</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleCreateToken} disabled={actionLoading}>
              {actionLoading ? "Creating..." : "Create Token"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Token Created Dialog */}
      <Dialog open={!!createdToken} onOpenChange={() => setCreatedToken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Token Created Successfully</DialogTitle>
            <DialogDescription>Your token has been created. You can view and copy it anytime from the tokens list.</DialogDescription>
          </DialogHeader>
          {createdToken && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Token Name</Label>
                <div className="rounded-md border bg-muted px-3 py-2 font-mono text-sm">{createdToken.name}</div>
              </div>
              <div className="space-y-2">
                <Label>Token Value</Label>
                <div className="flex gap-2">
                  <div className="flex-1 overflow-hidden rounded-md border bg-muted px-3 py-2 font-mono text-sm">
                    <div className="overflow-x-auto">{createdToken.token}</div>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(createdToken.token)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Keep your token secure. You can view it anytime from the tokens list.</AlertDescription>
                </Alert>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCreatedToken(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTokenId} onOpenChange={() => setDeleteTokenId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Token?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently revoke the token. Any services using this token will lose access immediately. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTokenId && handleDeleteToken(deleteTokenId)}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? "Revoking..." : "Revoke Token"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
