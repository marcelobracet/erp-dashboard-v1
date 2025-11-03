/**
 * Utility function to format dates consistently
 * Prevents hydration mismatches by ensuring consistent formatting
 */
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    // Use a consistent format that works the same on server and client
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return '-';
  }
}

/**
 * Format currency consistently
 */
export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

