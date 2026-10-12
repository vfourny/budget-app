import { PageHeader } from '@/components/page-header'
import { ImportForm } from '@/features/imports/components/import-form'
import { fr } from '@/lib/i18n/fr'

export function ImportPage() {
  return (
    <>
      <PageHeader eyebrow={fr.importForm.eyebrow} title={fr.importForm.title} />
      <ImportForm />
    </>
  )
}
