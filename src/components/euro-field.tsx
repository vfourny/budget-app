import { NumberInput } from "@mantine/core";

import { fr } from "@/lib/i18n/fr";

interface EuroFieldProps {
  label: string;
  description?: string;
  /** Centimes : la base stocke des entiers, le champ affiche des euros. */
  cents: number;
  allowNegative?: boolean;
  onChange: (cents: number) => void;
}

/** Champ de saisie d'un montant en euros, valeur en centimes entiers. */
export function EuroField({ label, description, cents, allowNegative, onChange }: EuroFieldProps) {
  return (
    <NumberInput
      label={label}
      description={description}
      inputWrapperOrder={["label", "input", "description"]}
      suffix={` ${fr.common.euro}`}
      thousandSeparator=" "
      decimalSeparator=","
      decimalScale={2}
      min={allowNegative ? undefined : 0}
      step={10}
      value={cents / 100}
      onChange={(value) => onChange(Math.round((typeof value === "number" ? value : 0) * 100))}
    />
  );
}
