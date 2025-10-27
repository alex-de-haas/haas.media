"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Server, CheckCircle, XCircle } from "lucide-react";
import type { NodeInfo } from "@/types/node";
import { formatDistanceToNow } from "date-fns";

interface NodeListProps {
  nodes: NodeInfo[];
  onEdit: (node: NodeInfo) => void;
  onDelete: (node: NodeInfo) => void;
}

export function NodeList({ nodes, onEdit, onDelete }: NodeListProps) {
  if (nodes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Server className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No nodes connected</p>
          <p className="text-sm text-muted-foreground mt-1">Connect to other Haas.Media servers to get started</p>
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
                {node.isEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status:</span>
                <div className="flex items-center gap-1">
                  {node.isEnabled ? (
                    <>
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">Active</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Inactive</span>
                    </>
                  )}
                </div>
              </div>

              {node.lastValidatedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last validated:</span>
                  <span className="text-xs">
                    {formatDistanceToNow(new Date(node.lastValidatedAt), { addSuffix: true })}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span className="text-xs">{formatDistanceToNow(new Date(node.createdAt), { addSuffix: true })}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => onEdit(node)} className="flex-1">
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDelete(node)} className="flex-1">
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
