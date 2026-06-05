-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" DATETIME NOT NULL,
    "endDate" DATETIME,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "attachments" TEXT,
    "targetRole" TEXT NOT NULL DEFAULT 'ALL',
    "targetClassIds" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceFreq" TEXT,
    "recurrenceEnd" DATETIME,
    "excludedDates" TEXT,
    "schoolId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("createdAt", "date", "description", "id", "schoolId", "title", "type", "updatedAt") SELECT "createdAt", "date", "description", "id", "schoolId", "title", "type", "updatedAt" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE INDEX "Event_schoolId_idx" ON "Event"("schoolId");
CREATE INDEX "Event_date_idx" ON "Event"("date");
CREATE INDEX "Event_type_idx" ON "Event"("type");
CREATE TABLE "new_Holiday" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "endDate" DATETIME,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "schoolId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Holiday_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Holiday" ("createdAt", "date", "description", "id", "name", "schoolId", "updatedAt") SELECT "createdAt", "date", "description", "id", "name", "schoolId", "updatedAt" FROM "Holiday";
DROP TABLE "Holiday";
ALTER TABLE "new_Holiday" RENAME TO "Holiday";
CREATE INDEX "Holiday_schoolId_idx" ON "Holiday"("schoolId");
CREATE INDEX "Holiday_date_idx" ON "Holiday"("date");
CREATE TABLE "new_MealCalendar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "mealType" TEXT,
    "menu" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SCHOOL',
    "schoolId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MealCalendar_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MealCalendar" ("createdAt", "date", "id", "mealType", "menu", "schoolId", "type", "updatedAt") SELECT "createdAt", "date", "id", "mealType", "menu", "schoolId", "type", "updatedAt" FROM "MealCalendar";
DROP TABLE "MealCalendar";
ALTER TABLE "new_MealCalendar" RENAME TO "MealCalendar";
CREATE INDEX "MealCalendar_schoolId_idx" ON "MealCalendar"("schoolId");
CREATE INDEX "MealCalendar_date_idx" ON "MealCalendar"("date");
CREATE UNIQUE INDEX "MealCalendar_schoolId_date_type_key" ON "MealCalendar"("schoolId", "date", "type");
CREATE TABLE "new_Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "dateOfBirth" DATETIME,
    "gender" TEXT,
    "bloodGroup" TEXT,
    "address" TEXT,
    "photo" TEXT,
    "isDaycare" BOOLEAN NOT NULL DEFAULT false,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT,
    "parentId" TEXT,
    "schoolId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Student_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Student_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Student" ("address", "admissionNumber", "bloodGroup", "classId", "createdAt", "dateOfBirth", "gender", "id", "name", "parentId", "photo", "schoolId", "sectionId", "updatedAt") SELECT "address", "admissionNumber", "bloodGroup", "classId", "createdAt", "dateOfBirth", "gender", "id", "name", "parentId", "photo", "schoolId", "sectionId", "updatedAt" FROM "Student";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE UNIQUE INDEX "Student_admissionNumber_key" ON "Student"("admissionNumber");
CREATE INDEX "Student_schoolId_idx" ON "Student"("schoolId");
CREATE INDEX "Student_classId_idx" ON "Student"("classId");
CREATE INDEX "Student_sectionId_idx" ON "Student"("sectionId");
CREATE INDEX "Student_parentId_idx" ON "Student"("parentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
