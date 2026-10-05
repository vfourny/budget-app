import { Badge, Group, Paper, SegmentedControl, Table, Text, UnstyledButton } from "@mantine/core";
import { useState } from "react";

import { isToCheck } from "@shared/budget-rules";
import { formatCents, formatDate } from "@/lib/format";
import { LOCALE, fr } from "@/lib/i18n/fr";
import type { TransactionCategory } from "@server/generated/prisma/enums";

import classes from "./transactions-table.module.css";

export interface TransactionRow {
  id: string;
  date: Date;
  label: string;
  /** Centimes, signé : négatif = débit. */
  amountCents: number;
  category: TransactionCategory | null;
}

type SortKey = "date" | "label" | "category" | "amount";
type Filter = "all" | "credits" | "debits" | "toCheck";

const categoryLabel = (row: TransactionRow) => (row.category ? fr.categories[row.category] : "");

const COMPARATORS = {
  date: (a, b) => a.date.getTime() - b.date.getTime(),
  label: (a, b) => a.label.localeCompare(b.label, LOCALE),
  category: (a, b) => categoryLabel(a).localeCompare(categoryLabel(b), LOCALE),
  amount: (a, b) => a.amountCents - b.amountCents,
} as const satisfies Record<SortKey, (a: TransactionRow, b: TransactionRow) => number>;

const FILTERS = {
  all: () => true,
  credits: (row) => row.amountCents > 0,
  debits: (row) => row.amountCents < 0,
  toCheck: (row) => isToCheck(row.category),
} as const satisfies Record<Filter, (row: TransactionRow) => boolean>;

const COLUMNS = [
  { key: "date", label: fr.common.date },
  { key: "label", label: fr.common.label },
  { key: "category", label: fr.common.category },
  { key: "amount", label: fr.common.amount },
] as const satisfies { key: SortKey; label: string }[];

/** 1er clic sur une colonne : dates et montants du plus grand au plus petit, textes de A à Z. */
const FIRST_DIRECTION = {
  date: "desc",
  label: "asc",
  category: "asc",
  amount: "desc",
} as const satisfies Record<SortKey, "asc" | "desc">;

interface TransactionsTableProps {
  transactions: readonly TransactionRow[];
  /** Message quand il n'y a aucune transaction (défaut : « Aucune transaction pour ce mois. »). */
  emptyText?: string;
}

/**
 * Tableau « Transactions du mois », identique en Perso et en Pro : résumé (nombre, crédits,
 * débits), filtres avec compteurs, tri par colonne, badge « À vérifier » (`isToCheck`, budget-rules).
 * `id="transactions"` : cible de l'ancre « Transactions (N) » de l'en-tête Pro.
 */
export function TransactionsTable({ transactions, emptyText }: TransactionsTableProps) {
  // Tri et filtre locaux à l'écran (≈ deux `ref()` Vue) : rien à partager avec d'autres composants.
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "date",
    dir: "desc",
  });
  const [filter, setFilter] = useState<Filter>("all");

  // Valeurs dérivées pendant le rendu (≈ `computed`).
  const counts = {
    all: transactions.length,
    credits: transactions.filter(FILTERS.credits).length,
    debits: transactions.filter(FILTERS.debits).length,
    toCheck: transactions.filter(FILTERS.toCheck).length,
  } satisfies Record<Filter, number>;
  const creditsCents = transactions.reduce((sum, row) => sum + Math.max(0, row.amountCents), 0);
  const debitsCents = transactions.reduce((sum, row) => sum + Math.max(0, -row.amountCents), 0);
  const rows = transactions.filter(FILTERS[filter]).sort((a, b) => {
    const result = COMPARATORS[sort.key](a, b);
    return sort.dir === "asc" ? result : -result;
  });

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,
      dir: current.key === key ? (current.dir === "asc" ? "desc" : "asc") : FIRST_DIRECTION[key],
    }));
  }

  return (
    <Paper id="transactions" component="section" withBorder radius="lg" className={classes.card}>
      <div className={classes.header}>
        <Group justify="space-between" align="baseline" gap={8}>
          <Text fw={600}>{fr.transactions.title}</Text>
          {transactions.length > 0 && (
            <Text size="sm" c="dimmed">
              {fr.transactions.summary(
                transactions.length,
                formatCents(creditsCents),
                formatCents(debitsCents),
              )}
            </Text>
          )}
        </Group>
        {transactions.length > 0 && (
          <SegmentedControl
            mt={12}
            size="xs"
            aria-label={fr.transactions.filtersAria}
            value={filter}
            onChange={(value) => setFilter(value as Filter)}
            data={(Object.keys(FILTERS) as Filter[]).map((key) => ({
              value: key,
              label: fr.transactions.filters[key](counts[key]),
            }))}
          />
        )}
      </div>
      {rows.length === 0 ? (
        <Text c="dimmed" p={28}>
          {transactions.length === 0
            ? (emptyText ?? fr.transactions.empty)
            : fr.transactions.emptyFilter}
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={560}>
          <Table verticalSpacing="sm" horizontalSpacing="lg">
            <Table.Thead>
              <Table.Tr>
                {COLUMNS.map((column) => (
                  <Table.Th key={column.key} ta={column.key === "amount" ? "right" : undefined}>
                    <UnstyledButton fw={700} fz="inherit" onClick={() => toggleSort(column.key)}>
                      {column.label}
                      {sort.key === column.key && (sort.dir === "asc" ? " ↑" : " ↓")}
                    </UnstyledButton>
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row) => (
                <Table.Tr key={row.id}>
                  <Table.Td c="dimmed" className={classes.nowrap}>
                    {formatDate(row.date)}
                  </Table.Td>
                  <Table.Td>{row.label}</Table.Td>
                  <Table.Td>
                    <Group gap={6} wrap="nowrap">
                      <Badge color="gray" variant="light" className={classes.badge}>
                        {categoryLabel(row) || fr.common.noCategory}
                      </Badge>
                      {isToCheck(row.category) && (
                        <Badge color="amber" variant="light" className={classes.badge}>
                          {fr.transactions.toCheck}
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td
                    ta="right"
                    fw={600}
                    c={row.amountCents > 0 ? "teal.4" : undefined}
                    className={classes.nowrap}
                  >
                    {row.amountCents > 0 ? "+ " : "− "}
                    {formatCents(Math.abs(row.amountCents))}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Paper>
  );
}
