import { Poppins } from "next/font/google";
import "@/styles/globals.css";

const poppins = Poppins({ subsets: ["latin"], weight: '300' });

export const metadata = {
  title: "Trivia | Believe in Serverless",
  description: "Serverless and modern cloud development trivia game",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={poppins.className}>{children}</body>
    </html>
  );
}
