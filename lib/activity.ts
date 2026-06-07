// Activity log helper. Call logActivity(...) from any module after an important
// action. It's fire-and-forget (never block or fail the real operation because
// the audit write hiccuped) — the dashboard feed and accountability trail are
// nice-to-haves layered on top of the actual write.
import { prisma } from "@/lib/prisma";

export async function logActivity(params: {
  schoolId: string; performedById: string; action: string; description: string; entityType?: string; entityId?: string;
}) {
  try {
    await prisma.activityLog.create({
      data: { schoolId: params.schoolId, performedById: params.performedById, action: params.action, description: params.description, entityType: params.entityType, entityId: params.entityId },
    });
  } catch { /* never let logging break the caller */ }
}

export async function recentActivity(schoolId: string, limit = 10) {
  const rows = await prisma.activityLog.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { performedBy: { select: { name: true } } },
  });
  return rows.map((r) => ({ id: r.id, action: r.action, description: r.description, by: r.performedBy?.name ?? null, createdAt: r.createdAt.toISOString() }));
}
