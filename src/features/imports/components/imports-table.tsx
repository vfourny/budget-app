import { Alert, Badge, Loader, Paper, Table, Text } from "@mantine/core";
import { IconFileSpreadsheet } from "@tabler/icons-react";
import { Link } from "react-router";

import { DeleteImportButton } from "@/features/imports/components/delete-import-button";
import { useImports } from "@/features/imports/hooks/use-imports";
import { formatDate } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";

import classes from "./imports-table.module.css";

export function ImportsTable() {
  const imports = useImports();

  if (imports.isPending) return <Loader color="gold" />;
  if (imports.isError) return <Alert color="red" title={fr.imports.loadFailed} />;

  const count = imports.data.length;

  return (
    <Paper withBorder radius="lg" className={classes.card}>
      <div className={classes.header}>
        <Text fw={600}>{fr.imports.count(count)}</Text>
        <Text size="xs" c="dimmed">
          {fr.imports.deleteHint}
        </Text>
      </div>

      {count === 0 ? (
        <Text c="dimmed" p={28}>
          {fr.imports.empty}
        </Text>
      ) : (
        <Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{fr.imports.columns.file}</Table.Th>
              <Table.Th>{fr.imports.columns.account}</Table.Th>
              <Table.Th>{fr.imports.columns.importedOn}</Table.Th>
              <Table.Th ta="right">{fr.imports.columns.lines}</Table.Th>
              <Table.Th>{fr.imports.columns.status}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {imports.data.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>
                  <Link to={`/imports/${item.id}`} className={classes.file}>
                    <IconFileSpreadsheet size={18} />
                    <span>{item.fileName}</span>
                  </Link>
                </Table.Td>
                <Table.Td>{fr.accountTypes[item.accountType]}</Table.Td>
                <Table.Td>{formatDate(item.createdAt)}</Table.Td>
                <Table.Td ta="right" fw={600}>
                  {item.lineCount}
                </Table.Td>
                <Table.Td>
                  {item.status === "VALIDATED" ? (
                    <Badge color="teal" variant="light">
                      {fr.importStatus.VALIDATED}
                    </Badge>
                  ) : (
                    <Badge color="amber" variant="light">
                      {item.toReviewCount > 0
                        ? fr.imports.toReview(item.toReviewCount)
                        : fr.importStatus.PENDING_REVIEW}
                    </Badge>
                  )}
                </Table.Td>
                <Table.Td ta="right">
                  <DeleteImportButton
                    importId={item.id}
                    lineCount={item.lineCount}
                    variant="icon"
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Paper>
  );
}
