import { Alert } from "@mantine/core";
import { useParams } from "react-router";

import { ImportReview } from "@/features/review/components/import-review";
import { fr } from "@/lib/i18n/fr";

export function ImportReviewPage() {
  // `useParams` ≈ `useRoute().params` de Vue Router.
  const { importId } = useParams();
  if (!importId) return <Alert color="red" title={fr.errors.IMPORT_NOT_FOUND} />;
  return <ImportReview importId={importId} />;
}
