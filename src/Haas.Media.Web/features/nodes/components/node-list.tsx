"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Server, CheckCircle, XCircle, Download } from "lucide-react";
import type { NodeInfo } from "@/types/node";
import { formatDistanceToNow } from "date-fns";
import { useTranslations } from "next-intl";

interface NodeListProps {
  nodes: NodeInfo[];
  onEdit: (node: NodeInfo) => void;
  onDelete: (node: NodeInfo) => void;
  onFetchMetadata?: (node: NodeInfo) => void;
}

export function NodeList({ nodes, onEdit, onDelete, onFetchMetadata }: NodeListProps) {
  const t = useTranslations("nodes");
  const tCommon = useTranslations("common");
  if (nodes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Server className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t("noNodesConnected")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("noNodesDescription")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {nodes.map((node) => (
        <Card key={node.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Server className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base truncate">{node.name}</CardTitle>
                  <CardDescription className="text-xs truncate">{node.url}</CardDescription>
                </div>
              </div>
              <Badge variant={node.isEnabled ? "default" : "secondary"} className="ml-2 flex-shrink-0">
                {node.isEnabled ? t("enabled") : t("disabled")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("status")}:</span>
                <div className="flex items-center gap-1">
                  {node.isEnabled ? (
                    <>
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">{t("active")}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{t("inactive")}</span>
                    </>
                  )}
                </div>
              </div>

              {node.lastValidatedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("lastValidated")}:</span>
                  <span className="text-xs">{formatDistanceToNow(new Date(node.lastValidatedAt), { addSuffix: true })}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("created")}:</span>
                <span className="text-xs">{formatDistanceToNow(new Date(node.createdAt), { addSuffix: true })}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              {onFetchMetadata && (
                <Button variant="outline" size="sm" onClick={() => onFetchMetadata(node)} className="flex-1">
                  <Download className="h-3 w-3 mr-1" />
                  {t("fetch")}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => onEdit(node)} className="flex-1">
                <Edit className="h-3 w-3 mr-1" />
                {tCommon("edit")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDelete(node)} className="flex-1">
                <Trash2 className="h-3 w-3 mr-1" />
                {tCommon("delete")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
