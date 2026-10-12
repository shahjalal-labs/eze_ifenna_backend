import admin from "firebase-admin";
import { serviceAccount } from "../app/routes/serviceAccount";

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as any),
    });
  } catch (e) {
    console.warn("Firebase Admin failed to initialize or missing credentials:", e);
  }
}

export default admin;
