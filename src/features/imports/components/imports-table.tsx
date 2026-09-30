import { Alert, Badge, Loader, Paper, Table, Text } from "@mantine/core";
import { IconFileSpreadsheet } from "@tabler/icons-react";
import { Link } from "react-router";

import { DeleteImportButton } from "@/features/imports/components/delete-import-button";
import { useImports } from "@/features/imports/hooks/use-imports";
import { ACCOUNT_TYPE_LABELS } from "@/lib/account-types";
import { formatDate } from "@/lib/format";

import classes from "./imports-table.module.css";

export function ImportsTable() {
  const imports = useImports();

  if (imports.isPending) return <Loader color="gold" />;
  if (imports.isError) return <Alert color="red" title="Impossible de charger les imports." />;

  const count = imports.data.length;

  return (
    <Paper withBorder radius="lg" className={classes.card}>
      <div className={classes.header}>
        <Text fw={600}>
          {count} import{count > 1 ? "s" : ""}
        </Text>
        <Text size="xs" c="dimmed">
          Supprimer un import retire aussi ses lignes des vues Perso / Pro
        </Text>
      </div>

      {count === 0 ? (
        <Text c="dimmed" p={28}>
          Aucun import pour le moment.
        </Text>
      ) : (
        <Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Fichier</Table.Th>
              <Table.Th>Compte</Table.Th>
              <Table.Th>Importé le</Table.Th>
              <Table.Th ta="right">Lignes</Table.Th>
              <Table.Th>Statut</Table.Th>
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
                <Table.Td>{ACCOUNT_TYPE_LABELS[item.accountType]}</Table.Td>
                <Table.Td>{formatDate(item.createdAt)}</Table.Td>
                <Table.Td ta="right" fw={600}>
                  {item.lineCount}
                </Table.Td>
                <Table.Td>
                  {item.status === "VALIDATED" ? (
                    <Badge color="teal" variant="light">
                      Terminé
                    </Badge>
                  ) : (
                    <Badge color="amber" variant="light">
                      {item.toReviewCount > 0 ? `${item.toReviewCount} à vérifier` : "À valider"}
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
