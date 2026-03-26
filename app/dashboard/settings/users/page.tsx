import { redirect } from 'next/navigation';

export default function SettingsUsersRedirect() {
  redirect('/dashboard/settings?tab=equipe');
}
