-- CreateTable
CREATE TABLE "Toddler" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "photo" TEXT,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "allergies" TEXT,
    "medicalNotes" TEXT,
    "notes" TEXT,
    "parentId" TEXT,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Toddler_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Toddler_schoolId_idx" ON "Toddler"("schoolId");

-- CreateIndex
CREATE INDEX "Toddler_parentId_idx" ON "Toddler"("parentId");

-- AddForeignKey
ALTER TABLE "Toddler" ADD CONSTRAINT "Toddler_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Toddler" ADD CONSTRAINT "Toddler_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
