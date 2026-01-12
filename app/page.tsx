import { redirect } from 'next/navigation'
import { SplashPage } from '@/components/splash-page'

export default function Home() {
  const showSplash = process.env.NEXT_PUBLIC_SHOW_SPLASH === 'true'

  if (!showSplash) {
    // When not in splash mode, redirect to main site
    redirect('/portfolio')
  }

  return <SplashPage />
}
