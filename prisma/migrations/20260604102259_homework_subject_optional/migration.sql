-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Homework" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "attachments" TEXT,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT,
    "subjectId" TEXT,
    "assignedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "schoolId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Homework_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Homework_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Homework_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Homework_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Homework_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Homework" ("assignedById", "attachments", "classId", "createdAt", "description", "dueDate", "id", "schoolId", "sectionId", "status", "subjectId", "title", "updatedAt") SELECT "assignedById", "attachments", "classId", "createdAt", "description", "dueDate", "id", "schoolId", "sectionId", "status", "subjectId", "title", "updatedAt" FROM "Homework";
DROP TABLE "Homework";
ALTER TABLE "new_Homework" RENAME TO "Homework";
CREATE INDEX "Homework_schoolId_idx" ON "Homework"("schoolId");
CREATE INDEX "Homework_classId_idx" ON "Homework"("classId");
CREATE INDEX "Homework_sectionId_idx" ON "Homework"("sectionId");
CREATE INDEX "Homework_subjectId_idx" ON "Homework"("subjectId");
CREATE INDEX "Homework_assignedById_idx" ON "Homework"("assignedById");
CREATE INDEX "Homework_dueDate_idx" ON "Homework"("dueDate");
CREATE INDEX "Homework_status_idx" ON "Homework"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
