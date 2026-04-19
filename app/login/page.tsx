import { UserPicker } from '@/components/auth/UserPicker';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sky-50 p-8">
      <UserPicker />
    </main>
  );
}
