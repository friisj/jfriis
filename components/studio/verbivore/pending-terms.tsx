'use client'

interface PendingTermsProps {
  userSuggestedTerms: string[]
  existingTerms: { term: string; definition: string }[]
  aiSuggestedTerms: string[]
  selectedPendingTerms: string[]
  onTogglePendingTerm: (term: string) => void
  onAddSelectedTerms: () => void
  onClearAll: () => void
  onRejectTerm?: (term: string) => void
  isCreatingTerms?: boolean
}

export function PendingTerms({
  userSuggestedTerms,
  existingTerms,
  aiSuggestedTerms,
  selectedPendingTerms,
  onTogglePendingTerm,
  onAddSelectedTerms,
  onClearAll,
  onRejectTerm,
  isCreatingTerms = false,
}: PendingTermsProps) {
  const totalPendingTerms = userSuggestedTerms.length + existingTerms.length + aiSuggestedTerms.length
  const selectedCount = selectedPendingTerms.length

  if (totalPendingTerms === 0) {
    return null
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100">
          Pending Terms ({totalPendingTerms})
        </h3>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
        >
          Clear All
        </button>
      </div>

      <div className="space-y-4">
        {userSuggestedTerms.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
              Your Suggestions ({userSuggestedTerms.length})
            </h4>
            <div className="space-y-2">
              {userSuggestedTerms.map((term) => (
                <div key={`user-${term}`} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id={`pending-user-${term}`}
                    checked={selectedPendingTerms.includes(term)}
                    onChange={() => onTogglePendingTerm(term)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                  />
                  <label
                    htmlFor={`pending-user-${term}`}
                    className="flex-1 text-sm font-medium text-blue-800 dark:text-blue-200 cursor-pointer"
                  >
                    {term}
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      New
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {existingTerms.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">
              Existing Terms ({existingTerms.length})
            </h4>
            <div className="space-y-2">
              {existingTerms.map((termData) => (
                <div key={`existing-${termData.term}`} className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id={`pending-existing-${termData.term}`}
                    checked={selectedPendingTerms.includes(termData.term)}
                    onChange={() => onTogglePendingTerm(termData.term)}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-slate-300 rounded mt-0.5"
                  />
                  <label
                    htmlFor={`pending-existing-${termData.term}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="text-sm font-medium text-green-800 dark:text-green-200">
                      {termData.term}
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        Exists
                      </span>
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {termData.definition}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {aiSuggestedTerms.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">
              AI Suggestions ({aiSuggestedTerms.length})
            </h4>
            <div className="space-y-2">
              {aiSuggestedTerms.map((term) => (
                <div key={`ai-${term}`} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id={`pending-ai-${term}`}
                    checked={selectedPendingTerms.includes(term)}
                    onChange={() => onTogglePendingTerm(term)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-slate-300 rounded"
                  />
                  <label
                    htmlFor={`pending-ai-${term}`}
                    className="flex-1 text-sm font-medium text-purple-800 dark:text-purple-200 cursor-pointer"
                  >
                    {term}
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                      AI
                    </span>
                  </label>
                  {onRejectTerm && (
                    <button
                      type="button"
                      onClick={() => onRejectTerm(term)}
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                      title="Reject this suggestion"
                    >
                      x
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-700">
        <div className="flex items-center justify-between">
          <div className="text-sm text-amber-700 dark:text-amber-300">
            {selectedCount > 0 ? (
              <span className="font-medium">
                {selectedCount} term{selectedCount === 1 ? '' : 's'} selected
              </span>
            ) : (
              'Select terms to add to your entry'
            )}
          </div>
          <button
            type="button"
            onClick={onAddSelectedTerms}
            disabled={selectedCount === 0 || isCreatingTerms}
            className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {isCreatingTerms
              ? 'Adding Terms...'
              : selectedCount > 0
                ? `Add ${selectedCount} Term${selectedCount === 1 ? '' : 's'}`
                : 'Add Selected Terms'}
          </button>
        </div>
      </div>
    </div>
  )
}
