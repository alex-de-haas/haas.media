"use client";

import { useState } from "react";
import { useNodes, NodeForm, NodeList } from "@/features/nodes";
import { useNotifications } from "@/lib/notifications";
import { usePageTitle } from "@/components/layout";
import type { ConnectNodeRequest, NodeInfo, UpdateNodeRequest } from "@/types/node";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, Server, AlertCircle, Loader2 } from "lucide-react";

export default function NodesPage() {
  usePageTitle("Connected Nodes");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);
  const [nodeToDelete, setNodeToDelete] = useState<NodeInfo | null>(null);

  const { nodes, loading, error, validateNode, connectNode, updateNode, deleteNode } = useNodes();
  const { notify } = useNotifications();

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedNode(null);
  };

  const handleFormSubmit = async (data: ConnectNodeRequest | UpdateNodeRequest) => {
    if (selectedNode?.id) {
      const result = await updateNode(selectedNode.id, data);
      notify({
        title: result.success ? "Node Updated" : "Update Failed",
        message: result.message,
        type: result.success ? "success" : "error",
      });

      if (result.success) {
        closeForm();
      }
      return;
    }

    const result = await connectNode(data as ConnectNodeRequest);
    notify({
      title: result.success ? "Node Connected" : "Connection Failed",
      message: result.message,
      type: result.success ? "success" : "error",
    });

    if (result.success) {
      closeForm();
    }
  };

  const handleDeleteNode = async () => {
    if (!nodeToDelete?.id) return;

    const result = await deleteNode(nodeToDelete.id);
    notify({
      title: result.success ? "Node Deleted" : "Delete Failed",
      message: result.message,
      type: result.success ? "success" : "error",
    });

    if (result.success) {
      setNodeToDelete(null);
    }
  };

  const handleValidate = async (url: string, apiKey?: string) => {
    return await validateNode({ url, ...(apiKey ? { apiKey } : {}) });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Connected Nodes</h1>
          <p className="text-muted-foreground mt-1">Manage connections to other Haas.Media server instances</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Connect Node
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Connected Nodes ({nodes.length})
              </CardTitle>
              <CardDescription>
                Nodes allow distributed media management across multiple Haas.Media server instances
              </CardDescription>
            </CardHeader>
          </Card>

          <NodeList
            nodes={nodes}
            onEdit={(node) => {
              setSelectedNode(node);
              setIsFormOpen(true);
            }}
            onDelete={(node) => setNodeToDelete(node)}
          />
        </>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedNode ? "Edit Node" : "Connect to Node"}</DialogTitle>
            <DialogDescription>
              {selectedNode
                ? "Update the configuration for this node"
                : "Connect to another Haas.Media server instance"}
            </DialogDescription>
          </DialogHeader>
          <NodeForm node={selectedNode ?? undefined} onSubmit={handleFormSubmit} onCancel={closeForm} onValidate={handleValidate} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!nodeToDelete} onOpenChange={(open) => !open && setNodeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Node</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the node &quot;{nodeToDelete?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNode}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
