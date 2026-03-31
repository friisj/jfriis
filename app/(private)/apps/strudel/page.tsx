import { StrudelApp } from './strudel-app'

export const metadata = {
  title: 'Strudel — Live Coding Music',
  description: 'Pattern-based live coding music environment',
}

export default function StrudelPage() {
  return (
    <div className="h-dvh w-full">
      <StrudelApp />
    </div>
  )
}
