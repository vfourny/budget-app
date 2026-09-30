import { Alert } from "@mantine/core";
import { useParams } from "react-router";

import { ImportReview } from "@/features/review/components/import-review";

export function ImportReviewPage() {
  // `useParams` ≈ `useRoute().params` de Vue Router.
  const { importId } = useParams();
  if (!importId) return <Alert color="red" title="Import introuvable." />;
  return <ImportReview importId={importId} />;
}
