-- AlterTable
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE "Ride"
ADD COLUMN "depLocation" geography(POINT, 4326),
ADD COLUMN "destLocation" geography(POINT, 4326);

