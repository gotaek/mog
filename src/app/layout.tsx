import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://mog-web.pages.dev'),
  title: {
    default: "MOG - 영화관 3사 굿즈 모아보기",
    template: "%s | MOG"
  },
  alternates: {
    canonical: '/',
  },
  description: "CGV, 롯데시네마, 메가박스의 굿즈 정보를 한곳에서 확인하세요. 오리지널 티켓, 시그니처 아트카드, TTT, 포스터 등 한정판 굿즈 알림 및 재고 현황.",
  keywords: ["영화 굿즈", "CGV", "롯데시네마", "메가박스", "오리지널 티켓", "포스터", "시그니처 아트카드", "TTT", "무비씰", "필름마크", "영화 특전", "굿즈 재고"],
  authors: [{ name: "MOG Team" }],
  creator: "MOG Team",
  publisher: "MOG",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://mog-web.pages.dev",
    title: "MOG - 영화관 3사 굿즈 모아보기",
    description: "CGV, 롯데시네마, 메가박스 굿즈 정보를 한눈에. 놓치기 쉬운 한정판 굿즈 일정을 확인하세요.",
    siteName: "MOG",
  },
  twitter: {
    card: "summary_large_image",
    title: "MOG - 영화관 3사 굿즈 모아보기",
    description: "CGV, 롯데시네마, 메가박스 굿즈 정보를 한눈에.",
  },
  verification: {
    google: "google-site-verification=YOUR_VERIFICATION_CODE", // User needs to fill this later
    other: {
      "naver-site-verification": "YOUR_NAVER_VERIFICATION_CODE", // User needs to fill this later
      "geo.region": "KR",
      "geo.placename": "South Korea",
    },
  },
  other: {
    "content-language": "ko-KR",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Footer />
        <Script
          defer
          src='https://static.cloudflareinsights.com/beacon.min.js'
          data-cf-beacon='{"token": "133b98650f594c769d7912aa6e27f21a"}'
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-Z4Z4LPG6KH"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-Z4Z4LPG6KH');
          `}
        </Script>
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "v2pz0g1lhi");
          `}
        </Script>
      </body>
    </html>
  );
}
