'use client';

import React from 'react';

/** NextAuth foi removido. Este componente existe apenas para não quebrar imports. */
export default function NextAuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
