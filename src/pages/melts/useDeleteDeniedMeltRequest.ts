import { useRef, useState } from "react";
import { toast } from "@bitcredit/ui-library";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { deleteDeniedMeltopMutation, listDeniedMeltopsQueryKey } from "@/generated/client/@tanstack/react-query.gen";
import type { DeniedMeltOp } from "@/generated/client/types.gen";
import { getApiErrorMessage } from "@/lib/api-error";
import { createLogger } from "@/lib/logger";

const logger = createLogger("delete-denied-melt-request");

export function useDeleteDeniedMeltRequest() {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<DeniedMeltOp | null>(null);
  const deleteToastRef = useRef<ReturnType<typeof toast> | null>(null);

  const deleteMutation = useMutation({
    ...deleteDeniedMeltopMutation(),
    onMutate: () => {
      deleteToastRef.current?.dismiss();
      deleteToastRef.current = toast({
        title: intl.formatMessage({
          id: "deniedMeltRequests.delete.pending",
          defaultMessage: "Deleting denied melt request...",
        }),
        variant: "info",
      });
    },
    onSettled: () => {
      deleteToastRef.current?.dismiss();
      deleteToastRef.current = null;
    },
    onError: (mutationError) => {
      toast({
        title: intl.formatMessage(
          {
            id: "deniedMeltRequests.delete.error",
            defaultMessage: "Error while deleting denied melt request: {error}",
          },
          { error: getApiErrorMessage(mutationError) }
        ),
        variant: "error",
      });
      logger.warn("Delete denied melt request failed", mutationError);
    },
    onSuccess: () => {
      toast({
        title: intl.formatMessage({
          id: "deniedMeltRequests.delete.success",
          defaultMessage: "Denied melt request has been deleted.",
        }),
        variant: "success",
      });
      setDeleteTarget(null);
      void queryClient.invalidateQueries({
        queryKey: listDeniedMeltopsQueryKey(),
      });
    },
  });

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }

    deleteMutation.mutate({
      path: { qid: deleteTarget.id },
    });
  };

  const closeDeleteConfirmation = (open: boolean) => {
    if (!open && !deleteMutation.isPending) {
      setDeleteTarget(null);
    }
  };

  return {
    deleteTarget,
    setDeleteTarget,
    confirmDelete,
    closeDeleteConfirmation,
    deletingId: deleteMutation.isPending ? deleteMutation.variables?.path.qid : undefined,
    isDeleting: deleteMutation.isPending,
  };
}
