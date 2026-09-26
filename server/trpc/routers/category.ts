import { createTRPCRouter, publicProcedure } from "@server/trpc/init";

export const categoryRouter = createTRPCRouter({
  list: publicProcedure.query(({ ctx }) =>
    ctx.db.category.findMany({
      where: { archived: false },
      orderBy: { sortOrder: "asc" },
      select: { id: true, slug: true, name: true, envelope: true },
    }),
  ),
});
