// utils/vehicleDb.ts
import { openDB } from "idb";

const DB_NAME = "VehicleStorage";
const STORE_NAME = "images";

export const getVehicleDB = () =>
  openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    },
  });

export const saveImageToDB = async (file: File) => {
  const db = await getVehicleDB();
  await db.add(STORE_NAME, { file });
};

export const getAllImagesFromDB = async (): Promise<File[]> => {
  const db = await getVehicleDB();
  const all = await db.getAll(STORE_NAME);
  return all.map((entry: any) => entry.file);
};

export const deleteImageFromDB = async (index: number) => {
  const db = await getVehicleDB();
  const keys = await db.getAllKeys(STORE_NAME);
  await db.delete(STORE_NAME, keys[index]);
};

export const clearAllImagesFromDB = async () => {
  const db = await getVehicleDB();
  await db.clear(STORE_NAME);
};
