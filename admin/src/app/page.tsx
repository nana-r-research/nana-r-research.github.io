import { UserButton } from "@clerk/nextjs";
import Image from "next/image";
import { requireAdmin } from "@/lib/auth";
import { UploadForm } from "@/components/upload-form";

export default async function Home() {
  const admin = await requireAdmin();
  return (
    <main>
      <header className="app-header">
        <div className="header-inner">
          <Image src="/nana-r-logo.png" alt="ななーる訪問看護デベロップメントセンター" width={400} height={108} className="brand-logo" priority />
          <div className="account"><span>{admin.email}</span><UserButton /></div>
        </div>
      </header>
      <div className="shell">
        <div className="page-heading">
          <p className="kicker">Repository administration</p>
          <h1>研究成果を登録</h1>
          <p>PDFと書誌情報を入力すると、公開サイトへ自動的に追加されます。</p>
        </div>
        <UploadForm />
      </div>
    </main>
  );
}
