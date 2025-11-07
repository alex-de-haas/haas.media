"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("nodes");
  const tCommon = useTranslations("common");

  usePageTitle(t("pageTitle"));

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);
  const [nodeToDelete, setNodeToDelete] = useState<NodeInfo | null>(null);

  const { nodes, loading, error, validateNode, connectNode, updateNode, deleteNode, fetchNodeMetadata } = useNodes();
  const { notify } = useNotifications();

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedNode(null);
  };

  const handleFormSubmit = async (data: ConnectNodeRequest | UpdateNodeRequest) => {
    if (selectedNode?.id) {
      const result = await updateNode(selectedNode.id, data);
      notify({
        title: result.success ? t("nodeUpdated") : t("updateFailed"),
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
      title: result.success ? t("nodeConnected") : t("connectionFailed"),
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
      title: result.success ? t("nodeDeleted") : t("deleteFailed"),
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

  const handleFetchMetadata = async (node: NodeInfo) => {
    const result = await fetchNodeMetadata(node.id);
    notify({
      title: result.success ? t("metadataFetched") : t("fetchFailed"),
      message: result.message,
      type: result.success ? "success" : "error",
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("pageDescription")}</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("connectNode")}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("error")}</AlertTitle>
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
                {t("nodesCount", { count: nodes.length })}
              </CardTitle>
              <CardDescription>{t("nodesDescription")}</CardDescription>
            </CardHeader>
          </Card>

          <NodeList
            nodes={nodes}
            onEdit={(node) => {
              setSelectedNode(node);
              setIsFormOpen(true);
            }}
            onDelete={(node) => setNodeToDelete(node)}
            onFetchMetadata={handleFetchMetadata}
          />
        </>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedNode ? t("editNode") : t("connectToNode")}</DialogTitle>
            <DialogDescription>{selectedNode ? t("editNodeDescription") : t("connectNodeDescription")}</DialogDescription>
          </DialogHeader>
          <NodeForm node={selectedNode ?? undefined} onSubmit={handleFormSubmit} onCancel={closeForm} onValidate={handleValidate} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!nodeToDelete} onOpenChange={(open) => !open && setNodeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteNode")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteNodeConfirmation", { name: nodeToDelete?.name || "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNode}>{tCommon("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
