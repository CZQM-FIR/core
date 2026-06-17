import { notifications } from "@czqm/db/schema";
import type { DB } from "../db";

export type CourseEnrollmentEmailEvent =
  | "waitlisted"
  | "enrolled"
  | "completed";

type StudentRecipient = {
  cid: number;
  name_full: string;
};

type QueueCourseEnrollmentEmailInput = {
  event: CourseEnrollmentEmailEvent;
  courseId: string;
  courseName: string;
  student: StudentRecipient;
  vectorUrl: string;
};

function buildEmailPayload(subject: string, paragraphs: string[]): string {
  const replyto = "administration@czqm.ca";
  const bcc = ["administration@czqm.ca"];
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

  return JSON.stringify({ subject, body, replyto, bcc });
}

function getEmailCopy(
  event: CourseEnrollmentEmailEvent,
  input: QueueCourseEnrollmentEmailInput,
): { subject: string; paragraphs: string[] } {
  const courseUrl = `${input.vectorUrl}/courses/${input.courseId}`;
  const greeting = `Hello ${input.student.name_full} (${input.student.cid}),`;

  switch (event) {
    case "waitlisted":
      return {
        subject: "CZQM - Added to course waitlist",
        paragraphs: [
          greeting,
          `You have been added to the waitlist for ${input.courseName}.`,
          `We will notify you by email when you are enrolled in the course.`,
          `<a href=${courseUrl}>View your course status in Vector</a>`,
          "Best regards,",
          "CZQM Team",
        ],
      };
    case "enrolled":
      return {
        subject: "CZQM - Enrolled in course",
        paragraphs: [
          greeting,
          `You have been enrolled in ${input.courseName}.`,
          `You can now begin working on your course tasks.`,
          `<a href=${courseUrl}>View your course in Vector</a>`,
          "Best regards,",
          "CZQM Team",
        ],
      };
    case "completed":
      return {
        subject: "CZQM - Course completed",
        paragraphs: [
          greeting,
          `Congratulations! You have completed ${input.courseName}.`,
          `<a href=${courseUrl}>View your completed course in Vector</a>`,
          "Best regards,",
          "CZQM Team",
        ],
      };
  }
}

export async function queueCourseEnrollmentEmail(
  db: DB,
  input: QueueCourseEnrollmentEmailInput,
): Promise<void> {
  const copy = getEmailCopy(input.event, input);

  await db.insert(notifications).values({
    timestamp: new Date(),
    userId: input.student.cid,
    type: "trainingUpdates",
    location: "email",
    message: buildEmailPayload(copy.subject, copy.paragraphs),
  });
}
