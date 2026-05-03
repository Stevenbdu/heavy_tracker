-- CreateTable
CREATE TABLE "Program" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "programId" INTEGER NOT NULL,

    CONSTRAINT "WorkoutTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "targetSets" INTEGER NOT NULL,
    "targetReps" INTEGER NOT NULL,
    "workoutTemplateId" INTEGER NOT NULL,

    CONSTRAINT "ExerciseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workoutTemplateId" INTEGER NOT NULL,

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoggedExercise" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "workoutSessionId" INTEGER NOT NULL,

    CONSTRAINT "LoggedExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoggedSet" (
    "id" SERIAL NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "targetReps" INTEGER NOT NULL,
    "actualReps" INTEGER,
    "targetWeight" DOUBLE PRECISION NOT NULL,
    "actualWeight" DOUBLE PRECISION,
    "rpe" INTEGER,
    "loggedExerciseId" INTEGER NOT NULL,

    CONSTRAINT "LoggedSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyMetric" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight" DOUBLE PRECISION,
    "chest" DOUBLE PRECISION,
    "armR" DOUBLE PRECISION,
    "armL" DOUBLE PRECISION,

    CONSTRAINT "BodyMetric_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseTemplate" ADD CONSTRAINT "ExerciseTemplate_workoutTemplateId_fkey" FOREIGN KEY ("workoutTemplateId") REFERENCES "WorkoutTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_workoutTemplateId_fkey" FOREIGN KEY ("workoutTemplateId") REFERENCES "WorkoutTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoggedExercise" ADD CONSTRAINT "LoggedExercise_workoutSessionId_fkey" FOREIGN KEY ("workoutSessionId") REFERENCES "WorkoutSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoggedSet" ADD CONSTRAINT "LoggedSet_loggedExerciseId_fkey" FOREIGN KEY ("loggedExerciseId") REFERENCES "LoggedExercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
