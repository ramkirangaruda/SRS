/*
  Warnings:

  - Added the required column `uploadedById` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ELearningCategory" ADD COLUMN "color" TEXT;
ALTER TABLE "ELearningCategory" ADD COLUMN "description" TEXT;
ALTER TABLE "ELearningCategory" ADD COLUMN "icon" TEXT;

-- AlterTable
ALTER TABLE "GalleryAlbum" ADD COLUMN "date" DATETIME;

-- AlterTable
ALTER TABLE "GalleryImage" ADD COLUMN "thumbUrl" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Assignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATETIME NOT NULL,
    "fileUrl" TEXT,
    "attachments" TEXT,
    "totalMarks" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "categoryId" TEXT,
    "classId" TEXT,
    "sectionId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Assignment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ELearningCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Assignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Assignment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Assignment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Assignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Assignment" ("categoryId", "classId", "createdAt", "description", "dueDate", "fileUrl", "id", "schoolId", "title", "updatedAt", "uploadedById") SELECT "categoryId", "classId", "createdAt", "description", "dueDate", "fileUrl", "id", "schoolId", "title", "updatedAt", "uploadedById" FROM "Assignment";
DROP TABLE "Assignment";
ALTER TABLE "new_Assignment" RENAME TO "Assignment";
CREATE INDEX "Assignment_schoolId_idx" ON "Assignment"("schoolId");
CREATE INDEX "Assignment_categoryId_idx" ON "Assignment"("categoryId");
CREATE INDEX "Assignment_classId_idx" ON "Assignment"("classId");
CREATE INDEX "Assignment_uploadedById_idx" ON "Assignment"("uploadedById");
CREATE INDEX "Assignment_dueDate_idx" ON "Assignment"("dueDate");
CREATE INDEX "Assignment_status_idx" ON "Assignment"("status");
CREATE TABLE "new_Tutorial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'LINK',
    "videoUrl" TEXT,
    "embedUrl" TEXT,
    "linkUrl" TEXT,
    "fileUrl" TEXT,
    "categoryId" TEXT,
    "classId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tutorial_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ELearningCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tutorial_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tutorial_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Tutorial_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Tutorial" ("categoryId", "classId", "createdAt", "description", "fileUrl", "id", "schoolId", "title", "updatedAt", "uploadedById", "videoUrl") SELECT "categoryId", "classId", "createdAt", "description", "fileUrl", "id", "schoolId", "title", "updatedAt", "uploadedById", "videoUrl" FROM "Tutorial";
DROP TABLE "Tutorial";
ALTER TABLE "new_Tutorial" RENAME TO "Tutorial";
CREATE INDEX "Tutorial_schoolId_idx" ON "Tutorial"("schoolId");
CREATE INDEX "Tutorial_categoryId_idx" ON "Tutorial"("categoryId");
CREATE INDEX "Tutorial_classId_idx" ON "Tutorial"("classId");
CREATE INDEX "Tutorial_uploadedById_idx" ON "Tutorial"("uploadedById");
CREATE TABLE "new_Video" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL DEFAULT 'YOUTUBE',
    "videoUrl" TEXT NOT NULL,
    "embedUrl" TEXT,
    "thumbnailUrl" TEXT,
    "duration" TEXT,
    "category" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "targetRole" TEXT NOT NULL DEFAULT 'ALL',
    "targetClassIds" TEXT,
    "uploadedById" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Video_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Video_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Video" ("createdAt", "description", "id", "schoolId", "thumbnailUrl", "title", "updatedAt", "videoUrl") SELECT "createdAt", "description", "id", "schoolId", "thumbnailUrl", "title", "updatedAt", "videoUrl" FROM "Video";
DROP TABLE "Video";
ALTER TABLE "new_Video" RENAME TO "Video";
CREATE INDEX "Video_schoolId_idx" ON "Video"("schoolId");
CREATE INDEX "Video_uploadedById_idx" ON "Video"("uploadedById");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
