'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateJob } from '@/lib/cog';

interface EditableJobTitleProps {
  jobId: string;
  title: string;
  canEdit: boolean;
}

export function EditableJobTitle({ jobId, title, canEdit }: EditableJobTitleProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  async function handleSave() {
    if (value.trim() === title) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      await updateJob(jobId, { title: value.trim() || 'Untitled Job' });
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to update title:', error);
      setValue(title);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setValue(title);
      setIsEditing(false);
    }
  }

  if (!canEdit) {
    return <h1 className="text-3xl font-bold">{title || 'Untitled Job'}</h1>;
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={saving}
          className="text-3xl font-bold bg-transparent border-b-2 border-primary outline-none w-full"
          placeholder="Job title"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="text-3xl font-bold text-left hover:text-primary transition-colors group flex items-center gap-2"
      title="Click to edit title"
    >
      {title || 'Untitled Job'}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-0 group-hover:opacity-50 transition-opacity"
      >
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </svg>
    </button>
  );
}
