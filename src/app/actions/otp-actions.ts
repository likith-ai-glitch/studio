
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
    // We fetch without orderBy to avoid index requirements in Firestore
    const recentOtpQuery = await adminDb.collection('emailOtps')
      .where('email', '==', email)
      .get();

    if (!recentOtpQuery.empty) {
      // Sort in memory to avoid composite index requirement
      const docs = recentOtpQuery.docs.map(d => ({
          ...d.data(),
          createdAt: d.data().createdAt as Timestamp
      }));
      docs.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      
      const lastOtp = docs[0];
      const lastCreated = lastOtp.createdAt.toMillis();
      const now = Date.now();
      if (now - lastCreated < 60000) {
        throw new Error('Please wait 60 seconds before requesting a new code.');
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
    // Fetch all OTPs for this email to avoid complex index requirement
    const otpQuery = await adminDb.collection('emailOtps')
      .where('email', '==', email)
      .get();

    if (otpQuery.empty) {
      throw new Error('No verification code found for this email.');
    }

    // Filter for the matching OTP in memory
    const matchingDoc = otpQuery.docs.find(d => d.data().otp === otp);

    if (!matchingDoc) {
      throw new Error('Invalid OTP code. Please try again.');
    }

    const otpData = matchingDoc.data();

    // Check expiry
    if (otpData.expiresAt.toDate() < new Date()) {
      await adminDb.collection('emailOtps').doc(matchingDoc.id).delete();
      throw new Error('OTP has expired. Please request a new one.');
    }

    // Success: Delete the OTP record so it can't be used again
    await adminDb.collection('emailOtps').doc(matchingDoc.id).delete();

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
