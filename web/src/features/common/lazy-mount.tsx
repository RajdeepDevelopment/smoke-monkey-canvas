import React, { useState } from 'react';

export const LazyMount: React.FC<{ open: boolean; children: React.ReactNode }> = ({
  open,
  children,
}) => {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  if (!mounted) return null;
  return <React.Suspense fallback={null}>{children}</React.Suspense>;
};
