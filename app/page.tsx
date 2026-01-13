import { SplashPage } from '@/components/splash-page'
import { HomePage } from '@/components/home-page'

export default function Home() {
  const showSplash = process.env.NEXT_PUBLIC_SHOW_SPLASH === 'true'

  if (showSplash) {
    return <SplashPage />
  }

  return <HomePage />
}
