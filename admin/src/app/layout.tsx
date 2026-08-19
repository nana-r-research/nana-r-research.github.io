import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "研究成果登録 | ななーるリポジトリ管理",
  description: "ななーる訪問看護デベロップメントセンターリポジトリの管理画面",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <ClerkProvider><html lang="ja"><body>{children}</body></html></ClerkProvider>;
}
