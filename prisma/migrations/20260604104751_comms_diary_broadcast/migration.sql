-- CreateTable
CREATE TABLE "BroadcastRecipient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "broadcastId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BroadcastRecipient_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "BroadcastMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BroadcastRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiaryRead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolDiaryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiaryRead_schoolDiaryId_fkey" FOREIGN KEY ("schoolDiaryId") REFERENCES "SchoolDiary" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiaryRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BroadcastMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentById" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL DEFAULT 'ALL',
    "targetClassId" TEXT,
    "targetLabel" TEXT,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "attachments" TEXT,
    "deletedAt" DATETIME,
    "schoolId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BroadcastMessage_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BroadcastMessage_targetClassId_fkey" FOREIGN KEY ("targetClassId") REFERENCES "Class" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BroadcastMessage_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BroadcastMessage" ("attachments", "createdAt", "id", "message", "schoolId", "sentById", "targetClassId", "targetRole", "title", "updatedAt") SELECT "attachments", "createdAt", "id", "message", "schoolId", "sentById", "targetClassId", "targetRole", "title", "updatedAt" FROM "BroadcastMessage";
DROP TABLE "BroadcastMessage";
ALTER TABLE "new_BroadcastMessage" RENAME TO "BroadcastMessage";
CREATE INDEX "BroadcastMessage_schoolId_idx" ON "BroadcastMessage"("schoolId");
CREATE INDEX "BroadcastMessage_sentById_idx" ON "BroadcastMessage"("sentById");
CREATE INDEX "BroadcastMessage_targetClassId_idx" ON "BroadcastMessage"("targetClassId");
CREATE INDEX "BroadcastMessage_deletedAt_idx" ON "BroadcastMessage"("deletedAt");
CREATE TABLE "new_SchoolDiary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "attachments" TEXT,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT,
    "postedById" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SchoolDiary_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SchoolDiary_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SchoolDiary_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SchoolDiary_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SchoolDiary" ("classId", "content", "createdAt", "date", "id", "postedById", "schoolId", "title", "updatedAt") SELECT "classId", "content", "createdAt", "date", "id", "postedById", "schoolId", "title", "updatedAt" FROM "SchoolDiary";
DROP TABLE "SchoolDiary";
ALTER TABLE "new_SchoolDiary" RENAME TO "SchoolDiary";
CREATE INDEX "SchoolDiary_schoolId_idx" ON "SchoolDiary"("schoolId");
CREATE INDEX "SchoolDiary_classId_idx" ON "SchoolDiary"("classId");
CREATE INDEX "SchoolDiary_sectionId_idx" ON "SchoolDiary"("sectionId");
CREATE INDEX "SchoolDiary_date_idx" ON "SchoolDiary"("date");
CREATE INDEX "SchoolDiary_createdAt_idx" ON "SchoolDiary"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "BroadcastRecipient_userId_readAt_idx" ON "BroadcastRecipient"("userId", "readAt");

-- CreateIndex
CREATE INDEX "BroadcastRecipient_broadcastId_idx" ON "BroadcastRecipient"("broadcastId");

-- CreateIndex
CREATE UNIQUE INDEX "BroadcastRecipient_broadcastId_userId_key" ON "BroadcastRecipient"("broadcastId", "userId");

-- CreateIndex
CREATE INDEX "DiaryRead_userId_idx" ON "DiaryRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DiaryRead_schoolDiaryId_userId_key" ON "DiaryRead"("schoolDiaryId", "userId");
