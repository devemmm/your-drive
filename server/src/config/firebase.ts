import path from "path";
import { credential } from "firebase-admin";
import { initializeApp } from "firebase-admin/app";
import { getMessaging, Messaging } from "firebase-admin/messaging";

let handleMessaging: Messaging | null = null;

if (process.env.FIREBASE_SERVICE_JSON_PATH) {
  const fcmPath = path.resolve(
    process.cwd(),
    process.env.FIREBASE_SERVICE_JSON_PATH
  );

  const fcmAdmin = initializeApp({
    credential: credential.cert(fcmPath),
  });

  handleMessaging = getMessaging(fcmAdmin);
} else {
  console.warn("Firebase not configured - push notifications disabled.");
}

export { handleMessaging };
