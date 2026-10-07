import { Table, Text } from "@mantine/core";
import { Fragment } from "react";

import { formatCents } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { ApartmentLines } from "@server/lib/apartments/types";
import type { RouterOutputs } from "@/lib/trpc";

type ApartmentView = RouterOutputs["apartmentDashboard"]["month"]["apartments"][number];
type Column = ApartmentView["forecast"];

/** `+1` : un montant plus élevé est favorable (loyer, solde) ; `-1` : plus bas est favorable (charge, crédit). */
type Sign = 1 | -1;

interface Row {
  key: string;
  label: string;
  sub?: string;
  forecast: number;
  /** `null` = pas de réalisé (mois à venir). */
  actual: number | null;
  sign: Sign;
  total?: boolean;
}

interface Section {
  key: keyof typeof fr.apartments.table.sections;
  rows: Row[];
}

const text = fr.apartments.table;

/** Montant nul = « — » (R2) ; sinon en euros. */
const money = (cents: number) => (cents === 0 ? "—" : formatCents(cents));

function line(
  key: keyof ApartmentLines,
  label: string,
  sign: Sign,
  forecast: Column,
  actual: Column | null,
  sub?: string,
): Row {
  return {
    key,
    label,
    sub,
    forecast: forecast.lines[key],
    actual: actual ? actual.lines[key] : null,
    sign,
  };
}

/** Sections du tableau (R2) : solde, loyers, crédit (si prêt), charges fixes, annuelles (si le mois en contient), autres. */
function sectionsOf(apartment: ApartmentView): Section[] {
  const { forecast, actual } = apartment;
  const rows = text.rows;
  const managed = apartment.managerName !== null;
  const hasAnnual = (["propertyTax", "cfe"] as const).some(
    (key) => forecast.lines[key] !== 0 || (actual?.lines[key] ?? 0) !== 0,
  );

  const sections: Section[] = [
    {
      key: "balance",
      rows: [
        {
          key: "openingBalance",
          label: rows.openingBalance,
          forecast: forecast.openingBalanceCents,
          actual: actual ? actual.openingBalanceCents : null,
          sign: 1,
        },
        {
          key: "differential",
          label: rows.differential,
          forecast: forecast.differentialCents,
          actual: actual ? actual.differentialCents : null,
          sign: 1,
        },
        line("ownerContribution", rows.ownerContribution, 1, forecast, actual),
        {
          key: "closingBalance",
          label: rows.closingBalance,
          forecast: forecast.closingBalanceCents,
          actual: actual ? actual.closingBalanceCents : null,
          sign: 1,
          total: true,
        },
      ],
    },
    {
      key: "rent",
      rows: [
        line("grossRent", rows.grossRent, 1, forecast, actual, rows.grossRentSub),
        ...(managed
          ? [
              line("managementFees", rows.managementFees, -1, forecast, actual),
              line("extraManagementFees", rows.extraManagementFees, -1, forecast, actual),
            ]
          : []),
      ],
    },
  ];

  if (apartment.capital !== null) {
    sections.push({
      key: "credit",
      rows: [
        line("loanCapital", rows.loanCapital, -1, forecast, actual),
        line("loanInterest", rows.loanInterest, -1, forecast, actual),
        line("loanInsurance", rows.loanInsurance, -1, forecast, actual),
        {
          key: "loanTotal",
          label: rows.loanTotal,
          forecast: forecast.loanTotalCents,
          actual: actual ? actual.loanTotalCents : null,
          sign: -1,
          total: true,
        },
        {
          key: "effort",
          label: rows.effort,
          forecast: forecast.effortCents,
          actual: actual ? actual.effortCents : null,
          sign: -1,
        },
      ],
    });
  }

  sections.push({
    key: "fixed",
    rows: [
      line("electricity", rows.electricity, -1, forecast, actual),
      line("homeInsurance", rows.homeInsurance, -1, forecast, actual),
      line("internetBox", rows.internetBox, -1, forecast, actual),
      line("condoFees", rows.condoFees, -1, forecast, actual),
    ],
  });
  if (hasAnnual) {
    sections.push({
      key: "annual",
      rows: [
        line("propertyTax", rows.propertyTax, -1, forecast, actual),
        line("cfe", rows.cfe, -1, forecast, actual),
      ],
    });
  }
  sections.push({
    key: "other",
    rows: [
      line("bankFees", rows.bankFees, -1, forecast, actual),
      line("regularization", rows.regularization, -1, forecast, actual),
      line("other", rows.other, -1, forecast, actual),
    ],
  });
  return sections;
}

/**
 * Tableau Prévisionnel / Réalisé / Écart d'un appartement (R2). Écart = réalisé − prévisionnel sur
 * des montants signés : défavorable en rouge, favorable en vert, nul « — » (R5).
 */
export function ApartmentTable({ apartment }: { apartment: ApartmentView }) {
  return (
    <Table.ScrollContainer minWidth={560}>
      <Table verticalSpacing="xs" horizontalSpacing="md" aria-label={text.aria(apartment.name)}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{text.columns.line}</Table.Th>
            <Table.Th ta="right">{text.columns.forecast}</Table.Th>
            <Table.Th ta="right">{text.columns.actual}</Table.Th>
            <Table.Th ta="right">{text.columns.delta}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sectionsOf(apartment).map((section) => (
            <Fragment key={section.key}>
              <Table.Tr>
                <Table.Th colSpan={4} scope="colgroup" c="gold.6" fz="xs" tt="uppercase" pt={16}>
                  {text.sections[section.key]}
                </Table.Th>
              </Table.Tr>
              {section.rows.map((row) => (
                <TableLine key={row.key} row={row} />
              ))}
            </Fragment>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function TableLine({ row }: { row: Row }) {
  const bold = row.total ? 700 : undefined;
  // Écart signé : négatif = défavorable (rouge), positif = favorable (vert).
  const delta = row.actual === null ? null : row.sign * (row.actual - row.forecast);

  return (
    <Table.Tr>
      <Table.Th scope="row" fw={bold ?? 400}>
        <Text span size="sm" fw={bold}>
          {row.label}
        </Text>
        {row.sub && (
          <Text span size="xs" c="dimmed" ml={6}>
            · {row.sub}
          </Text>
        )}
      </Table.Th>
      <Table.Td ta="right" c="dimmed" fw={bold} style={{ whiteSpace: "nowrap" }}>
        {money(row.forecast)}
      </Table.Td>
      <Table.Td ta="right" fw={bold ?? 600} style={{ whiteSpace: "nowrap" }}>
        {row.actual === null ? "—" : money(row.actual)}
      </Table.Td>
      <Table.Td
        ta="right"
        fw={bold}
        style={{ whiteSpace: "nowrap" }}
        c={delta === null || delta === 0 ? "dimmed" : delta > 0 ? "teal.4" : "red.4"}
      >
        {delta === null || delta === 0
          ? "—"
          : `${delta > 0 ? "+ " : "− "}${formatCents(Math.abs(delta))}`}
      </Table.Td>
    </Table.Tr>
  );
}
