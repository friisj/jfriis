import Link from 'next/link'
import { getContacts } from '@/lib/studio/cue/queries'

export default async function ContactsPage() {
  const contacts = await getContacts()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Contacts</h1>
        <Link
          href="/apps/cue/contacts/new"
          className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
        >
          Add contact
        </Link>
      </div>

      {contacts.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
          <p className="text-slate-500 dark:text-slate-400">No contacts yet.</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
            Add a contact to generate AI conversation briefs.
          </p>
          <Link
            href="/apps/cue/contacts/new"
            className="inline-block mt-4 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
          >
            Add first contact
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {contacts.map((contact) => (
            <li key={contact.id}>
              <Link
                href={`/apps/cue/contacts/${contact.id}`}
                className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {contact.name}
                  </p>
                  {contact.relationship && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {contact.relationship}
                    </p>
                  )}
                </div>
                {contact.last_seen_at && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    Last seen{' '}
                    {new Date(contact.last_seen_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
