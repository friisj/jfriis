'use client';

import { useState, useEffect } from 'react';
import { IconChevronDown } from '@tabler/icons-react';

export function ScrollIndicator({
  scrollContainerRef,
  messagesEndRef,
}: {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [showScroll, setShowScroll] = useState(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScroll(scrollHeight - scrollTop - clientHeight > 40);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef]);

  if (!showScroll) return null;

  return (
    <button
      type="button"
      onClick={() =>
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
      aria-label="Scroll to bottom"
      className="flex items-center justify-center size-8 rounded-full bg-muted absolute bottom-28 cursor-pointer left-1/2 -translate-x-1/2 hover:bg-accent transition-colors"
    >
      <IconChevronDown size={20} stroke={1.5} />
    </button>
  );
}
