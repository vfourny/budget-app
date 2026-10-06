import { Alert, Button, Group, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useState } from "react";

import { formatCents, formatDate } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { RouterOutputs } from "@/lib/trpc";
import type { CsvFormatConfig } from "@shared/csv-format";

type Detection = RouterOutputs["import"]["detectFormat"];

interface FormatReviewProps {
  detection: Detection;
  isImporting: boolean;
  onConfirm: (format: { name: string; config: CsvFormatConfig }) => void;
  onRetry: () => void;
}

/** Format de colonnes détecté par l'IA : mapping lisible + aperçu des premières lignes lues, à
 * confirmer avant d'importer (le format n'est enregistré qu'à la confirmation). */
export function FormatReview({ detection, isImporting, onConfirm, onRetry }: FormatReviewProps) {
  // Champ contrôlé (≈ `v-model`) : pré-rempli avec le nom de banque deviné par l'IA.
  const [name, setName] = useState(detection.bankName);
  const { config, columns, checks } = detection;

  // Titre de la colonne si le fichier a un en-tête, sinon « Colonne N » (index affiché à partir de 1).
  const columnName = (index: number) =>
    (config.hasHeader ? columns[index] : undefined) || fr.importForm.columnN(index + 1);

  const mapping = [
    {
      key: "date",
      label: fr.importForm.mappingFields.date,
      value: fr.importForm.mappingDate(
        columnName(config.dateColumn),
        fr.importForm.dateFormats[config.dateFormat],
      ),
    },
    {
      key: "label",
      label: fr.importForm.mappingFields.label,
      value: config.labelColumns.map(columnName).join(fr.importForm.mappingJoin),
    },
    {
      key: "amount",
      label: fr.importForm.mappingFields.amount,
      value:
        config.amount.kind === "signed"
          ? columnName(config.amount.column)
          : fr.importForm.mappingDebitCredit(
              columnName(config.amount.debit),
              columnName(config.amount.credit),
            ),
    },
    {
      key: "decimal",
      label: fr.importForm.mappingFields.decimal,
      value: fr.importForm.decimalSeparatorNames[config.decimalSeparator],
    },
  ];

  const canConfirm = !checks.includes("NO_TRANSACTIONS");

  return (
    <Stack gap={18}>
      <div>
        <Title order={3}>{fr.importForm.formatTitle}</Title>
        <Text c="dimmed" size="sm" mt={4}>
          {fr.importForm.formatIntro}
        </Text>
      </div>

      <Table withRowBorders>
        <Table.Tbody>
          {mapping.map((row) => (
            <Table.Tr key={row.key}>
              <Table.Td c="dimmed">{row.label}</Table.Td>
              <Table.Td>{row.value}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <div>
        <Text fw={600} mb={6}>
          {fr.importForm.previewTitle(detection.transactionCount)}
        </Text>
        <Table withRowBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{fr.importForm.previewColumns.date}</Table.Th>
              <Table.Th>{fr.importForm.previewColumns.label}</Table.Th>
              <Table.Th ta="right">{fr.importForm.previewColumns.amount}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {detection.preview.map((transaction, index) => (
              <Table.Tr key={index}>
                <Table.Td>{formatDate(transaction.date)}</Table.Td>
                <Table.Td>{transaction.label}</Table.Td>
                <Table.Td ta="right">{formatCents(transaction.amountCents)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </div>

      {checks.map((code) => (
        <Alert
          key={code}
          color={code === "NO_TRANSACTIONS" ? "red" : "amber"}
          icon={<IconAlertTriangle size={18} />}
        >
          {fr.importForm.formatChecks[code]}
        </Alert>
      ))}

      <TextInput
        label={fr.importForm.formatName}
        description={fr.importForm.formatNameDescription}
        value={name}
        maxLength={60}
        onChange={(event) => setName(event.currentTarget.value)}
      />

      <Group>
        <Button
          loading={isImporting}
          disabled={!canConfirm}
          onClick={() =>
            onConfirm({ name: name.trim() || fr.importForm.defaultFormatName, config })
          }
        >
          {fr.importForm.confirmFormat}
        </Button>
        <Button variant="default" onClick={onRetry} disabled={isImporting}>
          {fr.importForm.retryDetection}
        </Button>
      </Group>
    </Stack>
  );
}
