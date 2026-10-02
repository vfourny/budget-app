import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  Select,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconAlertTriangle, IconArrowLeft, IconCheck } from "@tabler/icons-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { PageHeader } from "@/components/page-header";
import { DeleteImportButton } from "@/features/imports/components/delete-import-button";
import {
  useImportReview,
  useRunCategorization,
  useSetCategory,
  useValidateImport,
} from "@/features/review/hooks/use-import-review";
import { ACCOUNT_TYPE_LABELS } from "@/lib/account-types";
import { TRANSACTION_CATEGORIES, TRANSACTION_CATEGORY_ORDER } from "@/lib/categories";
import { formatCents, formatDate } from "@/lib/format";
import type { TransactionCategory } from "@server/generated/prisma/enums";

import classes from "./import-review.module.css";

type Filter = "all" | "review";

const CATEGORY_OPTIONS = TRANSACTION_CATEGORY_ORDER.map((category) => ({
  value: category,
  label: TRANSACTION_CATEGORIES[category].label,
}));

export function ImportReview({ importId }: { importId: string }) {
  const review = useImportReview(importId);
  const setCategory = useSetCategory(importId);
  const validateImport = useValidateImport(importId);
  const runCategorization = useRunCategorization(importId);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");

  if (review.isPending) return <Loader color="gold" />;
  if (review.isError) return <Alert color="red" title="Impossible de charger cet import." />;

  const batch = review.data;
  const locked = batch.status === "VALIDATED";

  // Valeurs dérivées calculées pendant le rendu (≈ `computed`).
  const toReviewCount = batch.transactions.filter((row) => row.needsReview).length;
  const confidentCount = batch.transactions.length - toReviewCount;
  const uncategorizedCount = batch.transactions.filter((row) => row.category === null).length;
  const rows =
    filter === "review" ? batch.transactions.filter((row) => row.needsReview) : batch.transactions;

  return (
    <>
      <Text component={Link} to="/imports" size="sm" c="dimmed" className={classes.back}>
        <IconArrowLeft size={14} /> Retour aux imports
      </Text>
      <PageHeader
        eyebrow={`Import du ${formatDate(batch.createdAt)} · ${ACCOUNT_TYPE_LABELS[batch.accountType]}`}
        title="Relecture"
        actions={
          <Group gap={12}>
            <Paper withBorder radius="md" px={18} py={12}>
              <Text fz={26} fw={600} lh={1}>
                {confidentCount}
              </Text>
              <Text size="xs" c="dimmed">
                catégorisées avec confiance
              </Text>
            </Paper>
            <Paper radius="md" px={18} py={12} className={classes.alertTile}>
              <Text fz={26} fw={600} lh={1} c="amber.4">
                {toReviewCount}
              </Text>
              <Text size="xs" c="amber.3">
                à vérifier
              </Text>
            </Paper>
          </Group>
        }
      />

      <Paper withBorder radius="lg" className={classes.card}>
        <div className={classes.toolbar}>
          <SegmentedControl
            value={filter}
            onChange={(value) => setFilter(value as Filter)}
            data={[
              { value: "all", label: `Toutes · ${batch.transactions.length}` },
              { value: "review", label: `À vérifier · ${toReviewCount}` },
            ]}
          />
          <Text size="xs" c="dimmed" ff="monospace">
            {batch.fileName}
          </Text>
        </div>

        <Table verticalSpacing="sm" horizontalSpacing="lg">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Libellé</Table.Th>
              <Table.Th ta="right">Montant</Table.Th>
              <Table.Th>Catégorie</Table.Th>
              <Table.Th ta="right">Confiance</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row.id} className={row.needsReview ? classes.lowRow : undefined}>
                <Table.Td c="dimmed">{formatDate(row.date)}</Table.Td>
                <Table.Td>{row.label}</Table.Td>
                <Table.Td ta="right" fw={600} c={row.amountCents > 0 ? "blue.3" : undefined}>
                  {row.amountCents > 0 ? "+" : ""}
                  {formatCents(row.amountCents)}
                </Table.Td>
                <Table.Td>
                  <Select
                    aria-label={`Catégorie de ${row.label}`}
                    placeholder="Choisir…"
                    size="sm"
                    w={210}
                    data={CATEGORY_OPTIONS}
                    value={row.category}
                    allowDeselect={false}
                    disabled={locked}
                    onChange={(value) => {
                      if (value) {
                        setCategory.mutate({ id: row.id, category: value as TransactionCategory });
                      }
                    }}
                    error={row.category === null}
                  />
                </Table.Td>
                <Table.Td ta="right">
                  <ConfidenceBadge
                    category={row.category}
                    confidence={row.categoryConfidence}
                    needsReview={row.needsReview}
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {setCategory.isError && (
          <Alert color="red" m={16} title="La correction n'a pas été enregistrée." />
        )}

        {(validateImport.isError || runCategorization.isError) && (
          <Alert color="red" m={16} title="Action impossible">
            {validateImport.error?.message ?? runCategorization.error?.message}
          </Alert>
        )}

        <div className={classes.footer}>
          <Text size="sm" c={toReviewCount > 0 && !locked ? "amber.4" : "dimmed"}>
            {locked
              ? "Import validé : ses lignes comptent dans les dashboards."
              : toReviewCount > 0
                ? `Choisis une catégorie pour les ${toReviewCount} transactions surlignées avant de valider l'import.`
                : "Tes corrections serviront d'exemples pour les prochaines catégorisations."}
          </Text>

          {!locked && (
            <Group gap={12} wrap="nowrap">
              {uncategorizedCount > 0 && (
                <Button
                  variant="default"
                  loading={runCategorization.isPending}
                  onClick={() => runCategorization.mutate({ batchId: importId })}
                >
                  Catégoriser avec l'IA
                </Button>
              )}
              <DeleteImportButton
                importId={importId}
                lineCount={batch.transactions.length}
                variant="button"
                onDeleted={() => void navigate("/imports")}
              />
              <Tooltip
                label={`Encore ${toReviewCount} transaction${toReviewCount > 1 ? "s" : ""} à catégoriser`}
                disabled={toReviewCount === 0}
              >
                {/* `data-disabled` plutôt que `disabled` : un bouton désactivé n'affiche pas l'infobulle. */}
                <Button
                  data-disabled={toReviewCount > 0 || undefined}
                  loading={validateImport.isPending}
                  onClick={() => {
                    if (toReviewCount > 0) return;
                    validateImport.mutate(
                      { id: importId },
                      { onSuccess: () => void navigate("/imports") },
                    );
                  }}
                >
                  Valider {batch.transactions.length} transactions
                </Button>
              </Tooltip>
            </Group>
          )}
        </div>
      </Paper>
    </>
  );
}

function ConfidenceBadge({
  category,
  confidence,
  needsReview,
}: {
  category: string | null;
  confidence: number | null;
  needsReview: boolean;
}) {
  if (category === null) {
    return (
      <Badge color="amber" variant="light" leftSection={<IconAlertTriangle size={12} />}>
        À catégoriser
      </Badge>
    );
  }
  if (confidence === null) {
    return (
      <Badge color="teal" variant="light" leftSection={<IconCheck size={12} />}>
        Confirmée
      </Badge>
    );
  }
  const label = `${Math.round(confidence * 100)} %`;
  return needsReview ? (
    <Badge color="amber" variant="light" leftSection={<IconAlertTriangle size={12} />}>
      {label}
    </Badge>
  ) : (
    <Badge color="gray" variant="light">
      {label}
    </Badge>
  );
}
