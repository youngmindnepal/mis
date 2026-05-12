-- CreateTable
CREATE TABLE "Preadmission" (
    "id" SERIAL NOT NULL,
    "studentName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "email" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referralSource" TEXT,
    "referralName" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "counselorId" INTEGER,

    CONSTRAINT "Preadmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreadmissionDepartment" (
    "id" SERIAL NOT NULL,
    "preadmissionId" INTEGER NOT NULL,
    "departmentId" INTEGER NOT NULL,

    CONSTRAINT "PreadmissionDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreadmissionDepartment_preadmissionId_departmentId_key" ON "PreadmissionDepartment"("preadmissionId", "departmentId");

-- AddForeignKey
ALTER TABLE "Preadmission" ADD CONSTRAINT "Preadmission_counselorId_fkey" FOREIGN KEY ("counselorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreadmissionDepartment" ADD CONSTRAINT "PreadmissionDepartment_preadmissionId_fkey" FOREIGN KEY ("preadmissionId") REFERENCES "Preadmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreadmissionDepartment" ADD CONSTRAINT "PreadmissionDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
