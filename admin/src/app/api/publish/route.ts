import { del, get } from "@vercel/blob";
import { requireAdmin } from "@/lib/auth";
import { publishRecord, type PublicationInput } from "@/lib/github";

export const maxDuration = 60;

export async function POST(request: Request) {
  let blobUrl: string | undefined;
  try {
    await requireAdmin();
    const body = await request.json() as { blobUrl?: string; metadata?: PublicationInput; id?: string };
    blobUrl = body.blobUrl;
    if (!body.metadata) return Response.json({ error: "書誌情報がありません。" }, { status: 400 });
    let pdf: ArrayBuffer | undefined;
    if (body.blobUrl) {
      const result = await get(body.blobUrl, { access: "private", useCache: false });
      if (!result || result.statusCode !== 200 || !result.stream) return Response.json({ error: "一時保存したPDFを取得できません。" }, { status: 400 });
      pdf = await new Response(result.stream).arrayBuffer();
      if (new TextDecoder().decode(pdf.slice(0, 5)) !== "%PDF-") return Response.json({ error: "選択されたファイルはPDFではありません。" }, { status: 400 });
    }
    const published = await publishRecord(body.metadata, pdf, body.id);
    if (body.blobUrl) await del(body.blobUrl).catch(() => undefined);
    return Response.json(published);
  } catch (error) {
    if (blobUrl) await del(blobUrl).catch(() => undefined);
    return Response.json({ error: error instanceof Error ? error.message : "公開処理に失敗しました。" }, { status: 500 });
  }
}
