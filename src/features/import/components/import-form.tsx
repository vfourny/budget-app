import {
  Alert,
  Button,
  Grid,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { IconAlertTriangle, IconFileSpreadsheet, IconUpload } from "@tabler/icons-react";
import { useState, type SubmitEvent } from "react";
import { Link, useNavigate } from "react-router";

import { useBankAccounts } from "@/features/import/hooks/use-bank-accounts";
import { useImportStatement } from "@/features/import/hooks/use-import-statement";

// Les navigateurs annoncent un CSV sous plusieurs types MIME (Windows : application/vnd.ms-excel) :
// on filtre donc aussi sur l'extension.
const CSV_ACCEPT = { "text/csv": [".csv"], "application/vnd.ms-excel": [".csv"] };

function formatFileSize(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

export function ImportForm() {
  // État des champs : `useState` explicite (≈ `ref()` + `v-model` en Vue). Un input « contrôlé »
  // reçoit `value` et notifie via `onChange`. Le fichier, lui, vient de la Dropzone : on garde
  // seulement le `File` choisi.
  const [bankAccountId, setBankAccountId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileRejected, setFileRejected] = useState(false);

  const navigate = useNavigate();
  const bankAccounts = useBankAccounts();
  const importStatement = useImportStatement();

  // Valeurs dérivées calculées pendant le rendu (≈ `computed`) : pas de `useState` en double.
  const selectedAccount = bankAccounts.data?.find((account) => account.id === bankAccountId);
  const canSubmit = selectedAccount !== undefined && file !== null;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); // ≈ `@submit.prevent`
    if (!file || !bankAccountId) return;

    importStatement.mutate(
      { bankAccountId, fileName: file.name, csvText: await file.text() },
      {
        // Tout s'est bien passé → direct à la relecture. Sinon on reste ici pour montrer l'avertissement.
        onSuccess: (data) => {
          if (data.errors.length === 0 && data.categorizationError === null) {
            void navigate(`/imports/${data.batchId}`);
          }
        },
      },
    );
  }

  if (bankAccounts.isPending) return <Loader color="gold" />;
  if (bankAccounts.isError) {
    return <Alert color="red" title="Impossible de charger les comptes." />;
  }

  const result = importStatement.data;

  return (
    <Grid gap={16}>
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Paper component="form" withBorder radius="lg" p={28} onSubmit={handleSubmit}>
          <Stack gap={22}>
            <Title order={2}>Fichier</Title>

            <Dropzone
              onDrop={(files) => {
                setFile(files[0] ?? null);
                setFileRejected(false);
                importStatement.reset();
              }}
              onReject={() => setFileRejected(true)}
              accept={CSV_ACCEPT}
              multiple={false}
              radius="md"
              aria-label="Choisir le relevé CSV"
            >
              <Group gap={14} wrap="nowrap">
                {file ? <IconFileSpreadsheet size={28} /> : <IconUpload size={28} />}
                <div style={{ minWidth: 0 }}>
                  <Text fw={600} truncate>
                    {file ? file.name : "Dépose ton relevé CSV ici"}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {file
                      ? `${formatFileSize(file.size)} · clique pour changer`
                      : "ou clique pour le choisir"}
                  </Text>
                </div>
              </Group>
            </Dropzone>
            {fileRejected && (
              <Text size="sm" c="red.4">
                Ce fichier n'est pas un CSV.
              </Text>
            )}

            <Select
              label="Compte"
              placeholder="Choisir un compte…"
              data={bankAccounts.data.map((account) => ({
                value: account.id,
                label: account.name,
              }))}
              value={bankAccountId || null}
              onChange={(value) => setBankAccountId(value ?? "")}
              allowDeselect={false}
              description={
                selectedAccount?.bank ? `Format de la banque : ${selectedAccount.bank}` : undefined
              }
            />

            <Button type="submit" disabled={!canSubmit} loading={importStatement.isPending}>
              Importer
            </Button>
          </Stack>
        </Paper>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 7 }}>
        <Paper withBorder radius="lg" p={28} h="100%">
          <Stack gap={18}>
            <Title order={2}>Résultat</Title>

            {importStatement.isError && (
              <Alert color="red" icon={<IconAlertTriangle size={18} />} title="Import impossible">
                {importStatement.error.message}
              </Alert>
            )}

            {!result && !importStatement.isError && (
              <Text c="dimmed">
                Choisis un compte et un relevé CSV : les transactions sont importées puis
                catégorisées automatiquement, avant ta relecture.
              </Text>
            )}

            {result && (
              <>
                <div>
                  <Text fz={44} fw={600} lh={1} c="gold.6">
                    {result.importedCount}
                  </Text>
                  <Text c="dimmed" mt={6}>
                    transaction(s) importée(s).
                  </Text>
                </div>

                {result.categorizationError !== null && (
                  <Alert
                    color="amber"
                    icon={<IconAlertTriangle size={18} />}
                    title="Catégorisation automatique impossible"
                  >
                    {result.categorizationError} Les lignes sont importées : tu peux les catégoriser
                    à la main.
                  </Alert>
                )}

                {result.errors.length > 0 && (
                  <Alert
                    color="amber"
                    icon={<IconAlertTriangle size={18} />}
                    title={`${result.errors.length} ligne(s) ignorée(s)`}
                  >
                    <Stack gap={4}>
                      {result.errors.map((error) => (
                        <Text key={error.line} size="sm">
                          Ligne {error.line} : {error.message}
                        </Text>
                      ))}
                    </Stack>
                  </Alert>
                )}

                <Group>
                  <Button component={Link} to={`/imports/${result.batchId}`}>
                    Relire l'import
                  </Button>
                </Group>
              </>
            )}
          </Stack>
        </Paper>
      </Grid.Col>
    </Grid>
  );
}
