import { ImportForm } from "@/features/import/components/import-form";
import { PageHeader } from "@/components/page-header";

export function ImportPage() {
  return (
    <>
      <PageHeader eyebrow="Nouvel import" title="Importer un relevé" />
      <ImportForm />
    </>
  );
}
