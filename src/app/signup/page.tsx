'use client';

import { useRouter } from 'next/navigation';

// This page is now handled within the login page's tabbed interface.
// We redirect any direct access to the new, consolidated login page.
export default function SignupPage() {
  const router = useRouter();
  if (typeof window !== 'undefined') {
    router.replace('/login');
  }
  return null;
}
