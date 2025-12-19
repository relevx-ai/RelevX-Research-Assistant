import { RelevxUserProfile } from "core";

export interface FirebaseUserData {
    reference: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>;
    document: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>;
    user: RelevxUserProfile;
}

export async function getUserData(userId: string, db: FirebaseFirestore.Firestore): Promise<FirebaseUserData> {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data() as RelevxUserProfile;
    return {
        reference: userRef,
        document: userDoc,
        user: userData
    };
}