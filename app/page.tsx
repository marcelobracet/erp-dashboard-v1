import { redirect } from 'next/navigation';
import { isAuthDisabled } from '@/lib/featureFlags';

export default function Home() {
  redirect(isAuthDisabled() ? '/dashboard' : '/auth/login');
}
