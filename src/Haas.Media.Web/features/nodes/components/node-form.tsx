"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import type { ConnectNodeRequest, NodeInfo, UpdateNodeRequest, NodeValidationResult } from "@/types/node";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NodeFormProps {
  node?: NodeInfo | undefined;
  onSubmit: (data: ConnectNodeRequest | UpdateNodeRequest) => Promise<void>;
  onCancel: () => void;
  onValidate?: (url: string, apiKey?: string) => Promise<{ success: boolean; message: string; result?: NodeValidationResult }>;
}

export function NodeForm({ node, onSubmit, onCancel, onValidate }: NodeFormProps) {
  const [name, setName] = useState(node?.name || "");
  const [url, setUrl] = useState(node?.url || "");
  const [apiKey, setApiKey] = useState(node?.apiKey || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<NodeValidationResult | null>(null);

  const handleValidate = async () => {
    if (!url) return;

    setIsValidating(true);
    setValidationResult(null);
    try {
      if (onValidate) {
        const result = await onValidate(url, apiKey || undefined);
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
        ...(apiKey ? { apiKey } : {}),
      };
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

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

      <div className="space-y-2">
        <Label htmlFor="apiKey">API Key (Optional)</Label>
        <Input
          id="apiKey"
          type="password"
          placeholder="Optional API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>

      {onValidate && (
        <Button type="button" variant="outline" onClick={handleValidate} disabled={isValidating || !url} className="w-full">
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
        <Button type="submit" disabled={isSubmitting}>
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
