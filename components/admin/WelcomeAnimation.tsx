'use client';

import { useEffect, useState, useRef } from 'react';

type Props = {
  name: string;
  phrases?: string[];
};

const DEFAULT_PHRASES = [
  'manage your school.',
  'track student progress.',
  'monitor attendance.',
  'analyze performance.',
  'review upcoming exams.',
];

export default function WelcomeAnimation({ name, phrases = DEFAULT_PHRASES }: Props) {
  const firstName = name.split(' ')[0] || name;
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];

    if (!isDeleting && charIndex < currentPhrase.length) {
      // Typing
      timeoutRef.current = setTimeout(() => {
        setDisplayed(currentPhrase.slice(0, charIndex + 1));
        setCharIndex((c) => c + 1);
      }, 55);
    } else if (!isDeleting && charIndex === currentPhrase.length) {
      // Pause then start deleting
      timeoutRef.current = setTimeout(() => {
        setIsDeleting(true);
      }, 1800);
    } else if (isDeleting && charIndex > 0) {
      // Deleting
      timeoutRef.current = setTimeout(() => {
        setDisplayed(currentPhrase.slice(0, charIndex - 1));
        setCharIndex((c) => c - 1);
      }, 30);
    } else if (isDeleting && charIndex === 0) {
      // Move to next phrase
      setIsDeleting(false);
      setPhraseIndex((i) => (i + 1) % phrases.length);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [charIndex, isDeleting, phraseIndex, phrases]);

  return (
    <div className="flex flex-col justify-center">
      {/* <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">
        👋 Hello,
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary">
        {firstName}{' '}
        <span className="inline-block">
          <span className="text-secondary font-normal">— ready to</span>{' '}
          <span className="text-cyan-400">
            {displayed}
            <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-cyan-400 align-middle" />
          </span>
        </span>
      </h1> */}

      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
        👋 Hello,
      </p>

      <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary">
        {firstName}{' '}
        <span className="inline-block">
          <span className="text-secondary font-normal">
            — ready to
          </span>{' '}
          <span className="text-accent">
            {displayed}
            <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-current align-middle" />
          </span>
        </span>
      </h1>

    </div>
  );
}
