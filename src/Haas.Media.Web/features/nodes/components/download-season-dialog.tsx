"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { GlobalSettings } from "@/types/global-settings";

interface NodeOption {
  nodeId: string;
  nodeName: string;
  count: number;
}

interface DownloadSeasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (destinationDirectory: string, nodeId: string, nodeName: string) => void;
  seasonNumber: number;
  availableNodes: NodeOption[];
  globalSettings: GlobalSettings | null;
  isDownloading?: boolean;
}

export function DownloadSeasonDialog({
  open,
  onOpenChange,
  onConfirm,
  seasonNumber,
  availableNodes,
  globalSettings,
  isDownloading = false,
}: DownloadSeasonDialogProps) {
  const [selectedDirectory, setSelectedDirectory] = useState<string>("");
  const [selectedNode, setSelectedNode] = useState<string>("");

  // Get available TV show directories
  const availableDirectories = useMemo(() => {
    if (!globalSettings) return [];
    return globalSettings.tvShowDirectories;
  }, [globalSettings]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      // Auto-select first available directory
      if (availableDirectories.length > 0 && availableDirectories[0]) {
        setSelectedDirectory(availableDirectories[0]);
      } else {
        setSelectedDirectory("");
      }

      // Auto-select first available node
      if (availableNodes.length > 0 && availableNodes[0]) {
        setSelectedNode(availableNodes[0].nodeId);
      } else {
        setSelectedNode("");
      }
    }
  }, [open, availableDirectories, availableNodes]);

  const handleConfirm = () => {
    const selectedNodeData = availableNodes.find((node) => node.nodeId === selectedNode);
    if (selectedDirectory && selectedNode && selectedNodeData) {
      onConfirm(selectedDirectory, selectedNode, selectedNodeData.nodeName);
    }
  };

  const isValid = selectedDirectory && selectedNode;
  const hasNoDirectories = availableDirectories.length === 0;
  const hasNoNodes = availableNodes.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Download Season {seasonNumber}</DialogTitle>
          <DialogDescription>Choose a destination directory and node to download all episodes from this season.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {hasNoDirectories || hasNoNodes ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {hasNoDirectories
                  ? "No TV show directories configured. Please configure TV show directories in settings before downloading."
                  : "No nodes available for this season."}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="directory">Destination Directory</Label>
                <Select value={selectedDirectory} onValueChange={setSelectedDirectory} disabled={isDownloading}>
                  <SelectTrigger id="directory">
                    <SelectValue placeholder="Select a directory" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDirectories.map((dir) => (
                      <SelectItem key={dir} value={dir}>
                        {dir}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Select where to save the downloaded episodes.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="node">Source Node</Label>
                <Select value={selectedNode} onValueChange={setSelectedNode} disabled={isDownloading}>
                  <SelectTrigger id="node">
                    <SelectValue placeholder="Select a node" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableNodes.map((node) => (
                      <SelectItem key={node.nodeId} value={node.nodeId}>
                        {node.nodeName} ({node.count} {node.count === 1 ? "episode" : "episodes"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Select the node to download episodes from.</p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDownloading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid || hasNoDirectories || hasNoNodes || isDownloading}>
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download Season
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
