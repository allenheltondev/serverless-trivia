import Header from '@/components/Header';
import Head from 'next/head';

export default function NotFound() {
  return (
    <>
    <Head>
      <title>Not Found | Believe in Serverless</title>
    </Head>
    <main className="flex min-h-screen flex-col items-center justify-center text-center p-24">
      <Header />
      <div className="w-full flex justify-center">
        <img src="/not-found.webp" width="50%" />
      </div>
      <h1 className="text-xl md:text-6xl font-extrabold leading-tighter tracking-tighter mb-4">
        Uhhh, we can't find what you're looking for
      </h1>
    </main></>
  );
}
