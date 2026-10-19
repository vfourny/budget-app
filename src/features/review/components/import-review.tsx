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
} from '@mantine/core'
import type {
  AccountType,
  TransactionCategory,
} from '@server/generated/prisma/enums'
import { isCategoryOf } from '@shared/transactions/categories'
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCheck,
} from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { PageHeader } from '@/components/page-header'
import { useApartmentOptions } from '@/features/apartments/hooks/use-apartment-options'
import { DeleteImportButton } from '@/features/imports/components/delete-import-button'
import {
  useImportReview,
  useRunCategorization,
  useSetApartment,
  useSetCategory,
  useValidateImport,
} from '@/features/review/hooks/use-import-review'
import { errorMessage } from '@/lib/errors'
import { formatCents, formatDate } from '@/lib/format'
import { fr } from '@/lib/i18n/fr'

import classes from './import-review.module.css'

type Filter = 'all' | 'review'

// Options du sélecteur par type de compte : un relevé pro ne propose que les catégories pro.
// Ordre des options = ordre des clés de `fr.categories` (colonnes du Google Sheet).
const CATEGORY_OPTIONS = Object.fromEntries(
  (Object.keys(fr.accountTypes) as AccountType[]).map((accountType) => [
    accountType,
    (Object.keys(fr.categories) as TransactionCategory[])
      .filter((category) => isCategoryOf(accountType, category))
      .map((category) => ({ value: category, label: fr.categories[category] })),
  ]),
) as Record<AccountType, { value: TransactionCategory; label: string }[]>

export function ImportReview({ importId }: { importId: string }) {
  const review = useImportReview(importId)
  const setCategory = useSetCategory(importId)
  const setApartment = useSetApartment(importId)
  const apartments = useApartmentOptions()
  const validateImport = useValidateImport(importId)
  const runCategorization = useRunCategorization(importId)
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')

  if (review.isPending) return <Loader color="gold" />
  if (review.isError) return <Alert color="red" title={fr.review.loadFailed} />

  const batch = review.data
  const locked = batch.status === 'VALIDATED'
  // Colonne « Appartement » : uniquement pour un relevé du compte appartement (R11).
  const showApartment = batch.accountType === 'APARTMENT'
  const apartmentOptions = (apartments.data ?? []).map(({ id, name }) => ({
    value: id,
    label: name,
  }))

  // Valeurs dérivées calculées pendant le rendu (≈ `computed`).
  const toReviewCount = batch.transactions.filter(
    (row) => row.needsReview,
  ).length
  const confidentCount = batch.transactions.length - toReviewCount
  const uncategorizedCount = batch.transactions.filter(
    (row) => row.category === null,
  ).length
  const rows =
    filter === 'review'
      ? batch.transactions.filter((row) => row.needsReview)
      : batch.transactions

  return (
    <>
      <Text
        c="dimmed"
        className={classes.back}
        component={Link}
        size="sm"
        to="/imports"
      >
        <IconArrowLeft size={14} /> {fr.review.back}
      </Text>
      <PageHeader
        actions={
          <Group gap={12}>
            <Paper px={18} py={12} radius="md" withBorder>
              <Text fw={600} fz={26} lh={1}>
                {confidentCount}
              </Text>
              <Text c="dimmed" size="xs">
                {fr.review.confidentTile}
              </Text>
            </Paper>
            <Paper className={classes.alertTile} px={18} py={12} radius="md">
              <Text c="amber.4" fw={600} fz={26} lh={1}>
                {toReviewCount}
              </Text>
              <Text c="amber.3" size="xs">
                {fr.review.toReviewTile}
              </Text>
            </Paper>
          </Group>
        }
        eyebrow={fr.review.eyebrow(
          formatDate(batch.createdAt),
          fr.accountTypes[batch.accountType],
        )}
        title={fr.review.title}
      />

      <Paper className={classes.card} radius="lg" withBorder>
        <div className={classes.toolbar}>
          <SegmentedControl
            data={[
              {
                value: 'all',
                label: fr.review.filterAll(batch.transactions.length),
              },
              {
                value: 'review',
                label: fr.review.filterToReview(toReviewCount),
              },
            ]}
            onChange={(value) => setFilter(value as Filter)}
            value={filter}
          />
          <Text c="dimmed" ff="monospace" size="xs">
            {batch.fileName}
          </Text>
        </div>

        <Table horizontalSpacing="lg" verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{fr.common.date}</Table.Th>
              <Table.Th>{fr.common.label}</Table.Th>
              <Table.Th ta="right">{fr.common.amount}</Table.Th>
              <Table.Th>{fr.common.category}</Table.Th>
              {showApartment && (
                <Table.Th>{fr.review.columns.apartment}</Table.Th>
              )}
              <Table.Th ta="right">{fr.review.columns.confidence}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr
                className={row.needsReview ? classes.lowRow : undefined}
                key={row.id}
              >
                <Table.Td c="dimmed">{formatDate(row.date)}</Table.Td>
                <Table.Td>{row.label}</Table.Td>
                <Table.Td
                  c={row.amountCents > 0 ? 'blue.3' : undefined}
                  fw={600}
                  ta="right"
                >
                  {row.amountCents > 0 ? '+' : ''}
                  {formatCents(row.amountCents)}
                </Table.Td>
                <Table.Td>
                  <Select
                    allowDeselect={false}
                    aria-label={fr.review.categoryOf(row.label)}
                    data={CATEGORY_OPTIONS[batch.accountType]}
                    disabled={locked}
                    error={row.category === null}
                    onChange={(value) => {
                      if (value) {
                        setCategory.mutate({
                          id: row.id,
                          category: value as TransactionCategory,
                        })
                      }
                    }}
                    placeholder={fr.review.categoryPlaceholder}
                    size="sm"
                    value={row.category}
                    w={210}
                  />
                  {row.loanMatch && (
                    <Text
                      c={row.loanMatch.recognized ? 'teal.4' : 'amber.4'}
                      mt={4}
                      size="xs"
                    >
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
                      allowDeselect={false}
                      aria-label={fr.review.apartmentOf(row.label)}
                      data={apartmentOptions}
                      disabled={locked}
                      onChange={(value) => {
                        if (value)
                          setApartment.mutate({
                            id: row.id,
                            apartmentId: value,
                          })
                      }}
                      placeholder={fr.review.apartmentPlaceholder}
                      size="sm"
                      value={row.apartmentId}
                      w={160}
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
                        color="teal"
                        leftSection={<IconCheck size={12} />}
                        loading={
                          setCategory.isPending &&
                          setCategory.variables?.id === row.id
                        }
                        onClick={() => {
                          if (row.category === null) return
                          setCategory.mutate({
                            id: row.id,
                            category: row.category,
                          })
                        }}
                        size="compact-xs"
                        variant="light"
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
          <Text
            c={toReviewCount > 0 && !locked ? 'amber.4' : 'dimmed'}
            size="sm"
          >
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
                  loading={runCategorization.isPending}
                  onClick={() =>
                    runCategorization.mutate({ batchId: importId })
                  }
                  variant="default"
                >
                  {fr.review.categorizeWithAi}
                </Button>
              )}
              <DeleteImportButton
                importId={importId}
                lineCount={batch.transactions.length}
                onDeleted={() => void navigate('/imports')}
                variant="button"
              />
              <Tooltip
                disabled={toReviewCount === 0}
                label={fr.review.validateTooltip(toReviewCount)}
              >
                {/* `data-disabled` plutôt que `disabled` : un bouton désactivé n'affiche pas l'infobulle. */}
                <Button
                  data-disabled={toReviewCount > 0 || undefined}
                  loading={validateImport.isPending}
                  onClick={() => {
                    if (toReviewCount > 0) return
                    validateImport.mutate(
                      { id: importId },
                      { onSuccess: () => void navigate('/imports') },
                    )
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
  )
}

function ConfidenceBadge({
  category,
  confidence,
  needsReview,
}: {
  category: string | null
  confidence: number | null
  needsReview: boolean
}) {
  if (category === null) {
    return (
      <Badge
        color="amber"
        leftSection={<IconAlertTriangle size={12} />}
        variant="light"
      >
        {fr.review.toCategorize}
      </Badge>
    )
  }
  if (confidence === null) {
    return (
      <Badge color="teal" leftSection={<IconCheck size={12} />} variant="light">
        {fr.review.confirmed}
      </Badge>
    )
  }
  const label = `${Math.round(confidence * 100)} %`
  return needsReview ? (
    <Badge
      color="amber"
      leftSection={<IconAlertTriangle size={12} />}
      variant="light"
    >
      {label}
    </Badge>
  ) : (
    <Badge color="gray" variant="light">
      {label}
    </Badge>
  )
}
