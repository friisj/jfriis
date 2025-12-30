import { CustomerProfileForm } from '@/components/admin/customer-profile-form'

export default function NewCustomerProfilePage() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Customer Profile</h1>
          <p className="text-muted-foreground">
            Define your target customer with jobs, pains, and gains
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <CustomerProfileForm />
        </div>
      </div>
    </div>
  )
}
