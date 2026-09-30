import { Paper, Text } from "@mantine/core";

/** Carte d'attente des écrans pas encore construits (la navigation, elle, est déjà en place). */
export function ComingSoon({ children }: { children: string }) {
  return (
    <Paper withBorder radius="lg" p={28}>
      <Text c="dimmed">{children}</Text>
    </Paper>
  );
}
