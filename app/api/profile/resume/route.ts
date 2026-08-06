import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { extractTextFromPdf } from "@/lib/pdf";
import { MAX_PDF_SIZE_BYTES, MAX_PDF_SIZE_LABEL } from "@/lib/constants";
import { debugError } from "@/lib/debug-log";
import { assertAiQuota, recordUsage } from "@/lib/entitlements";
import { getOpenAiApiKey } from "@/lib/env";
import { quotaDenialResponse } from "@/lib/quota";
import { buildTokenUsage } from "@/lib/token-usage";
import OpenAI from "openai";

type ParsedContact = {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
};

async function parseContactFromResume(
  text: string,
): Promise<{ contact: ParsedContact; costUsd?: number }> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return { contact: {} };
  }

  try {
    const openai = new OpenAI({ apiKey });
    const model = "gpt-4o-mini";
    const res = await openai.chat.completions.create({
      model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `Extract contact info from this resume. Return JSON only with keys: fullName, email, phone, location, linkedinUrl. Use null for missing fields. No markdown.`,
        },
        { role: "user", content: text.slice(0, 3000) },
      ],
    });
    const raw = res.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    const usage = buildTokenUsage(
      model,
      res.usage?.prompt_tokens ?? 0,
      res.usage?.completion_tokens ?? 0,
    );
    return {
      contact: {
        fullName: parsed.fullName ?? undefined,
        email: parsed.email ?? undefined,
        phone: parsed.phone ?? undefined,
        location: parsed.location ?? undefined,
        linkedinUrl: parsed.linkedinUrl ?? undefined,
      },
      costUsd: usage.estimatedCostUsd,
    };
  } catch {
    return { contact: {} };
  }
}

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
    console.error("[resume] PDF extraction failed.");
    debugError("[resume] PDF extraction failure detail:", err);
  }

  if (!resumeText?.trim()) {
    return NextResponse.json({ error: "Could not extract text from this PDF. Try copy-pasting your resume text directly." }, { status: 422 });
  }

  // OpenAI contact parse is optional; only burn quota when a key is configured.
  let contact: ParsedContact = {};
  let contactCostUsd: number | undefined;
  if (getOpenAiApiKey()) {
    const denial = await assertAiQuota(session.user.id, "profile_resume");
    if (denial) return quotaDenialResponse(denial);
    const parsed = await parseContactFromResume(resumeText);
    contact = parsed.contact;
    contactCostUsd = parsed.costUsd;
  }

  try {
    await db.profile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        resumeText,
        ...(contact.fullName && { fullName: contact.fullName }),
        ...(contact.email && { email: contact.email }),
        ...(contact.phone && { phone: contact.phone }),
        ...(contact.location && { location: contact.location }),
        ...(contact.linkedinUrl && { linkedinUrl: contact.linkedinUrl }),
      },
      update: {
        resumeText,
        ...(contact.fullName && { fullName: contact.fullName }),
        ...(contact.email && { email: contact.email }),
        ...(contact.phone && { phone: contact.phone }),
        ...(contact.location && { location: contact.location }),
        ...(contact.linkedinUrl && { linkedinUrl: contact.linkedinUrl }),
      },
    });
  } catch (err) {
    console.error("[resume] DB upsert failed.");
    debugError("[resume] DB upsert failure detail:", err);
    return NextResponse.json({ error: "Database error saving resume." }, { status: 500 });
  }

  if (typeof contactCostUsd === "number") {
    await recordUsage(session.user.id, "profile_resume", contactCostUsd);
  }

  return NextResponse.json({ resumeText, contact });
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
