import { notifications } from "@czqm/db/schema";
import type { DB } from "../db";

export type TrainingSessionEmailEvent =
  | "scheduled"
  | "confirmed"
  | "declined"
  | "cancelled";

type Participant = {
  cid: number;
  name_full: string;
  displayName: string;
};

type QueueTrainingSessionEmailsInput = {
  event: TrainingSessionEmailEvent;
  courseId: string;
  courseName: string;
  studentCid: number;
  scheduledByCid: number;
  startsAt: Date;
  endsAt: Date;
  student: Participant;
  scheduler: Participant;
  vectorUrl: string;
};

function formatSessionRange(startsAt: Date, endsAt: Date): string {
  const dateLabel = startsAt.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const startTime = startsAt.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = endsAt.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateLabel}, ${startTime} - ${endTime}`;
}

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

function getStudentCopy(
  event: TrainingSessionEmailEvent,
  input: QueueTrainingSessionEmailsInput,
): { subject: string; paragraphs: string[] } {
  const sessionRange = formatSessionRange(input.startsAt, input.endsAt);
  const courseUrl = `${input.vectorUrl}/courses/${input.courseId}`;
  const schedulerLabel = input.scheduler.displayName;

  switch (event) {
    case "scheduled":
      return {
        subject: "CZQM - [ACTION REQUIRED] Training session scheduled",
        paragraphs: [
          `Hello ${input.student.name_full} (${input.student.cid}),`,
          `${schedulerLabel} has scheduled a training session for you in ${input.courseName}.`,
          `Session time: ${sessionRange}`,
          `<a href=${courseUrl}>Please confirm or decline this session in Vector</a>`,
          "Best regards,",
          "CZQM Training Team",
        ],
      };
    case "confirmed":
      return {
        subject: "CZQM - Training session confirmed",
        paragraphs: [
          `Hello ${input.student.name_full} (${input.student.cid}),`,
          `You confirmed your training session in ${input.courseName}.`,
          `Session time: ${sessionRange}`,
          `<a href=${courseUrl}>View your course in Vector</a>`,
          "Best regards,",
          "CZQM Training Team",
        ],
      };
    case "declined":
      return {
        subject: "CZQM - Training session declined",
        paragraphs: [
          `Hello ${input.student.name_full} (${input.student.cid}),`,
          `You declined the training session scheduled by ${schedulerLabel} in ${input.courseName}.`,
          `Session time: ${sessionRange}`,
          `<a href=${courseUrl}>View your course in Vector</a>`,
          "Best regards,",
          "CZQM Training Team",
        ],
      };
    case "cancelled":
      return {
        subject: "CZQM - Training session cancelled",
        paragraphs: [
          `Hello ${input.student.name_full} (${input.student.cid}),`,
          `The training session in ${input.courseName} has been cancelled.`,
          `Session time: ${sessionRange}`,
          `<a href=${courseUrl}>View your course in Vector</a>`,
          "Best regards,",
          "CZQM Training Team",
        ],
      };
  }
}

function getSchedulerCopy(
  event: TrainingSessionEmailEvent,
  input: QueueTrainingSessionEmailsInput,
): { subject: string; paragraphs: string[] } {
  const sessionRange = formatSessionRange(input.startsAt, input.endsAt);
  const studentUrl = `${input.vectorUrl}/i/${input.courseId}/${input.studentCid}`;
  const studentLabel = input.student.displayName;

  switch (event) {
    case "scheduled":
      return {
        subject: `CZQM - Training session scheduled with ${studentLabel}`,
        paragraphs: [
          `Hello ${input.scheduler.name_full} (${input.scheduler.cid}),`,
          `You scheduled a training session with ${studentLabel} in ${input.courseName}.`,
          `Session time: ${sessionRange}`,
          `The student has been asked to confirm or decline.`,
          `<a href=${studentUrl} > View student in Vector </a>`,
          "Best regards,",
          "CZQM Training Team",
        ],
      };
    case "confirmed":
      return {
        subject: `CZQM - ${studentLabel} confirmed your training session`,
        paragraphs: [
          `Hello ${input.scheduler.name_full} (${input.scheduler.cid}),`,
          `${studentLabel} confirmed the training session you scheduled in ${input.courseName}.`,
          `Session time: ${sessionRange}`,
          `<a href=${studentUrl}>View student in Vector</a>`,
          "Best regards,",
          "CZQM Training Team",
        ],
      };
    case "declined":
      return {
        subject: `CZQM - ${studentLabel} declined your training session`,
        paragraphs: [
          `Hello ${input.scheduler.name_full} (${input.scheduler.cid}),`,
          `${studentLabel} declined the training session you scheduled in ${input.courseName}.`,
          `Session time: ${sessionRange}`,
          `<a href=${studentUrl}>View student in Vector</a>`,
          "Best regards,",
          "CZQM Training Team",
        ],
      };
    case "cancelled":
      return {
        subject: `CZQM - Training session with ${studentLabel} cancelled`,
        paragraphs: [
          `Hello ${input.scheduler.name_full} (${input.scheduler.cid}),`,
          `The training session with ${studentLabel} in ${input.courseName} has been cancelled.`,
          `Session time: ${sessionRange}`,
          `<a href=${studentUrl}>View student in Vector</a>`,
          "Best regards,",
          "CZQM Training Team",
        ],
      };
  }
}

export async function queueTrainingSessionEmails(
  db: DB,
  input: QueueTrainingSessionEmailsInput,
): Promise<void> {
  const now = new Date();
  const studentCopy = getStudentCopy(input.event, input);
  const schedulerCopy = getSchedulerCopy(input.event, input);

  await db.insert(notifications).values([
    {
      timestamp: now,
      userId: input.studentCid,
      type: "trainingUpdates",
      location: "email",
      message: buildEmailPayload(studentCopy.subject, studentCopy.paragraphs),
    },
    {
      timestamp: now,
      userId: input.scheduledByCid,
      type: "trainingUpdates",
      location: "email",
      message: buildEmailPayload(
        schedulerCopy.subject,
        schedulerCopy.paragraphs,
      ),
    },
  ]);
}
