import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      request, body,
      onBeforeGenerateToken: async (pathname) => {
        const admin = await getAdmin();
        if (!admin) throw new Error("ログインが必要です。");
        if (!pathname.toLowerCase().endsWith(".pdf")) throw new Error("PDFのみアップロードできます。");
        return { allowedContentTypes: ["application/pdf"], maximumSizeInBytes: 25 * 1024 * 1024, addRandomSuffix: true, allowOverwrite: false, tokenPayload: admin.email };
      },
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "アップロードを開始できません。" }, { status: 400 });
  }
}
