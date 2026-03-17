
'use server';

import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Creates a new System User (Admin or Manager) in both Auth and Firestore.
 */
export async function createSystemUserAction(data: { email: string; password: string; role: 'ADMIN' | 'MANAGER' }) {
  try {
    // 1. Create in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: data.email,
      password: data.password,
      emailVerified: true,
    });

    // 2. Create in Firestore
    await adminDb.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      email: data.email,
      role: data.role,
      createdAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error creating system user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Updates a user's password in Firebase Auth.
 */
export async function updateUserPasswordAction(uid: string, newPassword: string) {
  try {
    await adminAuth.updateUser(uid, {
      password: newPassword,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error updating password:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Deletes a user from both Auth and Firestore.
 */
export async function deleteUserAction(uid: string) {
  try {
    // 1. Delete from Firebase Auth
    await adminAuth.deleteUser(uid);

    // 2. Delete from Firestore
    await adminDb.collection('users').doc(uid).delete();

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return { success: false, error: error.message };
  }
}
