import { Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

interface PageHeaderProps {
  /** Sur-titre en capitales (« NOUVEL IMPORT »). */
  eyebrow: string;
  /** Titre serif ; peut contenir un `<PageTitleAccent>` (mot en italique doré). */
  title: ReactNode;
  /** Zone à droite du titre (boutons d'action). */
  actions?: ReactNode;
}

/** En-tête commun des écrans : sur-titre + grand titre Instrument Serif (+ actions à droite). */
export function PageHeader({ eyebrow, title, actions }: PageHeaderProps) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 24,
        marginBottom: 28,
      }}
    >
      <Stack gap={6}>
        <Text
          fz={12}
          fw={700}
          c="var(--app-caption)"
          tt="uppercase"
          style={{ letterSpacing: "1.4px" }}
        >
          {eyebrow}
        </Text>
        <Title order={1}>{title}</Title>
      </Stack>
      {actions}
    </header>
  );
}

/** Mot mis en avant dans un titre : italique doré (« Bonjour *Valentin* »). */
export function PageTitleAccent({ children }: { children: ReactNode }) {
  return (
    <Text span inherit fs="italic" c="gold.6">
      {children}
    </Text>
  );
}
