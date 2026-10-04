import { ImportForm } from "@/features/import/components/import-form";
import { PageHeader } from "@/components/page-header";
import { fr } from "@/lib/i18n/fr";

export function ImportPage() {
  return (
    <>
      <PageHeader eyebrow={fr.importForm.eyebrow} title={fr.importForm.title} />
      <ImportForm />
    </>
  );
}
