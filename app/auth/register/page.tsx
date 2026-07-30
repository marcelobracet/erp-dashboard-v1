import { redirect } from 'next/navigation';

/** Cadastro público de usuário foi substituído pelo onboarding (provision). */
export default function RegisterPage() {
  redirect('/auth/onboarding');
}
