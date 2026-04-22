/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `license_plans` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "license_plans_name_key" ON "license_plans"("name");
