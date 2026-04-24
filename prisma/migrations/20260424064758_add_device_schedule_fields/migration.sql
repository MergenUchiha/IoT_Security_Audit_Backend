-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "scheduleCron" TEXT,
ADD COLUMN     "scheduleEmail" TEXT,
ADD COLUMN     "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scheduleLastRun" TIMESTAMP(3);
