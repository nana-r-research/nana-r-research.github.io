export type PublicationInput = {
  language: "en" | "ja";
  titleEn: string; titleJa?: string;
  authorsEn: string; authorsJa?: string;
  affiliationsEn: string; affiliationsJa?: string;
  journalEn: string; journalJa?: string;
  year: number; volume?: string; issue?: string; pages?: string; doi?: string;
  abstractEn: string; abstractJa?: string;
  keywordsEn: string; keywordsJa?: string;
  manuscriptType: string;
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
  const required = [input.titleEn, input.authorsEn, input.affiliationsEn, input.journalEn, input.abstractEn, input.keywordsEn, input.manuscriptType];
  if (required.some((value) => !value?.trim())) throw new Error("必須の書誌情報が不足しています。");
  if (!Number.isInteger(input.year) || input.year < 1900 || input.year > 2100) throw new Error("出版年を確認してください。");
  if (input.language === "ja" && [input.titleJa, input.authorsJa, input.affiliationsJa, input.journalJa, input.abstractJa, input.keywordsJa].some((value) => !value?.trim())) {
    throw new Error("日本語論文の日英情報が不足しています。");
  }
  if (!new Set(["Author Accepted Manuscript", "Published Version", "Preprint"]).has(input.manuscriptType)) throw new Error("原稿の種類を確認してください。");
}

function recordFor(id: string, input: PublicationInput) {
  const doi = (input.doi?.trim() ?? "").replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
  const common = {
    id,
    language: input.language,
    journal: {
      name: input.language === "ja" ? { ja: input.journalJa || input.journalEn, en: input.journalEn } : input.journalEn,
      year: input.year, volume: input.volume?.trim() ?? "", issue: input.issue?.trim() ?? "", pages: input.pages?.trim() ?? "", doi,
      url: doi ? `https://doi.org/${doi}` : "",
    },
    repository_file: { type: input.manuscriptType, url: `/files/${id}.pdf`, posted: new Date().toISOString().slice(0, 10) },
  };
  if (input.language === "ja") {
    return {
      ...common,
      title: { ja: input.titleJa || input.titleEn, en: input.titleEn },
      authors: pair(lines(input.authorsJa), lines(input.authorsEn)).map((name) => ({ name })),
      affiliations: pair(lines(input.affiliationsJa), lines(input.affiliationsEn)),
      abstract: { ja: input.abstractJa || input.abstractEn, en: input.abstractEn },
      keywords: { ja: words(input.keywordsJa), en: words(input.keywordsEn) },
    };
  }
  return { ...common, title: input.titleEn, authors: lines(input.authorsEn).map((name) => ({ name })), affiliations: lines(input.affiliationsEn), abstract: input.abstractEn, keywords: words(input.keywordsEn) };
}

export async function publishRecord(input: PublicationInput, pdf: ArrayBuffer) {
  validate(input);
  type Ref = { object: { sha: string } }; type Commit = { tree: { sha: string } }; type Content = Array<{ name: string }>; type Sha = { sha: string };
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
  const id = `NRR-${registrationYear}-${String(sequence).padStart(3, "0")}`;
  const record = recordFor(id, input);
  const [pdfBlob, jsonBlob] = await Promise.all([
    github<Sha>(`/repos/${owner}/${repo}/git/blobs`, { method: "POST", body: JSON.stringify({ content: Buffer.from(pdf).toString("base64"), encoding: "base64" }) }),
    github<Sha>(`/repos/${owner}/${repo}/git/blobs`, { method: "POST", body: JSON.stringify({ content: `${JSON.stringify(record, null, 2)}\n`, encoding: "utf-8" }) }),
  ]);
  const tree = await github<Sha>(`/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: commit.tree.sha, tree: [
      { path: `public/files/${id}.pdf`, mode: "100644", type: "blob", sha: pdfBlob.sha },
      { path: `data/outputs/${id}.json`, mode: "100644", type: "blob", sha: jsonBlob.sha },
    ] }),
  });
  const nextCommit = await github<Sha>(`/repos/${owner}/${repo}/git/commits`, { method: "POST", body: JSON.stringify({ message: `Publish ${id}`, tree: tree.sha, parents: [headSha] }) });
  await github(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, { method: "PATCH", body: JSON.stringify({ sha: nextCommit.sha, force: false }) });
  return { id, url: `https://${owner}.github.io/ja/outputs/${id.toLowerCase()}/` };
}
