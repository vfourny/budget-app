import { describe, expect, it } from "vitest";

import { allocateRefunds } from "@server/lib/pro/allocate-refunds";
import { invoiceKey, matchPayments } from "@server/lib/pro/match-payments";

const date = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("matchPayments", () => {
  const clients = [{ clientId: "c1", keyword: "Davidson" }];
  const invoices = [
    { clientId: "c1", year: 2026, month: 8, ttcCents: 1_000_00 },
    { clientId: "c1", year: 2026, month: 9, ttcCents: 1_200_00 },
  ];

  it("pays the oldest invoice first, by keyword (case and accents ignored)", () => {
    const paid = matchPayments(invoices, clients, [
      { date: date("2026-09-26"), label: "VIR DAVIDSON SI NORD", amountCents: 1_000_00 },
      { date: date("2026-10-27"), label: "vir davidsón", amountCents: 500_00 },
      { date: date("2026-10-27"), label: "VIR AUTRE CLIENT", amountCents: 9_999_00 },
    ]);
    expect(paid.get(invoiceKey(invoices[0]))).toBe(1_000_00);
    expect(paid.get(invoiceKey(invoices[1]))).toBe(500_00);
  });

  it("spreads an oversized payment over the next invoices", () => {
    const paid = matchPayments(invoices, clients, [
      { date: date("2026-10-01"), label: "VIR DAVIDSON", amountCents: 2_000_00 },
    ]);
    expect(paid.get(invoiceKey(invoices[0]))).toBe(1_000_00);
    expect(paid.get(invoiceKey(invoices[1]))).toBe(1_000_00);
  });

  it("only pays invoices of earlier months", () => {
    const paid = matchPayments(invoices, clients, [
      { date: date("2026-08-30"), label: "VIR DAVIDSON", amountCents: 3_000_00 },
    ]);
    expect(paid.size).toBe(0);
  });
});

describe("allocateRefunds", () => {
  it("settles lines in order and puts any excess on the last one", () => {
    expect(allocateRefunds(250, [100, 100, 100])).toEqual([100, 100, 50]);
    expect(allocateRefunds(400, [100, 100, 100])).toEqual([100, 100, 200]);
    expect(allocateRefunds(0, [100])).toEqual([0]);
  });
});
