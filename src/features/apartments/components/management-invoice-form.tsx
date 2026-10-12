import { Alert, Button, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { useState } from 'react'

import { EuroField } from '@/components/euro-field'
import { useSetManagementInvoice } from '@/features/apartments/hooks/use-apartments-dashboard'
import { errorMessage } from '@/lib/errors'
import { fr } from '@/lib/i18n/fr'

interface ManagementInvoiceFormProps {
  apartmentId: string
  /** Facture déjà saisie pour ce mois, `null` sinon. */
  invoice: { feesCents: number; extraFeesCents: number } | null
  month: number
  year: number
}

/**
 * Facture de gérance du mois (R12) : le loyer arrive net, les frais ne figurent pas dans le relevé.
 * Elle ne change ni le différentiel ni le solde, seulement la part brut / frais et les rendements.
 * Le parent la remonte avec une `key` (appartement + mois) : le brouillon repart de la facture du mois.
 */
export function ManagementInvoiceForm({
  apartmentId,
  year,
  month,
  invoice,
}: ManagementInvoiceFormProps) {
  const text = fr.apartments.invoice
  const [fees, setFees] = useState(invoice?.feesCents ?? 0)
  const [extraFees, setExtraFees] = useState(invoice?.extraFeesCents ?? 0)
  const save = useSetManagementInvoice()
  const changed =
    invoice === null ||
    fees !== invoice.feesCents ||
    extraFees !== invoice.extraFeesCents

  return (
    <Paper p={16} radius="md" withBorder>
      <Stack gap={12}>
        <div>
          <Group gap={8}>
            <Title order={4}>{text.title}</Title>
            {invoice === null && (
              <Text c="amber.4" size="xs">
                {text.missing}
              </Text>
            )}
          </Group>
          <Text c="dimmed" size="sm">
            {text.description}
          </Text>
        </div>
        <Group align="flex-end" gap={16}>
          <EuroField cents={fees} label={text.fees} onChange={setFees} />
          <EuroField
            cents={extraFees}
            label={text.extraFees}
            onChange={setExtraFees}
          />
          <Button
            disabled={!changed}
            loading={save.isPending}
            onClick={() =>
              save.mutate({
                apartmentId,
                year,
                month,
                feesCents: fees,
                extraFeesCents: extraFees,
              })
            }
          >
            {fr.common.save}
          </Button>
        </Group>
        {save.isError && (
          <Alert color="red" title={text.saveFailed}>
            {errorMessage(save.error)}
          </Alert>
        )}
      </Stack>
    </Paper>
  )
}
