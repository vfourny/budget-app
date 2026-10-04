import { ActionIcon, Button, Group, Text, Tooltip } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";

import { useDeleteImport } from "@/features/imports/hooks/use-delete-import";
import { fr } from "@/lib/i18n/fr";

interface DeleteImportButtonProps {
  importId: string;
  lineCount: number;
  /** `icon` : corbeille d'une ligne du tableau ; `button` : « Annuler l'import » de la relecture. */
  variant: "icon" | "button";
  onDeleted?: () => void;
}

/**
 * Suppression en deux temps, sans modale : un premier clic affiche « Supprimer N lignes ? »
 * avec Annuler / Confirmer à la place du bouton (l'état `confirming` est local au composant).
 */
export function DeleteImportButton({
  importId,
  lineCount,
  variant,
  onDeleted,
}: DeleteImportButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const deleteImport = useDeleteImport();

  if (!confirming) {
    return variant === "icon" ? (
      <Tooltip label={fr.imports.deleteImport}>
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={fr.imports.deleteImport}
          onClick={() => setConfirming(true)}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Tooltip>
    ) : (
      <Button variant="default" onClick={() => setConfirming(true)}>
        {fr.imports.cancelImport}
      </Button>
    );
  }

  return (
    <Group gap={10} justify="flex-end" wrap="nowrap">
      <Text size="sm" c="amber.4" style={{ whiteSpace: "nowrap" }}>
        {fr.imports.confirmDelete(lineCount)}
      </Text>
      <Button
        size="compact-sm"
        variant="default"
        disabled={deleteImport.isPending}
        onClick={() => setConfirming(false)}
      >
        {fr.common.cancel}
      </Button>
      <Button
        size="compact-sm"
        color="amber"
        loading={deleteImport.isPending}
        onClick={() => deleteImport.mutate({ id: importId }, { onSuccess: onDeleted })}
      >
        {fr.common.confirm}
      </Button>
    </Group>
  );
}
