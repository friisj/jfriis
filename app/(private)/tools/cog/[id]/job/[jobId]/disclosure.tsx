'use client';

import { useState, createContext, useContext, type ReactNode } from 'react';
import { IconChevronRight } from '@tabler/icons-react';

interface DisclosureContextValue {
  isOpen: boolean;
  toggle: () => void;
}

const DisclosureContext = createContext<DisclosureContextValue | null>(null);

function useDisclosure() {
  const context = useContext(DisclosureContext);
  if (!context) {
    throw new Error('Disclosure components must be used within a Disclosure');
  }
  return context;
}

interface DisclosureProps {
  children: ReactNode;
  defaultOpen?: boolean;
}

export function Disclosure({ children, defaultOpen = false }: DisclosureProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const toggle = () => setIsOpen((prev) => !prev);

  return (
    <DisclosureContext.Provider value={{ isOpen, toggle }}>
      {children}
    </DisclosureContext.Provider>
  );
}

interface DisclosureTriggerProps {
  children: ReactNode;
  className?: string;
}

export function DisclosureTrigger({ children, className = '' }: DisclosureTriggerProps) {
  const { isOpen, toggle } = useDisclosure();

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center gap-2 text-left w-full ${className}`}
      aria-expanded={isOpen}
    >
      <IconChevronRight size={16} className={`transition-transform flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`} />
      {children}
    </button>
  );
}

interface DisclosureContentProps {
  children: ReactNode;
  className?: string;
}

export function DisclosureContent({ children, className = '' }: DisclosureContentProps) {
  const { isOpen } = useDisclosure();

  if (!isOpen) return null;

  return <div className={className}>{children}</div>;
}
