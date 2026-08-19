"use client";

import { upload } from "@vercel/blob/client";
import { FormEvent, useState } from "react";

type Stage = "edit" | "confirm" | "publishing" | "done";
type Published = { id: string; url: string };

export function UploadForm() {
  const [stage, setStage] = useState<Stage>("edit");
  const [form, setForm] = useState<Record<string, string>>({ language: "en", manuscriptType: "Author Accepted Manuscript", year: String(new Date().getFullYear()) });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [published, setPublished] = useState<Published | null>(null);
  const isJapanese = form.language === "ja";
  const previewTitle = isJapanese ? form.titleJa : form.titleEn;

  function update(name: string, value: string) { setForm((current) => ({ ...current, [name]: value })); }

  function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = Object.fromEntries(Array.from(data.entries()).filter(([, value]) => typeof value === "string")) as Record<string, string>;
    if (!file) return setError("PDFを選択してください。");
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return setError("PDFファイルを選択してください。");
    if (file.size > 25 * 1024 * 1024) return setError("PDFは25MB以下にしてください。");
    setForm(next); setError(""); setStage("confirm"); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function publish() {
    if (!file) return;
    setStage("publishing"); setError("");
    try {
      const blob = await upload(`repository-pending/${crypto.randomUUID()}.pdf`, file, {
        access: "private", handleUploadUrl: "/api/blob/upload", multipart: file.size > 5 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });
      const response = await fetch("/api/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blobUrl: blob.url, metadata: { ...form, year: Number(form.year) } }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "公開できませんでした。");
      setPublished(result); setStage("done");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "公開できませんでした。"); setStage("confirm"); }
  }

  if (stage === "done" && published) return <section className="panel success"><div className="success-mark">✓</div><h2>登録が完了しました</h2><p><strong>{published.id}</strong> として公開処理を開始しました。</p><p><a href={published.url} target="_blank" rel="noreferrer">公開ページを開く</a></p><p>サイトへの反映には1〜2分かかることがあります。</p></section>;

  if (stage === "confirm" || stage === "publishing") return <section className="panel">
    <Steps current={2} />
    <div className="preview">
      <div className="preview-block"><p className="preview-label">論文タイトル</p><h2>{previewTitle}</h2>{isJapanese && <p>{form.titleEn}</p>}</div>
      <div className="preview-block"><p className="preview-label">著者</p><p>{isJapanese ? form.authorsJa : form.authorsEn}</p>{isJapanese && <p>{form.authorsEn}</p>}</div>
      <div className="preview-block"><p className="preview-label">掲載誌</p><p>{isJapanese ? form.journalJa : form.journalEn}（{form.year}）</p><p>DOI: {form.doi || "なし"}</p></div>
      <div className="preview-block"><p className="preview-label">PDF</p><p>{file?.name}（{file ? (file.size / 1024 / 1024).toFixed(1) : 0} MB）</p><p>{form.manuscriptType}</p></div>
    </div>
    {stage === "publishing" && <p className="progress">PDFをアップロードしています… {progress}%</p>}
    {error && <p className="error">{error}</p>}
    <div className="actions"><button className="button secondary" type="button" onClick={() => setStage("edit")} disabled={stage === "publishing"}>修正する</button><button className="button" type="button" onClick={publish} disabled={stage === "publishing"}>この内容で公開する</button></div>
  </section>;

  return <form className="panel" onSubmit={confirm}>
    <Steps current={1} />
    <section className="form-section"><h2>基本情報</h2><div className="grid">
      <Field label="論文の言語" name="language"><select id="language" name="language" value={form.language} onChange={(e) => update("language", e.target.value)}><option value="en">英語論文</option><option value="ja">日本語論文</option></select></Field>
      <Field label="出版年" name="year" required><input id="year" name="year" type="number" min="1900" max="2100" required value={form.year} onChange={(e) => update("year", e.target.value)} /></Field>
      {isJapanese && <Field label="論文タイトル（日本語）" name="titleJa" full required><input id="titleJa" name="titleJa" required defaultValue={form.titleJa} /></Field>}
      <Field label={isJapanese ? "論文タイトル（英語）" : "論文タイトル"} name="titleEn" full required><input id="titleEn" name="titleEn" required defaultValue={form.titleEn} /></Field>
      {isJapanese && <Field label="著者名（日本語）" name="authorsJa" full required hint="1行に1名。英語欄と同じ順番で入力"><textarea id="authorsJa" name="authorsJa" required defaultValue={form.authorsJa} /></Field>}
      <Field label={isJapanese ? "著者名（英語）" : "著者名"} name="authorsEn" full required hint="1行に1名"><textarea id="authorsEn" name="authorsEn" required defaultValue={form.authorsEn} /></Field>
      {isJapanese && <Field label="所属（日本語）" name="affiliationsJa" full required hint="1行に1所属。英語欄と同じ順番で入力"><textarea id="affiliationsJa" name="affiliationsJa" required defaultValue={form.affiliationsJa} /></Field>}
      <Field label={isJapanese ? "所属（英語）" : "所属"} name="affiliationsEn" full required hint="1行に1所属"><textarea id="affiliationsEn" name="affiliationsEn" required defaultValue={form.affiliationsEn} /></Field>
    </div></section>
    <section className="form-section"><h2>出版情報</h2><div className="grid">
      {isJapanese && <Field label="雑誌名（日本語）" name="journalJa" full required><input id="journalJa" name="journalJa" required defaultValue={form.journalJa} /></Field>}
      <Field label={isJapanese ? "雑誌名（英語）" : "雑誌名"} name="journalEn" full required><input id="journalEn" name="journalEn" required defaultValue={form.journalEn} /></Field>
      <Field label="巻" name="volume"><input id="volume" name="volume" defaultValue={form.volume} /></Field><Field label="号" name="issue"><input id="issue" name="issue" defaultValue={form.issue} /></Field>
      <Field label="ページ" name="pages"><input id="pages" name="pages" placeholder="123–130" defaultValue={form.pages} /></Field><Field label="DOI" name="doi"><input id="doi" name="doi" placeholder="10.xxxx/xxxxx" defaultValue={form.doi} /></Field>
    </div></section>
    <section className="form-section"><h2>抄録・キーワード</h2><div className="grid">
      {isJapanese && <Field label="抄録（日本語）" name="abstractJa" full required><textarea id="abstractJa" name="abstractJa" required defaultValue={form.abstractJa} /></Field>}
      <Field label={isJapanese ? "抄録（英語）" : "抄録"} name="abstractEn" full required><textarea id="abstractEn" name="abstractEn" required defaultValue={form.abstractEn} /></Field>
      {isJapanese && <Field label="キーワード（日本語）" name="keywordsJa" full required hint="カンマ区切り"><input id="keywordsJa" name="keywordsJa" required defaultValue={form.keywordsJa} /></Field>}
      <Field label={isJapanese ? "キーワード（英語）" : "キーワード"} name="keywordsEn" full required hint="カンマ区切り"><input id="keywordsEn" name="keywordsEn" required defaultValue={form.keywordsEn} /></Field>
    </div></section>
    <section className="form-section"><h2>掲載ファイル</h2><div className="grid">
      <Field label="原稿の種類" name="manuscriptType" full required><select id="manuscriptType" name="manuscriptType" value={form.manuscriptType} onChange={(e) => update("manuscriptType", e.target.value)}><option>Author Accepted Manuscript</option><option>Published Version</option><option>Preprint</option></select></Field>
      <div className="field full"><label className="required" htmlFor="pdf">PDF</label><div className="file-drop"><input id="pdf" type="file" accept="application/pdf,.pdf" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />{file && <small>{file.name}（{(file.size / 1024 / 1024).toFixed(1)} MB）</small>}</div><small>公開許諾を確認したPDFを選択してください。最大25MB。</small></div>
    </div></section>
    {error && <p className="error">{error}</p>}
    <div className="actions"><button className="button" type="submit">内容を確認する</button></div>
  </form>;
}

function Field({ label, name, children, hint, full = false, required = false }: { label: string; name: string; children: React.ReactNode; hint?: string; full?: boolean; required?: boolean }) {
  return <div className={`field${full ? " full" : ""}`}><label htmlFor={name} className={required ? "required" : ""}>{label}</label>{children}{hint && <small>{hint}</small>}</div>;
}

function Steps({ current }: { current: number }) {
  return <div className="steps" aria-label="登録手順"><div className={`step ${current === 1 ? "active" : ""}`}><span className="step-number">1</span><span className="step-text">情報入力</span></div><span className="step-line" /><div className={`step ${current === 2 ? "active" : ""}`}><span className="step-number">2</span><span className="step-text">内容確認・公開</span></div><span className="step-line" /><div className="step"><span className="step-number">3</span><span className="step-text">完了</span></div></div>;
}
