import { Button } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { Link } from 'react-router'

import { PageHeader } from '@/components/page-header'
import { ImportsTable } from '@/features/imports/components/imports-table'
import { fr } from '@/lib/i18n/fr'

export function ImportsPage() {
  return (
    <>
      <PageHeader
        actions={
          <Button
            component={Link}
            leftSection={<IconPlus size={16} />}
            to="/imports/new"
          >
            {fr.imports.newImport}
          </Button>
        }
        eyebrow={fr.imports.eyebrow}
        title={fr.imports.title}
      />
      <ImportsTable />
    </>
  )
}
