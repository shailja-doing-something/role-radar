import { prisma } from "@/lib/prisma";
import { startScheduler, stopScheduler, FREQUENCY_MS } from "@/lib/scheduler";

export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return Response.json(
    settings ?? { scrapeFrequency: null, emailDigest: false, emailRecipients: null }
  );
}

export async function POST(req: Request) {
  const { scrapeFrequency, emailDigest, emailRecipients } = await req.json() as {
    scrapeFrequency?: string | null;
    emailDigest?: boolean;
    emailRecipients?: string | null;
  };

  const freq   = scrapeFrequency   || null;
  const digest = Boolean(emailDigest);
  const recips = emailRecipients   || null;

  await prisma.settings.upsert({
    where:  { id: 1 },
    create: { id: 1, scrapeFrequency: freq, emailDigest: digest, emailRecipients: recips },
    update: { scrapeFrequency: freq, emailDigest: digest, emailRecipients: recips },
  });

  // Restart scheduler to reflect new frequency
  if (freq && FREQUENCY_MS[freq]) {
    startScheduler(FREQUENCY_MS[freq]);
  } else {
    stopScheduler();
  }

  return Response.json({ ok: true });
}
