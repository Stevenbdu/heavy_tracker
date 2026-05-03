-- DropForeignKey
ALTER TABLE "LoggedExercise" DROP CONSTRAINT "LoggedExercise_workoutSessionId_fkey";

-- DropForeignKey
ALTER TABLE "LoggedSet" DROP CONSTRAINT "LoggedSet_loggedExerciseId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutSession" DROP CONSTRAINT "WorkoutSession_workoutTemplateId_fkey";

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_workoutTemplateId_fkey" FOREIGN KEY ("workoutTemplateId") REFERENCES "WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoggedExercise" ADD CONSTRAINT "LoggedExercise_workoutSessionId_fkey" FOREIGN KEY ("workoutSessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoggedSet" ADD CONSTRAINT "LoggedSet_loggedExerciseId_fkey" FOREIGN KEY ("loggedExerciseId") REFERENCES "LoggedExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
