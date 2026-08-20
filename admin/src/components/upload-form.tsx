"use client";

import { upload } from "@vercel/blob/client";
import { type FormEvent, type ReactNode, useState } from "react";
import type { EditablePublication } from "@/lib/github";
import { LICENSE_OPTIONS } from "@/lib/licenses";

type Stage = "edit" | "confirm" | "publishing" | "done";
type Published = { id: string; url: string };

const newPublication = () => ({
  language: "en",
  manuscriptType: "Author Accepted Manuscript",
  license: "",
  year: String(new Date().getFullYear()),
});

export function UploadForm({ publications }: { publications: EditablePublication[] }) {
  const [view, setView] = useState<"new" | "published">("new");
  const [selected, setSelected] = useState<EditablePublication | null>(null);

  if (selected) {
    return <PublicationForm key={selected.id} publication={selected} onExit={() => window.location.reload()} />;
  }

  return <>
    <div className="mode-switch" aria-label="管理画面の機能">
      <button type="button" className={`button ${view === "new" ? "" : "secondary"}`} onClick={() => setView("new")}>新しく登録</button>
      <button type="button" className={`button ${view === "published" ? "" : "secondary"}`} onClick={() => setView("published")}>公開済み情報を修正</button>
    </div>
    {view === "new" ? <PublicationForm /> : <section className="panel">
      <h2 className="panel-title">公開済みの研究成果</h2>
      {publications.length === 0 ? <p>現在、修正できる研究成果はありません。</p> : <div className="record-list">
        {publications.map((publication) => <button key={publication.id} type="button" className="record-row" onClick={() => setSelected(publication)}>
          <span><strong>{publication.id}</strong><small>{publication.fields.year}</small></span>
          <span>{publication.fields.titleJa || publication.fields.titleEn}</span>
          <span aria-hidden="true">編集 →</span>
        </button>)}
      </div>}
    </section>}
  </>;
}

function PublicationForm({ publication, onExit }: { publication?: EditablePublication; onExit?: () => void }) {
  const [stage, setStage] = useState<Stage>("edit");
  const [form, setForm] = useState<Record<string, string>>(() => publication?.fields ?? newPublication());
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [published, setPublished] = useState<Published | null>(null);
  const isJapanese = form.language === "ja";
  const isEditing = Boolean(publication);
  const previewTitle = isJapanese ? form.titleJa : form.titleEn;
  const licenseLabel = LICENSE_OPTIONS.find((license) => license.value === form.license)?.label ?? "未設定";

  function update(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = Object.fromEntries(Array.from(data.entries()).filter(([, value]) => typeof value === "string")) as Record<string, string>;
    if (file && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return setError("PDFファイルを選択してください。");
    if (file && file.size > 25 * 1024 * 1024) return setError("PDFは25MB以下にしてください。");
    if (next.language === "ja" && Boolean(next.abstractJa?.trim()) !== Boolean(next.abstractEn?.trim())) return setError("抄録を入力する場合は、日本語と英語の両方を入力してください。");
    setForm(next);
    setError("");
    setStage("confirm");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function publish() {
    setStage("publishing");
    setError("");
    try {
      const blob = file ? await upload(`repository-pending/${crypto.randomUUID()}.pdf`, file, {
        access: "private",
        handleUploadUrl: "/api/blob/upload",
        multipart: file.size > 5 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      }) : undefined;
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blobUrl: blob?.url, id: publication?.id, metadata: { ...form, year: Number(form.year) } }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "公開できませんでした。");
      setPublished(result);
      setStage("done");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "公開できませんでした。");
      setStage("confirm");
    }
  }

  function startAnother() {
    setForm(newPublication());
    setFile(null);
    setError("");
    setProgress(0);
    setPublished(null);
    setStage("edit");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (stage === "done" && published) return <section className="panel success">
    <div className="success-mark">✓</div>
    <h2>{isEditing ? "更新が完了しました" : "登録が完了しました"}</h2>
    <p><strong>{published.id}</strong> として公開処理を開始しました。</p>
    <p><a href={published.url} target="_blank" rel="noreferrer">公開ページを開く</a></p>
    <p>サイトへの反映には1〜2分かかることがあります。</p>
    <div className="actions success-actions">
      {isEditing
        ? <button className="button" type="button" onClick={onExit}>公開済み情報の一覧へ戻る</button>
        : <button className="button" type="button" onClick={startAnother}>続けて登録する</button>}
    </div>
  </section>;

  if (stage === "confirm" || stage === "publishing") return <section className="panel">
    <Steps current={2} />
    <div className="preview">
      <div className="preview-block"><p className="preview-label">論文タイトル</p><h2>{previewTitle}</h2>{isJapanese ? <p>{form.titleEn}</p> : null}</div>
      <div className="preview-block"><p className="preview-label">著者</p><p>{isJapanese ? form.authorsJa : form.authorsEn}</p>{isJapanese ? <p>{form.authorsEn}</p> : null}</div>
      <div className="preview-block"><p className="preview-label">掲載誌</p><p>{isJapanese ? form.journalJa : form.journalEn}（{form.year}）</p><p>DOI: {form.doi || "なし"}</p></div>
      <div className="preview-block"><p className="preview-label">掲載ファイル</p><p>{file ? `${file.name}（${(file.size / 1024 / 1024).toFixed(1)} MB）` : publication?.fileUrl ? "現在のPDFを維持" : "PDFなし"}</p><p>{form.manuscriptType}</p><p>ライセンス：{licenseLabel}</p></div>
    </div>
    {stage === "publishing" ? <p className="progress">{file ? `PDFをアップロードしています… ${progress}%` : isEditing ? "情報を更新しています…" : "書誌情報を登録しています…"}</p> : null}
    {error ? <p className="error">{error}</p> : null}
    <div className="actions"><button className="button secondary" type="button" onClick={() => setStage("edit")} disabled={stage === "publishing"}>修正する</button><button className="button" type="button" onClick={publish} disabled={stage === "publishing"}>この内容で{isEditing ? "更新" : "公開"}する</button></div>
  </section>;

  return <form className="panel" onSubmit={confirm}>
    <Steps current={1} />
    {isEditing ? <div className="editing-heading"><p className="kicker">{publication?.id}</p><h2>公開済み情報を修正</h2><p>PDFを選び直さない場合、現在のPDFをそのまま使用します。</p></div> : null}
    <section className="form-section"><h2>基本情報</h2><div className="grid">
      <Field label="論文の言語" name="language"><select id="language" name="language" value={form.language} onChange={(event) => update("language", event.target.value)}><option value="en">英語論文</option><option value="ja">日本語論文</option></select></Field>
      <Field label="出版年" name="year" required><input id="year" name="year" type="number" min="1900" max="2100" required value={form.year} onChange={(event) => update("year", event.target.value)} /></Field>
      {isJapanese ? <Field label="論文タイトル（日本語）" name="titleJa" full required><input id="titleJa" name="titleJa" required defaultValue={form.titleJa} /></Field> : null}
      <Field label={isJapanese ? "論文タイトル（英語）" : "論文タイトル"} name="titleEn" full required><input id="titleEn" name="titleEn" required defaultValue={form.titleEn} /></Field>
      {isJapanese ? <Field label="著者名（日本語）" name="authorsJa" full required hint="1行に1名。英語欄と同じ順番で入力"><textarea id="authorsJa" name="authorsJa" required defaultValue={form.authorsJa} /></Field> : null}
      <Field label={isJapanese ? "著者名（英語）" : "著者名"} name="authorsEn" full required hint="1行に1名"><textarea id="authorsEn" name="authorsEn" required defaultValue={form.authorsEn} /></Field>
      {isJapanese ? <Field label="所属（日本語）" name="affiliationsJa" full required hint="1行に1所属。英語欄と同じ順番で入力"><textarea id="affiliationsJa" name="affiliationsJa" required defaultValue={form.affiliationsJa} /></Field> : null}
      <Field label={isJapanese ? "所属（英語）" : "所属"} name="affiliationsEn" full required hint="1行に1所属"><textarea id="affiliationsEn" name="affiliationsEn" required defaultValue={form.affiliationsEn} /></Field>
    </div></section>
    <section className="form-section"><h2>出版情報</h2><div className="grid">
      {isJapanese ? <Field label="雑誌名（日本語）" name="journalJa" full required><input id="journalJa" name="journalJa" required defaultValue={form.journalJa} /></Field> : null}
      <Field label={isJapanese ? "雑誌名（英語）" : "雑誌名"} name="journalEn" full required><input id="journalEn" name="journalEn" required defaultValue={form.journalEn} /></Field>
      <Field label="巻" name="volume"><input id="volume" name="volume" defaultValue={form.volume} /></Field>
      <Field label="号" name="issue"><input id="issue" name="issue" defaultValue={form.issue} /></Field>
      <Field label="ページ" name="pages"><input id="pages" name="pages" placeholder="123–130" defaultValue={form.pages} /></Field>
      <Field label="DOI" name="doi"><input id="doi" name="doi" placeholder="10.xxxx/xxxxx" defaultValue={form.doi} /></Field>
    </div></section>
    <section className="form-section"><h2>抄録・キーワード</h2><div className="grid">
      {isJapanese ? <Field label="抄録（日本語）" name="abstractJa" full hint="任意。入力する場合は英語抄録も入力"><textarea id="abstractJa" name="abstractJa" defaultValue={form.abstractJa} /></Field> : null}
      <Field label={isJapanese ? "抄録（英語）" : "抄録"} name="abstractEn" full hint={isJapanese ? "任意。入力する場合は日本語抄録も入力" : "任意"}><textarea id="abstractEn" name="abstractEn" defaultValue={form.abstractEn} /></Field>
      {isJapanese ? <Field label="キーワード（日本語）" name="keywordsJa" full required hint="カンマ区切り"><input id="keywordsJa" name="keywordsJa" required defaultValue={form.keywordsJa} /></Field> : null}
      <Field label={isJapanese ? "キーワード（英語）" : "キーワード"} name="keywordsEn" full required hint="カンマ区切り"><input id="keywordsEn" name="keywordsEn" required defaultValue={form.keywordsEn} /></Field>
    </div></section>
    <section className="form-section"><h2>掲載ファイル</h2><div className="grid">
      <Field label="原稿の種類" name="manuscriptType" full required><select id="manuscriptType" name="manuscriptType" value={form.manuscriptType} onChange={(event) => update("manuscriptType", event.target.value)}><option>Author Accepted Manuscript</option><option>Published Version</option><option>Preprint</option></select></Field>
      <Field label="ライセンス" name="license" full hint="リポジトリに掲載するPDFへ適用する利用条件を選択"><select id="license" name="license" value={form.license ?? ""} onChange={(event) => update("license", event.target.value)}>{LICENSE_OPTIONS.map((license) => <option key={license.value || "unset"} value={license.value}>{license.label}</option>)}</select></Field>
      <div className="field full"><label htmlFor="pdf">PDF</label><div className="file-drop"><input id="pdf" type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />{file ? <small>{file.name}（{(file.size / 1024 / 1024).toFixed(1)} MB）</small> : null}</div><small>{publication?.fileUrl ? "差し替える場合のみ選択してください。" : "任意。後から追加できます。選択する場合は、公開許諾を確認した25MB以下のPDFを使用してください。"}</small></div>
    </div></section>
    {error ? <p className="error">{error}</p> : null}
    <div className="actions">{isEditing ? <button className="button secondary" type="button" onClick={onExit}>キャンセル</button> : null}<button className="button" type="submit">内容を確認する</button></div>
  </form>;
}

function Field({ label, name, children, hint, full = false, required = false }: { label: string; name: string; children: ReactNode; hint?: string; full?: boolean; required?: boolean }) {
  return <div className={`field${full ? " full" : ""}`}><label htmlFor={name} className={required ? "required" : ""}>{label}</label>{children}{hint ? <small>{hint}</small> : null}</div>;
}

function Steps({ current }: { current: number }) {
  return <div className="steps" aria-label="登録手順"><div className={`step ${current === 1 ? "active" : ""}`}><span className="step-number">1</span><span className="step-text">情報入力</span></div><span className="step-line" /><div className={`step ${current === 2 ? "active" : ""}`}><span className="step-number">2</span><span className="step-text">内容確認・公開</span></div><span className="step-line" /><div className="step"><span className="step-number">3</span><span className="step-text">完了</span></div></div>;
}
