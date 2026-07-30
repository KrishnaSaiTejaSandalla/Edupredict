import React, { useEffect, useState } from 'react';
import { Text, TextStyle } from 'react-native';

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  durationMs?: number;
  style?: TextStyle | TextStyle[];
}

export function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  durationMs = 650,
  style,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const totalFrames = Math.max(1, Math.round(durationMs / 16));
    const timer = setInterval(() => {
      frame += 1;
      const progress = Math.min(1, frame / totalFrames);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));

      if (progress >= 1) {
        clearInterval(timer);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [durationMs, value]);

  return <Text style={style}>{`${prefix}${displayValue}${suffix}`}</Text>;
}
