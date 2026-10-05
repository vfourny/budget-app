import { Table, Text } from "@mantine/core";
import { Fragment } from "react";

import type { GaugeGoal } from "@/components/target-gauge";
import { formatCents } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { Amount } from "@server/lib/pro/types";

import classes from "./forecast-table.module.css";

/** `detail` : ligne « dont … » grisée ; `memo` : pour info (hors total) ; `total` : ligne de total. */
export type ForecastRowTone = "normal" | "detail" | "memo" | "total";

export interface ForecastRow {
  key: string;
  label: string;
  sub?: string;
  amount: Amount;
  /** Sens favorable de l'écart : `atMost` pour une charge (moins = mieux). */
  goal: GaugeGoal;
  tone?: ForecastRowTone;
}

export interface ForecastGroup {
  key: string;
  label: string;
  rows: ForecastRow[];
}

/** Tableau Catégorie / Prévu / Réel / Écart, par groupes (vue mois et vue année). */
export function ForecastTable({ groups }: { groups: readonly ForecastGroup[] }) {
  const columns = fr.professional.categories.columns;
  return (
    <Table.ScrollContainer minWidth={560}>
      <Table verticalSpacing="xs" horizontalSpacing="md">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{columns.category}</Table.Th>
            <Table.Th ta="right">{columns.forecast}</Table.Th>
            <Table.Th ta="right">{columns.actual}</Table.Th>
            <Table.Th ta="right">{columns.delta}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {groups.map((group) => (
            <Fragment key={group.key}>
              <Table.Tr>
                <Table.Th colSpan={4} scope="colgroup" c="gold.6" fz="xs" tt="uppercase" pt={16}>
                  {group.label}
                </Table.Th>
              </Table.Tr>
              {group.rows.map((row) => (
                <Row key={row.key} row={row} />
              ))}
            </Fragment>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function Row({ row }: { row: ForecastRow }) {
  const { amount, tone = "normal" } = row;
  const delta = amount.actual === null ? null : amount.actual - amount.forecast;
  const favorable = delta !== null && (row.goal === "atMost" ? delta < 0 : delta > 0);
  const muted = tone === "detail" || tone === "memo";
  const bold = tone === "total" ? 700 : undefined;

  return (
    <Table.Tr>
      <Table.Th scope="row" fw={bold ?? 400}>
        <Text span size="sm" c={muted ? "dimmed" : undefined} fw={bold}>
          {row.label}
        </Text>
        {row.sub && (
          <Text span size="xs" c="dimmed" ml={6}>
            · {row.sub}
          </Text>
        )}
      </Table.Th>
      <Table.Td ta="right" c="dimmed" fw={bold} className={classes.number}>
        {formatCents(amount.forecast)}
      </Table.Td>
      <Table.Td
        ta="right"
        fw={bold ?? 600}
        c={muted ? "dimmed" : undefined}
        className={classes.number}
      >
        {amount.actual === null ? "—" : formatCents(amount.actual)}
      </Table.Td>
      <Table.Td
        ta="right"
        fw={bold}
        className={classes.number}
        c={delta === null || delta === 0 ? "dimmed" : favorable ? "teal.4" : "red.4"}
      >
        {delta === null
          ? "—"
          : `${delta > 0 ? "+ " : delta < 0 ? "− " : ""}${formatCents(Math.abs(delta))}`}
      </Table.Td>
    </Table.Tr>
  );
}
