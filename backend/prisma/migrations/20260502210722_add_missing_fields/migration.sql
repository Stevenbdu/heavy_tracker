-- DropForeignKey
ALTER TABLE "ExerciseTemplate" DROP CONSTRAINT "ExerciseTemplate_workoutTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutTemplate" DROP CONSTRAINT "WorkoutTemplate_programId_fkey";

-- AlterTable
ALTER TABLE "ExerciseTemplate" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "targetWeight" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "WorkoutSession" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'in_progress';

-- AlterTable
ALTER TABLE "WorkoutTemplate" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseTemplate" ADD CONSTRAINT "ExerciseTemplate_workoutTemplateId_fkey" FOREIGN KEY ("workoutTemplateId") REFERENCES "WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
