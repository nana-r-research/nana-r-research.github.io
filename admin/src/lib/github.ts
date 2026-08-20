import "server-only";
import { LICENSE_OPTIONS, licenseByValue } from "@/lib/licenses";

export type PublicationInput = {
  language: "en" | "ja";
  titleEn: string; titleJa?: string;
  authorsEn: string; authorsJa?: string;
  affiliationsEn: string; affiliationsJa?: string;
  journalEn: string; journalJa?: string;
  year: number; volume?: string; issue?: string; pages?: string; doi?: string; journalUrl?: string;
  abstractEn?: string; abstractJa?: string;
  keywordsEn: string; keywordsJa?: string;
  manuscriptType: string; license?: string;
};

export type EditablePublication = {
  id: string;
  fileUrl: string;
  fields: Record<string, string>;
};

const owner = process.env.GITHUB_OWNER ?? "nana-r-research";
const repo = process.env.GITHUB_REPO ?? "nana-r-research.github.io";
const branch = process.env.GITHUB_BRANCH ?? "main";

async function github<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const token = process.env.GITHUB_REPOSITORY_TOKEN;
  if (!token) throw new Error("GitHubの接続設定がありません。");
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(`GitHubへの登録に失敗しました（${response.status}）。`);
  return response.json() as Promise<T>;
}

const lines = (value?: string) => (value ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
const words = (value?: string) => (value ?? "").split(/[,、\n]/).map((item) => item.trim()).filter(Boolean);
const pair = (ja: string[], en: string[]) => Array.from({ length: Math.max(ja.length, en.length) }, (_, index) => ({ ja: ja[index] ?? en[index] ?? "", en: en[index] ?? ja[index] ?? "" }));

function validate(input: PublicationInput) {
  if (input.language !== "en" && input.language !== "ja") throw new Error("論文の言語を確認してください。");
  const required = [input.titleEn, input.authorsEn, input.affiliationsEn, input.journalEn, input.keywordsEn, input.manuscriptType];
  if (required.some((value) => !value?.trim())) throw new Error("必須の書誌情報が不足しています。");
  if (!Number.isInteger(input.year) || input.year < 1900 || input.year > 2100) throw new Error("出版年を確認してください。");
  if (input.language === "ja" && [input.titleJa, input.authorsJa, input.affiliationsJa, input.journalJa, input.keywordsJa].some((value) => !value?.trim())) {
    throw new Error("日本語論文の日英情報が不足しています。");
  }
  if (input.language === "ja" && Boolean(input.abstractJa?.trim()) !== Boolean(input.abstractEn?.trim())) throw new Error("抄録を入力する場合は、日本語と英語の両方を入力してください。");
  if (!new Set(["Author Accepted Manuscript", "Published Version", "Preprint", "External Link Only"]).has(input.manuscriptType)) throw new Error("原稿の種類を確認してください。");
  if (input.journalUrl?.trim()) {
    try { if (!new URL(input.journalUrl).protocol.match(/^https?:$/)) throw new Error(); }
    catch { throw new Error("出版社ページURLを確認してください。"); }
  }
  if (input.manuscriptType === "External Link Only" && !input.doi?.trim() && !input.journalUrl?.trim()) throw new Error("リンクのみの場合はDOIまたは出版社ページURLを入力してください。");
  if (!licenseByValue(input.license)) throw new Error("ライセンスを確認してください。");
}

function recordFor(id: string, input: PublicationInput, existingFile?: { posted?: string; url?: string }, hasNewPdf = false) {
  const doi = (input.doi?.trim() ?? "").replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
  const selectedLicense = licenseByValue(input.license);
  const repositoryFile = {
    type: input.manuscriptType,
    url: input.manuscriptType === "External Link Only" ? "" : hasNewPdf ? `/files/${id}.pdf` : existingFile?.url ?? "",
    posted: existingFile?.posted || new Date().toISOString().slice(0, 10),
    ...(input.manuscriptType !== "External Link Only" && selectedLicense?.value ? { license: { name: selectedLicense.name, url: selectedLicense.url } } : {}),
  };
  const abstractEn = input.abstractEn?.trim() ?? "";
  const abstractJa = input.abstractJa?.trim() ?? "";
  const common = {
    id,
    language: input.language,
    journal: {
      name: input.language === "ja" ? { ja: input.journalJa || input.journalEn, en: input.journalEn } : input.journalEn,
      year: input.year, volume: input.volume?.trim() ?? "", issue: input.issue?.trim() ?? "", pages: input.pages?.trim() ?? "", doi,
      url: input.journalUrl?.trim() || (doi ? `https://doi.org/${doi}` : ""),
    },
    repository_file: repositoryFile,
  };
  if (input.language === "ja") {
    return {
      ...common,
      title: { ja: input.titleJa || input.titleEn, en: input.titleEn },
      authors: pair(lines(input.authorsJa), lines(input.authorsEn)).map((name) => ({ name })),
      affiliations: pair(lines(input.affiliationsJa), lines(input.affiliationsEn)),
      ...(abstractJa && abstractEn ? { abstract: { ja: abstractJa, en: abstractEn } } : {}),
      keywords: { ja: words(input.keywordsJa), en: words(input.keywordsEn) },
    };
  }
  return { ...common, title: input.titleEn, authors: lines(input.authorsEn).map((name) => ({ name })), affiliations: lines(input.affiliationsEn), ...(abstractEn ? { abstract: abstractEn } : {}), keywords: words(input.keywordsEn) };
}

export async function publishRecord(input: PublicationInput, pdf?: ArrayBuffer, existingId?: string) {
  validate(input);
  if (input.manuscriptType === "External Link Only" && pdf) throw new Error("リンクのみではPDFを登録できません。");
  if (existingId && !/^NRR-\d{4}-\d{3}$/.test(existingId)) throw new Error("研究成果IDを確認してください。");
  type Ref = { object: { sha: string } }; type Commit = { tree: { sha: string } }; type Content = Array<{ name: string }>; type Sha = { sha: string }; type FileContent = { content: string };
  const ref = await github<Ref>(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  const headSha = ref.object.sha;
  const [commit, contents] = await Promise.all([
    github<Commit>(`/repos/${owner}/${repo}/git/commits/${headSha}`),
    github<Content>(`/repos/${owner}/${repo}/contents/data/outputs?ref=${branch}`),
  ]);
  const registrationYear = new Date().getFullYear();
  const sequence = contents.reduce((max, item) => {
    const match = item.name.match(new RegExp(`^NRR-${registrationYear}-(\\d{3})\\.json$`, "i"));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;
  const id = existingId || `NRR-${registrationYear}-${String(sequence).padStart(3, "0")}`;
  let existingFile: { posted?: string; url?: string } | undefined;
  if (existingId) {
    const existing = await github<FileContent>(`/repos/${owner}/${repo}/contents/data/outputs/${existingId}.json?ref=${branch}`);
    const record = JSON.parse(Buffer.from(existing.content.replace(/\s/g, ""), "base64").toString("utf8"));
    existingFile = record.repository_file;
  }
  if (input.manuscriptType === "External Link Only" && existingFile?.url) throw new Error("PDFが登録されている研究成果は「リンクのみ」に変更できません。");
  const record = recordFor(id, input, existingFile, Boolean(pdf));
  const jsonBlob = await github<Sha>(`/repos/${owner}/${repo}/git/blobs`, { method: "POST", body: JSON.stringify({ content: `${JSON.stringify(record, null, 2)}\n`, encoding: "utf-8" }) });
  const pdfBlob = pdf ? await github<Sha>(`/repos/${owner}/${repo}/git/blobs`, { method: "POST", body: JSON.stringify({ content: Buffer.from(pdf).toString("base64"), encoding: "base64" }) }) : undefined;
  const treeEntries = [
    { path: `data/outputs/${id}.json`, mode: "100644", type: "blob", sha: jsonBlob.sha },
    ...(pdfBlob ? [{ path: `public/files/${id}.pdf`, mode: "100644", type: "blob", sha: pdfBlob.sha }] : []),
  ];
  const tree = await github<Sha>(`/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: commit.tree.sha, tree: treeEntries }),
  });
  const nextCommit = await github<Sha>(`/repos/${owner}/${repo}/git/commits`, { method: "POST", body: JSON.stringify({ message: `${existingId ? "Update" : "Publish"} ${id}`, tree: tree.sha, parents: [headSha] }) });
  await github(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, { method: "PATCH", body: JSON.stringify({ sha: nextCommit.sha, force: false }) });
  return { id, url: `https://${owner}.github.io/ja/outputs/${id.toLowerCase()}/` };
}

type RepositoryRecord = {
  id: string;
  sample?: boolean;
  language?: "en" | "ja";
  title: string | { ja?: string; en?: string };
  authors: Array<{ name: string | { ja?: string; en?: string } }>;
  affiliations: Array<string | { ja?: string; en?: string }>;
  journal: { name: string | { ja?: string; en?: string }; year: number; volume?: string; issue?: string; pages?: string; doi?: string; url?: string };
  repository_file: { type: string; url?: string; posted?: string; license?: { name?: string; url?: string } };
  abstract?: string | { ja?: string; en?: string };
  keywords: string[] | { ja?: string[]; en?: string[] };
};

const localizedText = (value: string | { ja?: string; en?: string } | undefined, language: "ja" | "en") => typeof value === "string" ? (language === "en" ? value : "") : value?.[language] ?? "";
const localizedKeywords = (value: RepositoryRecord["keywords"], language: "ja" | "en") => Array.isArray(value) ? (language === "en" ? value : []) : value[language] ?? [];

export async function listPublicationDrafts(): Promise<EditablePublication[]> {
  type Content = Array<{ name: string }>; type FileContent = { content: string };
  const contents = await github<Content>(`/repos/${owner}/${repo}/contents/data/outputs?ref=${branch}`);
  const records = await Promise.all(contents.filter((item) => item.name.endsWith(".json")).map(async (item) => {
    const file = await github<FileContent>(`/repos/${owner}/${repo}/contents/data/outputs/${item.name}?ref=${branch}`);
    return JSON.parse(Buffer.from(file.content.replace(/\s/g, ""), "base64").toString("utf8")) as RepositoryRecord;
  }));
  return records.filter((record) => !record.sample).sort((a, b) => b.journal.year - a.journal.year || b.id.localeCompare(a.id)).map((record) => {
    const language = record.language === "ja" ? "ja" : "en";
    const license = LICENSE_OPTIONS.find((option) => option.url && option.url === record.repository_file.license?.url)
      ?? LICENSE_OPTIONS.find((option) => option.name && option.name === record.repository_file.license?.name);
    return {
      id: record.id,
      fileUrl: record.repository_file.url ?? "",
      fields: {
        language,
        titleEn: localizedText(record.title, "en"), titleJa: localizedText(record.title, "ja"),
        authorsEn: record.authors.map((author) => localizedText(author.name, "en")).join("\n"), authorsJa: record.authors.map((author) => localizedText(author.name, "ja")).join("\n"),
        affiliationsEn: record.affiliations.map((affiliation) => localizedText(affiliation, "en")).join("\n"), affiliationsJa: record.affiliations.map((affiliation) => localizedText(affiliation, "ja")).join("\n"),
        journalEn: localizedText(record.journal.name, "en"), journalJa: localizedText(record.journal.name, "ja"),
        year: String(record.journal.year), volume: record.journal.volume ?? "", issue: record.journal.issue ?? "", pages: record.journal.pages ?? "", doi: record.journal.doi ?? "", journalUrl: record.journal.url ?? "",
        abstractEn: localizedText(record.abstract, "en"), abstractJa: localizedText(record.abstract, "ja"),
        keywordsEn: localizedKeywords(record.keywords, "en").join(", "), keywordsJa: localizedKeywords(record.keywords, "ja").join(", "),
        manuscriptType: record.repository_file.type, license: license?.value ?? "",
      },
    };
  });
}
