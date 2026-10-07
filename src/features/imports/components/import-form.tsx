import {
  Alert,
  Anchor,
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
import type { AccountType } from "@server/generated/prisma/enums";
import { useState, type SubmitEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { useApartmentOptions } from "@/features/apartments/hooks/use-apartment-options";
import { FormatReview } from "@/features/imports/components/format-review";
import { useDetectCsvFormat } from "@/features/imports/hooks/use-detect-csv-format";
import { useImportStatement } from "@/features/imports/hooks/use-import-statement";
import { appErrorCode, csvErrorMessage, errorMessage } from "@/lib/errors";
import { fr } from "@/lib/i18n/fr";
import type { CsvFormatConfig } from "@shared/csv-format";

// Libellés des types de compte (dictionnaire aligné sur l'enum Prisma), pour le `<Select>`.
const ACCOUNT_TYPE_OPTIONS = (Object.keys(fr.accountTypes) as AccountType[]).map((value) => ({
  value,
  label: fr.accountTypes[value],
}));

// Les navigateurs annoncent un CSV sous plusieurs types MIME (Windows : application/vnd.ms-excel) :
// on filtre donc aussi sur l'extension.
const CSV_ACCEPT = { "text/csv": [".csv"], "application/vnd.ms-excel": [".csv"] };

export function ImportForm() {
  // État des champs : `useState` explicite (≈ `ref()` + `v-model` en Vue). Un input « contrôlé »
  // reçoit `value` et notifie via `onChange`. Le fichier, lui, vient de la Dropzone : on garde
  // seulement le `File` choisi.
  // `?accountType=PROFESSIONAL` (bouton « Importer un relevé pro » de l'écran Pro) : type pré-choisi.
  const [searchParams] = useSearchParams();
  const [accountType, setAccountType] = useState<AccountType | null>(
    ACCOUNT_TYPE_OPTIONS.find((option) => option.value === searchParams.get("accountType"))
      ?.value ?? null,
  );
  // Appartement du relevé (compte « Appartement » seulement) : rattache toutes ses lignes (R11).
  const [apartmentId, setApartmentId] = useState<string | null>(null);
  const apartments = useApartmentOptions();
  const [file, setFile] = useState<File | null>(null);
  const [fileRejected, setFileRejected] = useState(false);
  // Texte du CSV soumis : gardé pour relancer l'import avec le format confirmé (CSV inconnu).
  const [csvText, setCsvText] = useState<string | null>(null);

  const navigate = useNavigate();
  const importStatement = useImportStatement();
  const detectFormat = useDetectCsvFormat();

  // Valeurs dérivées calculées pendant le rendu (≈ `computed`) : pas de `useState` en double.
  const needsApartment = accountType === "APARTMENT";
  const canSubmit =
    accountType !== null && file !== null && (!needsApartment || apartmentId !== null);
  // Aucun format enregistré pour l'en-tête de ce fichier : l'IA le détecte, l'utilisateur confirme.
  // Le panneau de détection reste affiché pendant l'import qui suit la confirmation (sinon il
  // disparaîtrait le temps de la requête), et jusqu'au succès de cet import.
  const unknownFormatError =
    importStatement.isError && appErrorCode(importStatement.error) === "UNKNOWN_CSV_FORMAT";
  const detecting = detectFormat.status !== "idle" && !importStatement.isSuccess;

  // Tout s'est bien passé → direct à la relecture. Sinon on reste ici pour montrer l'avertissement.
  const importOptions = {
    onSuccess: (data: NonNullable<typeof importStatement.data>) => {
      if (
        data.errors.length === 0 &&
        data.duplicateCount === 0 &&
        data.categorizationError === null
      ) {
        void navigate(`/imports/${data.batchId}`);
      }
    },
  };

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); // ≈ `@submit.prevent`
    if (!file || !accountType) return;

    const text = await file.text();
    setCsvText(text);
    importStatement.mutate(
      {
        accountType,
        apartmentId: needsApartment ? apartmentId : null,
        fileName: file.name,
        csvText: text,
      },
      {
        ...importOptions,
        onError: (error) => {
          if (appErrorCode(error) === "UNKNOWN_CSV_FORMAT") detectFormat.mutate({ csvText: text });
        },
      },
    );
  }

  function handleConfirmFormat(format: { name: string; config: CsvFormatConfig }) {
    if (!file || !accountType || csvText === null) return;
    importStatement.mutate(
      {
        accountType,
        apartmentId: needsApartment ? apartmentId : null,
        fileName: file.name,
        csvText,
        format,
      },
      importOptions,
    );
  }

  function handleRetryDetection() {
    if (csvText === null) return;
    detectFormat.reset();
    detectFormat.mutate({ csvText });
  }

  const result = importStatement.data;

  return (
    <Grid gap={16}>
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Paper component="form" withBorder radius="lg" p={28} onSubmit={handleSubmit}>
          <Stack gap={22}>
            <Title order={2}>{fr.importForm.fileTitle}</Title>

            <Dropzone
              onDrop={(files) => {
                setFile(files[0] ?? null);
                setFileRejected(false);
                setCsvText(null);
                importStatement.reset();
                detectFormat.reset();
              }}
              onReject={() => setFileRejected(true)}
              accept={CSV_ACCEPT}
              multiple={false}
              radius="md"
              aria-label={fr.importForm.dropzoneAria}
            >
              <Group gap={14} wrap="nowrap">
                {file ? <IconFileSpreadsheet size={28} /> : <IconUpload size={28} />}
                <div style={{ minWidth: 0 }}>
                  <Text fw={600} truncate>
                    {file ? file.name : fr.importForm.dropHere}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {file
                      ? `${fr.importForm.fileSize(file.size)} · ${fr.importForm.clickToChange}`
                      : fr.importForm.orClickToChoose}
                  </Text>
                </div>
              </Group>
            </Dropzone>
            {fileRejected && (
              <Text size="sm" c="red.4">
                {fr.importForm.notACsv}
              </Text>
            )}

            <Select
              label={fr.importForm.accountType}
              placeholder={fr.importForm.accountTypePlaceholder}
              data={ACCOUNT_TYPE_OPTIONS}
              value={accountType}
              onChange={(value) => setAccountType(value as AccountType | null)}
              allowDeselect={false}
            />

            {needsApartment && (
              <Select
                label={fr.importForm.apartment}
                placeholder={fr.importForm.apartmentPlaceholder}
                description={fr.importForm.apartmentHint}
                inputWrapperOrder={["label", "input", "description"]}
                data={(apartments.data ?? []).map(({ id, name }) => ({ value: id, label: name }))}
                value={apartmentId}
                onChange={setApartmentId}
                allowDeselect={false}
                error={apartments.isSuccess && apartments.data.length === 0}
              />
            )}
            {needsApartment && apartments.isSuccess && apartments.data.length === 0 && (
              <Text size="sm" c="dimmed">
                {fr.importForm.noApartment}{" "}
                <Anchor component={Link} to="/settings?tab=apt" size="sm">
                  {fr.importForm.addApartment}
                </Anchor>
              </Text>
            )}

            <Button type="submit" disabled={!canSubmit} loading={importStatement.isPending}>
              {fr.importForm.submit}
            </Button>
          </Stack>
        </Paper>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 7 }}>
        <Paper withBorder radius="lg" p={28} h="100%">
          <Stack gap={18}>
            <Title order={2}>{fr.importForm.resultTitle}</Title>

            {detecting && detectFormat.isPending && (
              <Group gap={12}>
                <Loader size="sm" />
                <Text c="dimmed">{fr.importForm.detecting}</Text>
              </Group>
            )}

            {detecting && detectFormat.isError && (
              <Alert
                color="red"
                icon={<IconAlertTriangle size={18} />}
                title={fr.importForm.detectionFailedTitle}
              >
                <Stack gap={12}>
                  {errorMessage(detectFormat.error)}
                  <Group>
                    <Button variant="default" onClick={handleRetryDetection}>
                      {fr.importForm.retryDetection}
                    </Button>
                  </Group>
                </Stack>
              </Alert>
            )}

            {detecting && detectFormat.data && (
              <FormatReview
                detection={detectFormat.data}
                isImporting={importStatement.isPending}
                onConfirm={handleConfirmFormat}
                onRetry={handleRetryDetection}
              />
            )}

            {importStatement.isError && !unknownFormatError && (
              <Alert
                color="red"
                icon={<IconAlertTriangle size={18} />}
                title={fr.importForm.importFailed}
              >
                {errorMessage(importStatement.error)}
              </Alert>
            )}

            {!result && !importStatement.isError && !detecting && (
              <Text c="dimmed">{fr.importForm.hint}</Text>
            )}

            {result && (
              <>
                <div>
                  <Text fz={44} fw={600} lh={1} c="gold.6">
                    {result.importedCount}
                  </Text>
                  <Text c="dimmed" mt={6}>
                    {fr.importForm.importedLabel(result.importedCount)}
                  </Text>
                </div>

                {result.duplicateCount > 0 && (
                  <Alert color="blue" title={fr.importForm.duplicateTitle(result.duplicateCount)}>
                    {fr.importForm.duplicateBody}
                  </Alert>
                )}

                {result.categorizationError !== null && (
                  <Alert
                    color="amber"
                    icon={<IconAlertTriangle size={18} />}
                    title={fr.importForm.categorizationFailedTitle}
                  >
                    {fr.importForm.categorizationFailedBody(result.categorizationError)}
                  </Alert>
                )}

                {result.errors.length > 0 && (
                  <Alert
                    color="amber"
                    icon={<IconAlertTriangle size={18} />}
                    title={fr.importForm.ignoredTitle(result.errors.length)}
                  >
                    <Stack gap={4}>
                      {result.errors.map((error) => (
                        <Text key={error.line} size="sm">
                          {fr.importForm.lineError(error.line, csvErrorMessage(error))}
                        </Text>
                      ))}
                    </Stack>
                  </Alert>
                )}

                <Group>
                  <Button component={Link} to={`/imports/${result.batchId}`}>
                    {fr.importForm.reviewImport}
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
