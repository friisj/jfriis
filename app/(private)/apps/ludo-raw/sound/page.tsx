'use client';

/**
 * Sound Management Home
 *
 * Root page for /sound that redirects to library
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SoundPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to library page
    router.push('/sound/effects/library');
  }, [router]);

  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="text-4xl mb-4">🔊</div>
        <p className="text-slate-400">Redirecting to Sound Library...</p>
      </div>
    </div>
  );
}
