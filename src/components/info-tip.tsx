import { ActionIcon, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

interface InfoTipProps {
  /** Explication affichée au survol, au focus clavier ou au toucher. */
  label: string;
  /** Nom accessible du bouton (« Comment est calculé … ? »). */
  ariaLabel: string;
}

/** Petite icône « i » avec une info-bulle : explique comment un chiffre est calculé. */
export function InfoTip({ label, ariaLabel }: InfoTipProps) {
  return (
    <Tooltip
      multiline
      w={280}
      withArrow
      label={label}
      events={{ hover: true, focus: true, touch: true }}
    >
      <ActionIcon variant="subtle" color="gray" size="xs" radius="xl" aria-label={ariaLabel}>
        <IconInfoCircle size={14} />
      </ActionIcon>
    </Tooltip>
  );
}
