-- CreateTable
CREATE TABLE "TuitionBatch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "feeAmount" INTEGER NOT NULL DEFAULT 0,
    "schedule" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tutorId" TEXT,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TuitionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TuitionEnrollment" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TuitionEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TuitionPayment" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mode" TEXT NOT NULL DEFAULT 'CASH',
    "notes" TEXT,
    "collectedById" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TuitionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TuitionBatch_schoolId_idx" ON "TuitionBatch"("schoolId");

-- CreateIndex
CREATE INDEX "TuitionBatch_tutorId_idx" ON "TuitionBatch"("tutorId");

-- CreateIndex
CREATE INDEX "TuitionEnrollment_batchId_idx" ON "TuitionEnrollment"("batchId");

-- CreateIndex
CREATE INDEX "TuitionEnrollment_studentId_idx" ON "TuitionEnrollment"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "TuitionEnrollment_batchId_studentId_key" ON "TuitionEnrollment"("batchId", "studentId");

-- CreateIndex
CREATE INDEX "TuitionPayment_schoolId_idx" ON "TuitionPayment"("schoolId");

-- CreateIndex
CREATE INDEX "TuitionPayment_batchId_idx" ON "TuitionPayment"("batchId");

-- CreateIndex
CREATE INDEX "TuitionPayment_studentId_idx" ON "TuitionPayment"("studentId");

-- AddForeignKey
ALTER TABLE "TuitionBatch" ADD CONSTRAINT "TuitionBatch_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TuitionBatch" ADD CONSTRAINT "TuitionBatch_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TuitionEnrollment" ADD CONSTRAINT "TuitionEnrollment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "TuitionBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TuitionEnrollment" ADD CONSTRAINT "TuitionEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TuitionPayment" ADD CONSTRAINT "TuitionPayment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "TuitionBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TuitionPayment" ADD CONSTRAINT "TuitionPayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TuitionPayment" ADD CONSTRAINT "TuitionPayment_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TuitionPayment" ADD CONSTRAINT "TuitionPayment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
