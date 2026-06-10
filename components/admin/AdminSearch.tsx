'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

type Props = {
    placeholder?: string;
    paramKey?: string; // default: q
};

export default function AdminSearch({
    placeholder = 'Search...',
    paramKey = 'q',
}: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [value, setValue] = useState(searchParams.get(paramKey) || '');

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        const params = new URLSearchParams(searchParams.toString());
        const trimmed = value.trim();

        if (trimmed) {
            params.set('q', trimmed);
        } else {
            params.delete('q');
        }
        params.set('page', '1');
        router.push(`?${params.toString()}`);
    }

    return (
        <form onSubmit={onSubmit} className="min-w-0 flex-1">
            <label className="relative block w-[340px]">
                {/* icon */}
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                        <path d="M10 4a6 6 0 1 0 3.7 10.7l3.6 3.6 1.4-1.4-3.6-3.6A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
                    </svg>
                </span>

                <input
                    type="search"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={placeholder}
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 hover:bg-white/[0.06] focus:border-white/20 focus:ring-0"
                />
            </label>
        </form>
    );
}