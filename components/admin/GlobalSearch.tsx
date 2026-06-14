'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

export default function GlobalSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [value, setValue] = useState(searchParams.get('q') || '');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync search value if URL parameter changes externally
  useEffect(() => {
    setValue(searchParams.get('q') || '');
  }, [searchParams]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleInputChange(val: string) {
    setValue(val);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = val.trim();

      if (trimmed) {
        params.set('q', trimmed);
      } else {
        params.delete('q');
      }

      params.set('page', '1');
      router.push(`?${params.toString()}`);
    }, 300);
  }

  return (
    <label className="relative block w-[340px]">
      {/* icon */}
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
          <path d="M10 4a6 6 0 1 0 3.7 10.7l3.6 3.6 1.4-1.4-3.6-3.6A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
        </svg>
      </span>

      <input
        type="search"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder="Search students, teachers, classes..."
        className="input-theme h-10 w-full pl-10 pr-4"
      />
    </label>
  );
}