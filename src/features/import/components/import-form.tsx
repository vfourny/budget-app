import { useState, type SubmitEvent } from "react";

import { useBankAccounts } from "@/features/import/hooks/use-bank-accounts";
import { useImportStatement } from "@/features/import/hooks/use-import-statement";

export function ImportForm() {
  // État des champs : `useState` explicite (≈ `ref()` + `v-model` en Vue). Un input « contrôlé »
  // reçoit `value` et notifie via `onChange` ; le fichier, lui, ne peut pas être contrôlé en
  // React (lecture seule), on stocke donc seulement le `File` choisi.
  const [bankAccountId, setBankAccountId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const bankAccounts = useBankAccounts();
  const importStatement = useImportStatement();

  // Valeur dérivée calculée pendant le rendu (≈ `computed`) : pas de `useState` en double.
  const canSubmit = bankAccountId !== "" && file !== null && !importStatement.isPending;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); // ≈ `@submit.prevent`
    if (!file || !bankAccountId) return;

    importStatement.mutate({ bankAccountId, fileName: file.name, csvText: await file.text() });
  }

  if (bankAccounts.isPending) return <p>Chargement des comptes…</p>;
  if (bankAccounts.isError) return <p role="alert">Impossible de charger les comptes.</p>;

  const result = importStatement.data;

  return (
    <section>
      <h2>Importer un relevé</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Compte{" "}
          <select value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)}>
            <option value="">Choisir un compte…</option>
            {bankAccounts.data.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>{" "}
        <label>
          Relevé CSV{" "}
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>{" "}
        <button type="submit" disabled={!canSubmit}>
          {importStatement.isPending ? "Import…" : "Importer"}
        </button>
      </form>

      {importStatement.isError && <p role="alert">{importStatement.error.message}</p>}

      {result && (
        <div>
          <p>
            {result.importedCount} transaction(s) importée(s), en attente de relecture.
            {result.errors.length > 0 && ` ${result.errors.length} ligne(s) ignorée(s) :`}
          </p>
          {result.errors.length > 0 && (
            <ul>
              {result.errors.map((error) => (
                <li key={error.line}>
                  Ligne {error.line} : {error.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
