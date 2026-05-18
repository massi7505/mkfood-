export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className='bg-zinc-950 text-zinc-50 min-h-dvh'>
      <div className='mx-auto flex min-h-dvh w-full max-w-md items-center px-4 py-10'>
        {children}
      </div>
    </main>
  );
}
