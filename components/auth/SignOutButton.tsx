'use client';

export const SignOutButton = () => {
  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };
  return (
    <button
      type="button"
      onClick={signOut}
      className="text-sm text-gray-500 underline"
    >
      sign out
    </button>
  );
};
