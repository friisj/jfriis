import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { SplashPage } from '@/components/splash-page'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Logged in users go to portfolio (or could render home content here)
    redirect('/portfolio')
  }

  // Logged out users see splash
  return <SplashPage />
}
