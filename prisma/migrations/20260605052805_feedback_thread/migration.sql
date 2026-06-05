/*
  Warnings:

  - Added the required column `referenceNumber` to the `Feedback` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "FeedbackMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feedbackId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeedbackMessage_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FeedbackMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Counter" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceNumber" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "closingNote" TEXT,
    "lastReplyAt" DATETIME,
    "parentSeenAt" DATETIME,
    "reply" TEXT,
    "repliedById" TEXT,
    "schoolId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Feedback_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Feedback_repliedById_fkey" FOREIGN KEY ("repliedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Feedback_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Feedback" ("createdAt", "id", "message", "parentId", "repliedById", "reply", "schoolId", "status", "subject", "updatedAt") SELECT "createdAt", "id", "message", "parentId", "repliedById", "reply", "schoolId", "status", "subject", "updatedAt" FROM "Feedback";
DROP TABLE "Feedback";
ALTER TABLE "new_Feedback" RENAME TO "Feedback";
CREATE UNIQUE INDEX "Feedback_referenceNumber_key" ON "Feedback"("referenceNumber");
CREATE INDEX "Feedback_schoolId_idx" ON "Feedback"("schoolId");
CREATE INDEX "Feedback_parentId_idx" ON "Feedback"("parentId");
CREATE INDEX "Feedback_status_idx" ON "Feedback"("status");
CREATE INDEX "Feedback_schoolId_status_idx" ON "Feedback"("schoolId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "FeedbackMessage_feedbackId_idx" ON "FeedbackMessage"("feedbackId");

-- CreateIndex
CREATE INDEX "FeedbackMessage_senderId_idx" ON "FeedbackMessage"("senderId");
