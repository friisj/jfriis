export const dynamic = 'force-dynamic'

import { PasskeySettings } from '@/components/admin/settings/passkey-settings'

export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and authentication methods
          </p>
        </div>

        <PasskeySettings />
      </div>
    </div>
  )
}
