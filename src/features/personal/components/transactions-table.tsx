import { Badge, Paper, Table, Text, UnstyledButton } from "@mantine/core";
import { useState } from "react";

import { TRANSACTION_CATEGORIES } from "@/lib/categories";
import { formatCents, formatDate } from "@/lib/format";
import type { TransactionCategory } from "@server/generated/prisma/enums";

interface TransactionRow {
  id: string;
  date: Date;
  label: string;
  amountCents: number;
  category: TransactionCategory | null;
}

type SortKey = "date" | "label" | "category" | "amount";

const categoryLabel = (row: TransactionRow) =>
  row.category ? TRANSACTION_CATEGORIES[row.category].label : "";

const COMPARATORS = {
  date: (a, b) => a.date.getTime() - b.date.getTime(),
  label: (a, b) => a.label.localeCompare(b.label),
  category: (a, b) => categoryLabel(a).localeCompare(categoryLabel(b)),
  amount: (a, b) => a.amountCents - b.amountCents,
} as const satisfies Record<SortKey, (a: TransactionRow, b: TransactionRow) => number>;

const COLUMNS = [
  { key: "date", label: "Date" },
  { key: "label", label: "Libellé" },
  { key: "category", label: "Catégorie" },
  { key: "amount", label: "Montant" },
] as const satisfies { key: SortKey; label: string }[];

export function TransactionsTable({ transactions }: { transactions: readonly TransactionRow[] }) {
  // Tri local : clic sur un en-tête pour trier, re-clic pour inverser (défaut : date décroissante).
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "date",
    dir: "desc",
  });

  const rows = [...transactions].sort((a, b) => {
    const result = COMPARATORS[sort.key](a, b);
    return sort.dir === "asc" ? result : -result;
  });

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,
      dir: current.key === key && current.dir === "asc" ? "desc" : "asc",
    }));
  }

  return (
    <Paper withBorder radius="lg" mb={16} style={{ overflow: "hidden" }}>
      <Text fw={600} p="20px 24px" style={{ borderBottom: "1px solid var(--app-border)" }}>
        Transactions{" "}
        <Text span c="dimmed" fw={400}>
          · {transactions.length}
        </Text>
      </Text>
      {rows.length === 0 ? (
        <Text c="dimmed" p={28}>
          Aucune transaction pour ce mois.
        </Text>
      ) : (
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
                <Table.Td c="dimmed">{formatDate(row.date)}</Table.Td>
                <Table.Td>{row.label}</Table.Td>
                <Table.Td>
                  <Badge color="gray" variant="light">
                    {categoryLabel(row) || "—"}
                  </Badge>
                </Table.Td>
                <Table.Td ta="right" fw={600} c={row.amountCents > 0 ? "blue.3" : undefined}>
                  {row.amountCents > 0 ? "+" : ""}
                  {formatCents(row.amountCents)}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Paper>
  );
}
