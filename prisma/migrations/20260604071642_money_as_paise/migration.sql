/*
  Warnings:

  - You are about to alter the column `amount` on the `FeePayment` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - You are about to alter the column `totalAmount` on the `FeeStructure` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FeePayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "mode" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "notes" TEXT,
    "collectedById" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FeePayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FeePayment_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FeePayment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_FeePayment" ("amount", "collectedById", "createdAt", "date", "id", "mode", "notes", "receiptNumber", "schoolId", "studentId", "updatedAt") SELECT "amount", "collectedById", "createdAt", "date", "id", "mode", "notes", "receiptNumber", "schoolId", "studentId", "updatedAt" FROM "FeePayment";
DROP TABLE "FeePayment";
ALTER TABLE "new_FeePayment" RENAME TO "FeePayment";
CREATE UNIQUE INDEX "FeePayment_receiptNumber_key" ON "FeePayment"("receiptNumber");
CREATE INDEX "FeePayment_schoolId_idx" ON "FeePayment"("schoolId");
CREATE INDEX "FeePayment_studentId_idx" ON "FeePayment"("studentId");
CREATE INDEX "FeePayment_date_idx" ON "FeePayment"("date");
CREATE INDEX "FeePayment_collectedById_idx" ON "FeePayment"("collectedById");
CREATE TABLE "new_FeeStructure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "description" TEXT,
    "schoolId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FeeStructure_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FeeStructure_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FeeStructure_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_FeeStructure" ("academicYearId", "classId", "createdAt", "description", "id", "schoolId", "totalAmount", "updatedAt") SELECT "academicYearId", "classId", "createdAt", "description", "id", "schoolId", "totalAmount", "updatedAt" FROM "FeeStructure";
DROP TABLE "FeeStructure";
ALTER TABLE "new_FeeStructure" RENAME TO "FeeStructure";
CREATE INDEX "FeeStructure_schoolId_idx" ON "FeeStructure"("schoolId");
CREATE INDEX "FeeStructure_classId_idx" ON "FeeStructure"("classId");
CREATE INDEX "FeeStructure_academicYearId_idx" ON "FeeStructure"("academicYearId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
