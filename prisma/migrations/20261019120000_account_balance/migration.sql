-- CreateTable
CREATE TABLE "AccountBalance" (
    "userId" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "year" SMALLINT NOT NULL,
    "month" SMALLINT NOT NULL,
    "balanceCents" INTEGER NOT NULL,

    CONSTRAINT "AccountBalance_pkey" PRIMARY KEY ("userId","accountType","year","month")
);

-- AddForeignKey
ALTER TABLE "AccountBalance" ADD CONSTRAINT "AccountBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
