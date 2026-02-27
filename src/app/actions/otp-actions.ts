
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Generates a 6-digit OTP and stores it in Firestore.
 * In a real app, this would also send an actual email.
 */
export async function generateAndSendOtpAction(email: string) {
  try {
    // 1. Check for recent OTP to prevent spam (limit to 60 seconds)
    const recentOtpQuery = await adminDb.collection('emailOtps')
      .where('email', '==', email)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (!recentOtpQuery.empty) {
      const lastOtp = recentOtpQuery.docs[0].data();
      const lastCreated = lastOtp.createdAt.toDate().getTime();
      const now = Date.now();
      if (now - lastCreated < 60000) {
        throw new Error('Please wait 60 seconds before requesting a new OTP.');
      }
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60000); // 5 minutes expiry

    // 3. Store in Firestore
    await adminDb.collection('emailOtps').add({
      email,
      otp,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(expiresAt),
    });

    // 4. Simulate sending email
    console.log(`[OTP DEBUG] Sent OTP ${otp} to ${email}`);
    
    // In this MVP, we return the OTP so it can be shown in a toast for testing purposes
    // since we don't have a real mail server configured.
    return { success: true, message: 'OTP sent to your email.', otp };
  } catch (error: any) {
    console.error('Error generating OTP:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verifies the OTP provided by the user.
 */
export async function verifyOtpAction(email: string, otp: string) {
  try {
    const otpQuery = await adminDb.collection('emailOtps')
      .where('email', '==', email)
      .where('otp', '==', otp)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (otpQuery.empty) {
      throw new Error('Invalid OTP code. Please try again.');
    }

    const otpDoc = otpQuery.docs[0];
    const otpData = otpDoc.data();

    // Check expiry
    if (otpData.expiresAt.toDate() < new Date()) {
      await adminDb.collection('emailOtps').doc(otpDoc.id).delete();
      throw new Error('OTP has expired. Please request a new one.');
    }

    // Success: Delete the OTP record so it can't be used again
    await adminDb.collection('emailOtps').doc(otpDoc.id).delete();

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Marks a user as email verified in Firestore.
 */
export async function markUserAsVerifiedAction(uid: string) {
  try {
    await adminDb.collection('users').doc(uid).update({
      emailVerified: true,
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
