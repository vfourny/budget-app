import { NumberInput } from '@mantine/core'

import { fr } from '@/lib/i18n/fr'

interface EuroFieldProps {
  allowNegative?: boolean
  /** Centimes : la base stocke des entiers, le champ affiche des euros. */
  cents: number
  description?: string
  label: string
  onChange: (cents: number) => void
}

/** Champ de saisie d'un montant en euros, valeur en centimes entiers. */
export function EuroField({
  label,
  description,
  cents,
  allowNegative,
  onChange,
}: EuroFieldProps) {
  return (
    <NumberInput
      decimalScale={2}
      decimalSeparator=","
      description={description}
      inputWrapperOrder={['label', 'input', 'description']}
      label={label}
      min={allowNegative ? undefined : 0}
      onChange={(value) =>
        onChange(Math.round((typeof value === 'number' ? value : 0) * 100))
      }
      step={10}
      suffix={` ${fr.common.euro}`}
      thousandSeparator=" "
      value={cents / 100}
    />
  )
}
