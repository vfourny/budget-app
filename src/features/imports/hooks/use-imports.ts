import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/lib/trpc";

export function useImports() {
  return useQuery(trpc.import.list.queryOptions());
}
