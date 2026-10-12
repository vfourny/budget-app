import { ActionIcon, Button, Group, Text, Tooltip } from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'
import { useState } from 'react'

import { useDeleteImport } from '@/features/imports/hooks/use-delete-import'
import { fr } from '@/lib/i18n/fr'

interface DeleteImportButtonProps {
  importId: string
  lineCount: number
  onDeleted?: () => void
  /** `icon` : corbeille d'une ligne du tableau ; `button` : « Annuler l'import » de la relecture. */
  variant: 'icon' | 'button'
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
  const [confirming, setConfirming] = useState(false)
  const deleteImport = useDeleteImport()

  if (!confirming) {
    return variant === 'icon' ? (
      <Tooltip label={fr.imports.deleteImport}>
        <ActionIcon
          aria-label={fr.imports.deleteImport}
          color="gray"
          onClick={() => setConfirming(true)}
          variant="subtle"
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Tooltip>
    ) : (
      <Button onClick={() => setConfirming(true)} variant="default">
        {fr.imports.cancelImport}
      </Button>
    )
  }

  return (
    <Group gap={10} justify="flex-end" wrap="nowrap">
      <Text c="amber.4" size="sm" style={{ whiteSpace: 'nowrap' }}>
        {fr.imports.confirmDelete(lineCount)}
      </Text>
      <Button
        disabled={deleteImport.isPending}
        onClick={() => setConfirming(false)}
        size="compact-sm"
        variant="default"
      >
        {fr.common.cancel}
      </Button>
      <Button
        color="amber"
        loading={deleteImport.isPending}
        onClick={() =>
          deleteImport.mutate({ id: importId }, { onSuccess: onDeleted })
        }
        size="compact-sm"
      >
        {fr.common.confirm}
      </Button>
    </Group>
  )
}
