"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, Key } from "lucide-react";
import type { ConnectNodeRequest, NodeInfo, UpdateNodeRequest, NodeValidationResult } from "@/types/node";
import type { ExternalTokenInfo } from "@/types/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchJsonWithAuth } from "@/lib/auth/fetch-with-auth";
import { getApiUrl } from "@/lib/api";

interface NodeFormProps {
  node?: NodeInfo | undefined;
  onSubmit: (data: ConnectNodeRequest | UpdateNodeRequest) => Promise<void>;
  onCancel: () => void;
  onValidate?: (url: string, apiKey?: string) => Promise<{ success: boolean; message: string; result?: NodeValidationResult }>;
}

export function NodeForm({ node, onSubmit, onCancel, onValidate }: NodeFormProps) {
  const [name, setName] = useState(node?.name || "");
  const [url, setUrl] = useState(node?.url || "");
  
  // Destination node authentication (to authenticate TO destination) - manual only
  const [destApiKey, setDestApiKey] = useState("");
  
  // Current node authentication (to send TO destination)
  const [selectedCurrentTokenId, setSelectedCurrentTokenId] = useState<string>("");
  
  const [tokens, setTokens] = useState<ExternalTokenInfo[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<NodeValidationResult | null>(null);

  const loadTokens = useCallback(async () => {
    try {
      setLoadingTokens(true);
      const apiUrl = getApiUrl();
      const data = await fetchJsonWithAuth<ExternalTokenInfo[]>(`${apiUrl}/api/auth/tokens`);
      setTokens(data);
    } catch (error) {
      console.error("Failed to load tokens:", error);
    } finally {
      setLoadingTokens(false);
    }
  }, []);

  useEffect(() => {
    if (!node) {
      // Only load tokens when creating a new connection (not editing)
      loadTokens();
    }
  }, [node, loadTokens]);

  const handleValidate = async () => {
    if (!url) return;

    setIsValidating(true);
    setValidationResult(null);
    try {
      if (onValidate) {
        const result = await onValidate(url, destApiKey || undefined);
        if (result.result) {
          setValidationResult(result.result);
        }
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data: ConnectNodeRequest | UpdateNodeRequest = {
        name,
        url,
        ...(destApiKey ? { destinationApiKey: destApiKey } : {}),
        ...(selectedCurrentTokenId ? { currentNodeTokenId: selectedCurrentTokenId } : {}),
      };
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasDestAuth = !!destApiKey;
  const canValidate = url && hasDestAuth;
  const canSubmit = canValidate && selectedCurrentTokenId;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Remote Server" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          type="url"
          placeholder="http://192.168.1.100:8000"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
      </div>

      {!node && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Destination Node Token</CardTitle>
              <CardDescription>Enter the token FROM the destination node to authenticate TO it</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="destApiKey">Destination Token</Label>
                <p className="text-xs text-muted-foreground">Paste the token from the destination node</p>
                <Input
                  id="destApiKey"
                  type="password"
                  placeholder="Enter destination node's token"
                  value={destApiKey}
                  onChange={(e) => setDestApiKey(e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Node Token</CardTitle>
              <CardDescription>Your token to send TO the destination node (for callbacks)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="currentTokenSelect">Select Your Token to Share</Label>
                <p className="text-xs text-muted-foreground">This token will be sent to the destination node</p>
                {loadingTokens ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading tokens...
                  </div>
                ) : tokens.length === 0 ? (
                  <Alert>
                    <Key className="h-4 w-4" />
                    <AlertDescription>
                      No external tokens found. Create one in the{" "}
                      <a href="/tokens" className="underline font-medium">
                        API Tokens
                      </a>{" "}
                      page first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select value={selectedCurrentTokenId} onValueChange={setSelectedCurrentTokenId}>
                    <SelectTrigger id="currentTokenSelect">
                      <SelectValue placeholder="Select a token to share..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tokens.map((token) => (
                        <SelectItem key={token.id} value={token.id}>
                          {token.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {node && (
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key (Optional)</Label>
          <Input
            id="apiKey"
            type="password"
            placeholder="Optional API key"
            value={node.apiKey || ""}
            onChange={() => {}}
            disabled
          />
        </div>
      )}

      {onValidate && (
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleValidate} 
          disabled={isValidating || !canValidate} 
          className="w-full"
        >
          {isValidating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Validating...
            </>
          ) : (
            "Validate Connection"
          )}
        </Button>
      )}

      {validationResult && (
        <Alert variant={validationResult.isValid ? "default" : "destructive"}>
          <div className="flex items-start gap-2">
            {validationResult.isValid ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription>
              {validationResult.isValid ? "Connection successful!" : validationResult.errorMessage || "Validation failed"}
              {validationResult.systemInfo && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {Object.entries(validationResult.systemInfo).map(([key, value]) => (
                    <div key={key}>
                      {key}: {value}
                    </div>
                  ))}
                </div>
              )}
            </AlertDescription>
          </div>
        </Alert>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || (!node && !canSubmit)}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {node ? "Updating..." : "Connecting..."}
            </>
          ) : node ? (
            "Update Node"
          ) : (
            "Connect Node"
          )}
        </Button>
      </div>
    </form>
  );
}
