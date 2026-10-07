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
import { useApartmentOptions } from "@/features/apartments/hooks/use-apartment-options";
import {
  useImportReview,
  useRunCategorization,
  useSetApartment,
  useSetCategory,
  useValidateImport,
} from "@/features/review/hooks/use-import-review";
import { errorMessage } from "@/lib/errors";
import { formatCents, formatDate } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { isCategoryOf } from "@shared/account-categories";
import type { AccountType, TransactionCategory } from "@server/generated/prisma/enums";

import classes from "./import-review.module.css";

type Filter = "all" | "review";

// Options du sélecteur par type de compte : un relevé pro ne propose que les catégories pro.
// Ordre des options = ordre des clés de `fr.categories` (colonnes du Google Sheet).
const CATEGORY_OPTIONS = Object.fromEntries(
  (Object.keys(fr.accountTypes) as AccountType[]).map((accountType) => [
    accountType,
    (Object.keys(fr.categories) as TransactionCategory[])
      .filter((category) => isCategoryOf(accountType, category))
      .map((category) => ({ value: category, label: fr.categories[category] })),
  ]),
) as Record<AccountType, { value: TransactionCategory; label: string }[]>;

export function ImportReview({ importId }: { importId: string }) {
  const review = useImportReview(importId);
  const setCategory = useSetCategory(importId);
  const setApartment = useSetApartment(importId);
  const apartments = useApartmentOptions();
  const validateImport = useValidateImport(importId);
  const runCategorization = useRunCategorization(importId);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");

  if (review.isPending) return <Loader color="gold" />;
  if (review.isError) return <Alert color="red" title={fr.review.loadFailed} />;

  const batch = review.data;
  const locked = batch.status === "VALIDATED";
  // Colonne « Appartement » : uniquement pour un relevé du compte appartement (R11).
  const showApartment = batch.accountType === "APARTMENT";
  const apartmentOptions = (apartments.data ?? []).map(({ id, name }) => ({
    value: id,
    label: name,
  }));

  // Valeurs dérivées calculées pendant le rendu (≈ `computed`).
  const toReviewCount = batch.transactions.filter((row) => row.needsReview).length;
  const confidentCount = batch.transactions.length - toReviewCount;
  const uncategorizedCount = batch.transactions.filter((row) => row.category === null).length;
  const rows =
    filter === "review" ? batch.transactions.filter((row) => row.needsReview) : batch.transactions;

  return (
    <>
      <Text component={Link} to="/imports" size="sm" c="dimmed" className={classes.back}>
        <IconArrowLeft size={14} /> {fr.review.back}
      </Text>
      <PageHeader
        eyebrow={fr.review.eyebrow(formatDate(batch.createdAt), fr.accountTypes[batch.accountType])}
        title={fr.review.title}
        actions={
          <Group gap={12}>
            <Paper withBorder radius="md" px={18} py={12}>
              <Text fz={26} fw={600} lh={1}>
                {confidentCount}
              </Text>
              <Text size="xs" c="dimmed">
                {fr.review.confidentTile}
              </Text>
            </Paper>
            <Paper radius="md" px={18} py={12} className={classes.alertTile}>
              <Text fz={26} fw={600} lh={1} c="amber.4">
                {toReviewCount}
              </Text>
              <Text size="xs" c="amber.3">
                {fr.review.toReviewTile}
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
              { value: "all", label: fr.review.filterAll(batch.transactions.length) },
              { value: "review", label: fr.review.filterToReview(toReviewCount) },
            ]}
          />
          <Text size="xs" c="dimmed" ff="monospace">
            {batch.fileName}
          </Text>
        </div>

        <Table verticalSpacing="sm" horizontalSpacing="lg">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{fr.common.date}</Table.Th>
              <Table.Th>{fr.common.label}</Table.Th>
              <Table.Th ta="right">{fr.common.amount}</Table.Th>
              <Table.Th>{fr.common.category}</Table.Th>
              {showApartment && <Table.Th>{fr.review.columns.apartment}</Table.Th>}
              <Table.Th ta="right">{fr.review.columns.confidence}</Table.Th>
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
                    aria-label={fr.review.categoryOf(row.label)}
                    placeholder={fr.review.categoryPlaceholder}
                    size="sm"
                    w={210}
                    data={CATEGORY_OPTIONS[batch.accountType]}
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
                  {row.loanMatch && (
                    <Text size="xs" mt={4} c={row.loanMatch.recognized ? "teal.4" : "amber.4"}>
                      {row.loanMatch.recognized
                        ? fr.review.loanMatch.recognized
                        : fr.review.loanMatch.notRecognized(
                            formatCents(row.loanMatch.expectedCents),
                          )}
                    </Text>
                  )}
                </Table.Td>
                {showApartment && (
                  <Table.Td>
                    <Select
                      aria-label={fr.review.apartmentOf(row.label)}
                      placeholder={fr.review.apartmentPlaceholder}
                      size="sm"
                      w={160}
                      data={apartmentOptions}
                      value={row.apartmentId}
                      allowDeselect={false}
                      disabled={locked}
                      onChange={(value) => {
                        if (value) setApartment.mutate({ id: row.id, apartmentId: value });
                      }}
                    />
                  </Table.Td>
                )}
                <Table.Td ta="right">
                  <Group gap={8} justify="flex-end" wrap="nowrap">
                    <ConfidenceBadge
                      category={row.category}
                      confidence={row.categoryConfidence}
                      needsReview={row.needsReview}
                    />
                    {/* Le `Select` ne déclenche pas `onChange` si on re-choisit la même valeur :
                        il faut donc une action dédiée pour confirmer la catégorie proposée par l'IA. */}
                    {row.category !== null && row.needsReview && !locked && (
                      <Button
                        size="compact-xs"
                        variant="light"
                        color="teal"
                        leftSection={<IconCheck size={12} />}
                        loading={setCategory.isPending && setCategory.variables?.id === row.id}
                        onClick={() => setCategory.mutate({ id: row.id, category: row.category! })}
                      >
                        {fr.common.confirm}
                      </Button>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {(setCategory.isError || setApartment.isError) && (
          <Alert color="red" m={16} title={fr.review.correctionFailed} />
        )}

        {(validateImport.isError || runCategorization.isError) && (
          <Alert color="red" m={16} title={fr.review.actionFailed}>
            {errorMessage(validateImport.error ?? runCategorization.error)}
          </Alert>
        )}

        <div className={classes.footer}>
          <Text size="sm" c={toReviewCount > 0 && !locked ? "amber.4" : "dimmed"}>
            {locked
              ? fr.review.lockedNote
              : toReviewCount > 0
                ? fr.review.toReviewNote(toReviewCount)
                : fr.review.doneNote}
          </Text>

          {!locked && (
            <Group gap={12} wrap="nowrap">
              {uncategorizedCount > 0 && (
                <Button
                  variant="default"
                  loading={runCategorization.isPending}
                  onClick={() => runCategorization.mutate({ batchId: importId })}
                >
                  {fr.review.categorizeWithAi}
                </Button>
              )}
              <DeleteImportButton
                importId={importId}
                lineCount={batch.transactions.length}
                variant="button"
                onDeleted={() => void navigate("/imports")}
              />
              <Tooltip
                label={fr.review.validateTooltip(toReviewCount)}
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
                  {fr.review.validate(batch.transactions.length)}
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
        {fr.review.toCategorize}
      </Badge>
    );
  }
  if (confidence === null) {
    return (
      <Badge color="teal" variant="light" leftSection={<IconCheck size={12} />}>
        {fr.review.confirmed}
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
