import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { extractTextFromPdf } from "@/lib/pdf";
import { MAX_PDF_SIZE_BYTES, MAX_PDF_SIZE_LABEL } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const buffer = Buffer.from(await file.arrayBuffer());

  // Extract text from PDF
  let resumeText: string | undefined;
  try {
    resumeText = await extractTextFromPdf(buffer, { fileName: file.name, fileSize: file.size });
  } catch (err) {
    console.error("[resume] PDF extraction failed:", err);
  }

  if (!resumeText?.trim()) {
    return NextResponse.json({ error: "Could not extract text from this PDF. Try copy-pasting your resume text directly." }, { status: 422 });
  }

  try {
    await db.profile.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, resumeText },
      update: { resumeText },
    });
  } catch (err) {
    console.error("[resume] DB upsert failed:", err);
    return NextResponse.json({ error: "Database error saving resume." }, { status: 500 });
  }

  return NextResponse.json({ resumeText });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.profile.update({
    where: { userId: session.user.id },
    data: { resumeText: null },
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
