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
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
                </svg>
            </span>

            <input
                type="search"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm text-foreground outline-none focus:border-cyan-500 placeholder:text-muted-foreground transition-all"
            />
        </label>
    );
}