// pages/_app.tsx
import type { AppProps } from 'next/app';
import '../styles/globals.css'; // Import global styles

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* You can add a global header or navbar here if needed */}
      <Component {...pageProps} />
      {/* You can add a global footer here if needed */}
    </div>
  );
}

export default MyApp;
