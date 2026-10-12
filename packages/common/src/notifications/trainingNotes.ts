import { notifications } from "@czqm/db/schema";
import type { DB } from "../db";

type Participant = {
  cid: number;
  name_full: string;
  displayName: string;
};

export type QueueTrainingNotesSubmittedEmailInput = {
  courseName: string;
  sessionId: number;
  student: Participant;
  instructor: Participant;
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

export async function queueTrainingNotesSubmittedEmail(
  db: DB,
  input: QueueTrainingNotesSubmittedEmailInput,
): Promise<void> {
  const sessionUrl = `${input.vectorUrl}/sessions/${input.sessionId}`;
  const notesUrl = `${input.vectorUrl}/notes`;
  const instructorLabel = input.instructor.displayName;

  await db.insert(notifications).values({
    timestamp: new Date(),
    userId: input.student.cid,
    type: "trainingUpdates",
    location: "email",
    message: buildEmailPayload("CZQM - Training notes available", [
      `Hello ${input.student.name_full} (${input.student.cid}),`,
      `${instructorLabel} has submitted training notes for your session in ${input.courseName}.`,
      `<a href=${sessionUrl}>View the notes for this session in Vector</a>`,
      `<a href=${notesUrl}>View all of your training notes</a>`,
      "Best regards,",
      "CZQM Training Team",
    ]),
  });
}
