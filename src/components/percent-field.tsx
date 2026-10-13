import { NumberInput } from '@mantine/core'

import { fr } from '@/lib/i18n/fr'

interface PercentFieldProps {
  /** Points de base : 300 = 3 %. */
  bps: number
  description?: string
  disabled?: boolean
  label: string
  onChange: (bps: number) => void
}

/** Champ en points de base : affiché en pourcentage (300 → 3 %). */
export function PercentField({
  label,
  description,
  bps,
  disabled,
  onChange,
}: PercentFieldProps) {
  return (
    <NumberInput
      decimalScale={2}
      decimalSeparator=","
      description={description}
      disabled={disabled}
      inputWrapperOrder={['label', 'input', 'description']}
      label={label}
      max={100}
      min={0}
      onChange={(value) =>
        onChange(Math.round((typeof value === 'number' ? value : 0) * 100))
      }
      step={0.05}
      suffix={` ${fr.common.percent}`}
      value={bps / 100}
    />
  )
}
