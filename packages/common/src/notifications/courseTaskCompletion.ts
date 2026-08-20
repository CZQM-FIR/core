import { notifications } from "@czqm/db/schema";
import type { DB } from "../db";

export type CourseTaskCompletionEmailKind = "certify" | "solo";

type Recipient = {
  cid: number;
  name_full: string;
};

export type QueueCourseTaskCompletionEmailInput = {
  kind: CourseTaskCompletionEmailKind;
  courseId: string;
  courseName: string;
  student: Recipient;
  instructor: Recipient;
  summary: string;
  vectorUrl: string;
};

function buildEmailPayload(subject: string, paragraphs: string[]): string {
  const to = "training@czqm.ca";
  const replyto = "training@czqm.ca";
  const body = /*html*/ `
  <html>
    <body>
      ${paragraphs
        .map((p) => {
          const html = p.replace(/\n/g, "<br/>");
          return `<p>${html}</p>`;
        })
        .join("\n      ")}
      <p><em>This is an automated message. This message was sent in accordance with <a href="https://czqm.ca/privacy">CZQM's Privacy Policy</a></em></p>
    </body>
  </html>
  `;

  return JSON.stringify({ subject, body, to, replyto });
}

function getEmailCopy(input: QueueCourseTaskCompletionEmailInput): {
  subject: string;
  paragraphs: string[];
} {
  const studentUrl = `${input.vectorUrl}/i/${input.courseId}/${input.student.cid}`;
  const action =
    input.kind === "certify" ? "Roster certification" : "Solo endorsement";

  return {
    subject: `CZQM - ${action} issued in ${input.courseName}`,
    paragraphs: [
      `A ${input.kind === "certify" ? "certify" : "solo"} task was completed in Vector.`,
      `Student: ${input.student.name_full} (${input.student.cid})`,
      `Instructor: ${input.instructor.name_full} (${input.instructor.cid})`,
      `Course: ${input.courseName}`,
      input.summary,
      `<a href=${studentUrl}>View the student in Vector</a>`,
    ],
  };
}

export async function queueCourseTaskCompletionEmail(
  db: DB,
  input: QueueCourseTaskCompletionEmailInput,
): Promise<void> {
  const copy = getEmailCopy(input);

  await db.insert(notifications).values({
    timestamp: new Date(),
    userId: input.student.cid,
    type: "trainingUpdates",
    location: "email",
    message: buildEmailPayload(copy.subject, copy.paragraphs),
  });
}
