'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

type Props = {
    placeholder?: string;
    paramKey?: string;
    debounceMs?: number;
};

export default function AdminSearch({
    placeholder = 'Search...',
    paramKey = 'q',
    debounceMs = 350,
}: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [value, setValue] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync internal state when URL search param changes (e.g. back button, or filter updates)
    useEffect(() => {
        setValue(searchParams.get(paramKey) || '');
    }, [searchParams, paramKey]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            const currentValue = searchParams.get(paramKey) || '';

            if (currentValue === value.trim()) return;

            const params = new URLSearchParams(searchParams.toString());

            if (value.trim()) {
                params.set(paramKey, value.trim());
            } else {
                params.delete(paramKey);
            }

            params.set('page', '1');

            router.push(`?${params.toString()}`);
        }, debounceMs);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [value, searchParams, paramKey, debounceMs, router]);


    return (
        <label className="relative block w-[300px]">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d="M10 4a6 6 0 1 0 3.7 10.7l3.6 3.6 1.4-1.4-3.6-3.6A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
                </svg>
            </span>

            <input
                type="search"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                className="input-theme h-10 w-full pl-9"
            />
        </label>
    );
}