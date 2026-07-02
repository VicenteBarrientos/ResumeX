import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { put, del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { extractTextFromPdf } from "@/lib/pdf";
import { MAX_PDF_SIZE_BYTES, MAX_PDF_SIZE_LABEL } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST — upload a new resume PDF, store in Blob, extract text, save URL to profile
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("resumePdf");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "PDF file required." }, { status: 400 });
  }

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
  if (file.size > MAX_PDF_SIZE_BYTES) {
    return NextResponse.json({ error: `PDF must be ${MAX_PDF_SIZE_LABEL} or smaller.` }, { status: 400 });
  }

  // Delete old PDF if one exists
  const existing = await db.profile.findUnique({ where: { userId: session.user.id } });
  if (existing?.resumePdfUrl) {
    await del(existing.resumePdfUrl).catch(() => {});
  }

  // Upload to Vercel Blob
  const buffer = Buffer.from(await file.arrayBuffer());
  console.log("[resume] userId:", session.user.id, "file:", file.name, "size:", file.size);
  console.log("[resume] BLOB_READ_WRITE_TOKEN present:", !!process.env.BLOB_READ_WRITE_TOKEN);
  const blob = await put(`resumes/${session.user.id}/${file.name}`, buffer, {
    access: "public",
    contentType: "application/pdf",
  });

  // Extract text from PDF
  let resumeText: string | undefined;
  try {
    resumeText = await extractTextFromPdf(buffer, { fileName: file.name, fileSize: file.size });
  } catch {}

  // Save to profile
  await db.profile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      resumePdfUrl: blob.url,
      resumeText: resumeText ?? null,
    },
    update: {
      resumePdfUrl: blob.url,
      ...(resumeText ? { resumeText } : {}),
    },
  });

  return NextResponse.json({ url: blob.url, resumeText: resumeText ?? null });
}

// DELETE — remove stored PDF
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.profile.findUnique({ where: { userId: session.user.id } });
  if (profile?.resumePdfUrl) {
    await del(profile.resumePdfUrl).catch(() => {});
    await db.profile.update({
      where: { userId: session.user.id },
      data: { resumePdfUrl: null },
    });
  }

  return NextResponse.json({ success: true });
}
