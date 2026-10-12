import { ActionIcon, Tooltip } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'

interface InfoTipProps {
  /** Nom accessible du bouton (« Comment est calculé … ? »). */
  ariaLabel: string
  /** Explication affichée au survol, au focus clavier ou au toucher. */
  label: string
}

/** Petite icône « i » avec une info-bulle : explique comment un chiffre est calculé. */
export function InfoTip({ label, ariaLabel }: InfoTipProps) {
  return (
    <Tooltip
      events={{ hover: true, focus: true, touch: true }}
      label={label}
      multiline
      w={280}
      withArrow
    >
      <ActionIcon
        aria-label={ariaLabel}
        color="gray"
        radius="xl"
        size="xs"
        variant="subtle"
      >
        <IconInfoCircle size={14} />
      </ActionIcon>
    </Tooltip>
  )
}
