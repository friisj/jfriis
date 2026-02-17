'use client'

import { useState, useRef, useEffect } from 'react'

interface Term {
  id: string
  term: string
  definition: string
}

interface TermAutocompleteProps {
  allTerms: Term[]
  selectedTerms: string[]
  onAddTerm: (term: string) => void
  onRemoveTerm: (term: string) => void
  placeholder?: string
}

export function TermAutocomplete({
  allTerms,
  selectedTerms,
  onAddTerm,
  onRemoveTerm,
  placeholder = 'Type to search existing terms or add new ones...',
}: TermAutocompleteProps) {
  const [input, setInput] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredTerms = allTerms
    .filter(
      (term) =>
        term.term.toLowerCase().includes(input.toLowerCase()) &&
        !selectedTerms.includes(term.term)
    )
    .slice(0, 10)

  const isExistingTerm = filteredTerms.some(
    (term) => term.term.toLowerCase() === input.toLowerCase()
  )

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleInputChange = (value: string) => {
    setInput(value)
    setIsOpen(true)
    setFocusedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    const totalItems = filteredTerms.length + (input.trim() && !isExistingTerm ? 1 : 0)

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (focusedIndex >= 0) {
          if (focusedIndex < filteredTerms.length) {
            handleSelectTerm(filteredTerms[focusedIndex].term)
          } else if (input.trim() && !isExistingTerm) {
            handleAddNewTerm()
          }
        } else if (input.trim()) {
          if (isExistingTerm) {
            const existingTerm = filteredTerms.find(
              (term) => term.term.toLowerCase() === input.toLowerCase()
            )
            if (existingTerm) handleSelectTerm(existingTerm.term)
          } else {
            handleAddNewTerm()
          }
        }
        break
      case 'Escape':
        setIsOpen(false)
        setFocusedIndex(-1)
        break
      case 'Tab':
        if (input.trim()) {
          e.preventDefault()
          if (isExistingTerm) {
            const existingTerm = filteredTerms.find(
              (term) => term.term.toLowerCase() === input.toLowerCase()
            )
            if (existingTerm) handleSelectTerm(existingTerm.term)
          } else {
            handleAddNewTerm()
          }
        }
        break
    }
  }

  const handleSelectTerm = (term: string) => {
    onAddTerm(term)
    setInput('')
    setIsOpen(false)
    setFocusedIndex(-1)
    inputRef.current?.focus()
  }

  const handleAddNewTerm = () => {
    if (input.trim()) {
      onAddTerm(input.trim())
      setInput('')
      setIsOpen(false)
      setFocusedIndex(-1)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative" ref={containerRef}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-blue-900/40 dark:text-blue-100"
        />

        {isOpen && (input.trim() || filteredTerms.length > 0) && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {filteredTerms.map((term, index) => (
              <button
                key={term.id}
                type="button"
                onClick={() => handleSelectTerm(term.term)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-600 ${
                  focusedIndex === index ? 'bg-slate-100 dark:bg-slate-600' : ''
                }`}
              >
                <div className="font-medium text-slate-900 dark:text-slate-100">{term.term}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {term.definition}
                </div>
              </button>
            ))}

            {input.trim() && !isExistingTerm && (
              <button
                type="button"
                onClick={handleAddNewTerm}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 border-t border-slate-200 dark:border-slate-600 ${
                  focusedIndex === filteredTerms.length ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
              >
                <div className="font-medium text-blue-600 dark:text-blue-400">
                  + Add new term: &quot;{input.trim()}&quot;
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  This will be a new term suggestion
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {selectedTerms.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTerms.map((term) => {
            const existingTerm = allTerms.find((t) => t.term === term)
            const isExisting = !!existingTerm

            return (
              <span
                key={term}
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  isExisting
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                }`}
              >
                {term}
                <button
                  type="button"
                  onClick={() => onRemoveTerm(term)}
                  className="ml-1.5 text-current hover:text-red-600 dark:hover:text-red-400"
                >
                  x
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
