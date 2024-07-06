import Header from '@/components/Header';
import Head from 'next/head';

export default function Unauthorized() {
  return (
    <>
    <Head>
      <title>Unauthorized</title>
    </Head>
    <main className="flex min-h-screen flex-col items-center justify-center text-center p-24">
      <Header />
      <div className="w-full flex justify-center">
        <img src="/unauthorized.webp" width="50%" />
      </div>
      <h1 className="text-xl md:text-6xl font-extrabold leading-tighter tracking-tighter mb-4">
        You aren't allowed to do that
      </h1>
    </main></>
  );
}
