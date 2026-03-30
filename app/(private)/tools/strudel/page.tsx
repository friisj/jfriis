import { StrudelClient } from './strudel-client'

export const metadata = {
  title: 'Strudel — Live Coding Music',
  description: 'Pattern-based live coding music environment powered by Strudel',
}

export default function StrudelPage() {
  return (
    <div className="h-dvh w-full">
      <StrudelClient />
    </div>
  )
}
