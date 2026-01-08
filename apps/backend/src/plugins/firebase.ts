import fp from "fastify-plugin";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getRemoteConfig } from "firebase-admin/remote-config";

export default fp(async (app: any) => {
  // Firebase Admin app instance
  const firebaseApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_BACKEND_SERVICE_ACCOUNT_project_id,
      privateKey:
        process.env.FIREBASE_BACKEND_SERVICE_ACCOUNT_private_key?.replace(
          /\\n/g,
          "\n"
        ),
      clientEmail: process.env.FIREBASE_BACKEND_SERVICE_ACCOUNT_client_email,
    }),
    projectId: process.env.FIREBASE_BACKEND_SERVICE_ACCOUNT_project_id,
  });

  // Services
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);
  const remoteConfig = getRemoteConfig(firebaseApp); // use ESM import, no require

  if (!auth || !db || !remoteConfig) {
    throw new Error(
      "Failed to initialize Firebase Admin Auth, DB, or Remote Config"
    );
  } else {
    app.log.info("Firebase Admin initialized successfully");
  }

  // Decorate Fastify instance
  app.decorate("firebase", { auth, db, remoteConfig });

  // ID token introspection
  app.decorate("introspectIdToken", async (token: string) => {
    try {
      const authToken = token.startsWith("Bearer ")
        ? token.slice(7).trim()
        : token;
      const decodedToken = await auth.verifyIdToken(authToken);
      const uid = decodedToken.uid;
      const email = decodedToken.email;
      const emailVerified = decodedToken.email_verified || false;

      let plan: any;
      try {
        const userDoc = await db.collection("users").doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData?.plan_id) {
            const planDoc = await db
              .collection("plans")
              .doc(userData.plan_id)
              .get();
            if (planDoc.exists) plan = planDoc.data();
          }
        }
      } catch (error) {
        app.log.warn(
          { error, uid },
          "Failed to fetch user data from Firestore"
        );
      }

      return {
        user: { uid, email, emailVerified, plan },
      };
    } catch (error) {
      throw new Error(
        `Invalid Firebase ID token (${token}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  });
});
