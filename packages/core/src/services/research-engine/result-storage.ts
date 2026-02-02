/**
 * Result and delivery log storage
 * Handles saving delivery logs to Firestore
 */

import { db } from "../firebase";
import type { Project } from "../../models/project";
import type { NewDeliveryLog, DeliveryStats } from "../../models/delivery-log";

/**
 * Save delivery log to Firestore
 */
export async function saveDeliveryLog(
  userId: string,
  projectId: string,
  project: Project,
  report: {
    markdown: string;
    title: string;
    summary: string;
    averageScore: number;
    resultCount?: number;
  },
  stats: DeliveryStats,
  resultUrls: string[],
  status: "pending" | "success" | "failed" | "partial" = "pending"
): Promise<string> {
  const deliveryLogsCollection = db
    .collection("users")
    .doc(userId)
    .collection("projects")
    .doc(projectId)
    .collection("deliveryLogs");

  // Destination is always email
  const destination: "email" = "email";

  const deliveryLogData: NewDeliveryLog = {
    projectId,
    userId,
    // Delivery destination
    destination,
    reportMarkdown: report.markdown,
    reportTitle: report.title,
    reportSummary: report.summary,
    stats,
    status, // Can be "pending" for pre-runs, "success" for immediate delivery
    retryCount: 0,
    resultUrls,
    createdAt: Date.now(), // When the log was created (during research)
    // deliveredAt is only set when the email is actually sent (in the scheduler)
    timezone: project.timezone,
  };

  const docRef = await deliveryLogsCollection.add(deliveryLogData);
  return docRef.id;
}
