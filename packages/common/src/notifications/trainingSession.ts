import { notifications } from "@czqm/db/schema";
import type { DB } from "../db";

export type TrainingSessionEmailEvent =
  | "scheduled"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "rescheduled"
  | "transferred";

type Participant = {
  cid: number;
  name_full: string;
  displayName: string;
};

type QueueTrainingSessionEmailsInput = {
  event: TrainingSessionEmailEvent;
  courseId: string;
  courseName: string;
  sessionId: number;
  studentCid: number;
  scheduledByCid: number;
  startsAt: Date;
  endsAt: Date;
  student: Participant;
  scheduler: Participant;
  previousScheduler?: Participant;
  vectorUrl: string;
};

function formatSessionRange(startsAt: Date, endsAt: Date): string {
  const startDateLabel = startsAt.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const startTime = startsAt.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const endTime = endsAt.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const sameDay =
    startsAt.getFullYear() === endsAt.getFullYear() &&
    startsAt.getMonth() === endsAt.getMonth() &&
    startsAt.getDate() === endsAt.getDate();

  if (sameDay) {
    return `${startDateLabel}, ${startTime} - ${endTime}`;
  }

  const endDateLabel = endsAt.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return `${startDateLabel}, ${startTime} - ${endDateLabel}, ${endTime}`;
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
  const sessionUrl = `${input.vectorUrl}/sessions/${input.sessionId}`;
  const schedulerLabel = input.scheduler.displayName;

  switch (event) {
    case "scheduled":
      return {
        subject: "CZQM - [ACTION REQUIRED] Training session scheduled",
        paragraphs: [
          `Hello ${input.student.name_full} (${input.student.cid}),`,
          `${schedulerLabel} has scheduled a training session for you in ${input.courseName}.`,
          `Session time: ${sessionRange}`,
          `<a href=${sessionUrl}>Please confirm or decline this session in Vector</a>`,
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
          `<a href=${sessionUrl}>View your session in Vector</a>`,
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
          `<a href=${sessionUrl}>View your session in Vector</a>`,
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
          `<a href=${sessionUrl}>View your session in Vector</a>`,
          "Best regards,",
          "CZQM Training Team",
        ],
      };
    case "rescheduled":
      return {
        subject: "CZQM - [ACTION REQUIRED] Training session rescheduled",
        paragraphs: [
          `Hello ${input.student.name_full} (${input.student.cid}),`,
          `${schedulerLabel} has rescheduled your training session in ${input.courseName}.`,
          `New session time: ${sessionRange}`,
          `<a href=${sessionUrl}>Please confirm or decline this session in Vector</a>`,
          "Best regards,",
          "CZQM Training Team",
        ],
      };
    case "transferred":
      return {
        subject: "CZQM - Training session transferred",
        paragraphs: [
          `Hello ${input.student.name_full} (${input.student.cid}),`,
          `Your training session in ${input.courseName} is now assigned to ${schedulerLabel}.`,
          `Session time: ${sessionRange}`,
          `<a href=${sessionUrl}>View your session in Vector</a>`,
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
  const sessionUrl = `${input.vectorUrl}/i/sessions/${input.sessionId}`;
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
          `<a href=${sessionUrl}>View session in Vector</a>`,
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
          `<a href=${sessionUrl}>View session in Vector</a>`,
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
          `<a href=${sessionUrl}>View session in Vector</a>`,
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
          `<a href=${sessionUrl}>View session in Vector</a>`,
          "Best regards,",
          "CZQM Training Team",
        ],
      };
    case "rescheduled":
      return {
        subject: `CZQM - Training session with ${studentLabel} rescheduled`,
        paragraphs: [
          `Hello ${input.scheduler.name_full} (${input.scheduler.cid}),`,
          `You rescheduled the training session with ${studentLabel} in ${input.courseName}.`,
          `New session time: ${sessionRange}`,
          `The student has been asked to confirm or decline the new time.`,
          `<a href=${sessionUrl}>View session in Vector</a>`,
          "Best regards,",
          "CZQM Training Team",
        ],
      };
    case "transferred":
      return {
        subject: `CZQM - Training session with ${studentLabel} transferred to you`,
        paragraphs: [
          `Hello ${input.scheduler.name_full} (${input.scheduler.cid}),`,
          `A training session with ${studentLabel} in ${input.courseName} was transferred to you.`,
          `Session time: ${sessionRange}`,
          `<a href=${sessionUrl}>View session in Vector</a>`,
          "Best regards,",
          "CZQM Training Team",
        ],
      };
  }
}

function getPreviousSchedulerCopy(
  input: QueueTrainingSessionEmailsInput,
): { subject: string; paragraphs: string[] } | null {
  if (!input.previousScheduler) return null;

  const sessionRange = formatSessionRange(input.startsAt, input.endsAt);
  const sessionUrl = `${input.vectorUrl}/i/sessions/${input.sessionId}`;
  const studentLabel = input.student.displayName;
  const newSchedulerLabel = input.scheduler.displayName;

  return {
    subject: `CZQM - Training session with ${studentLabel} transferred`,
    paragraphs: [
      `Hello ${input.previousScheduler.name_full} (${input.previousScheduler.cid}),`,
      `Your training session with ${studentLabel} in ${input.courseName} was transferred to ${newSchedulerLabel}.`,
      `Session time: ${sessionRange}`,
      `<a href=${sessionUrl}>View session in Vector</a>`,
      "Best regards,",
      "CZQM Training Team",
    ],
  };
}

export async function queueTrainingSessionEmails(
  db: DB,
  input: QueueTrainingSessionEmailsInput,
): Promise<void> {
  const now = new Date();
  const studentCopy = getStudentCopy(input.event, input);
  const schedulerCopy = getSchedulerCopy(input.event, input);
  const previousSchedulerCopy =
    input.event === "transferred" ? getPreviousSchedulerCopy(input) : null;

  const rows = [
    {
      timestamp: now,
      userId: input.studentCid,
      type: "trainingUpdates" as const,
      location: "email" as const,
      message: buildEmailPayload(studentCopy.subject, studentCopy.paragraphs),
    },
    {
      timestamp: now,
      userId: input.scheduledByCid,
      type: "trainingUpdates" as const,
      location: "email" as const,
      message: buildEmailPayload(
        schedulerCopy.subject,
        schedulerCopy.paragraphs,
      ),
    },
  ];

  if (
    previousSchedulerCopy &&
    input.previousScheduler &&
    input.previousScheduler.cid !== input.scheduledByCid &&
    input.previousScheduler.cid !== input.studentCid
  ) {
    rows.push({
      timestamp: now,
      userId: input.previousScheduler.cid,
      type: "trainingUpdates",
      location: "email",
      message: buildEmailPayload(
        previousSchedulerCopy.subject,
        previousSchedulerCopy.paragraphs,
      ),
    });
  }

  await db.insert(notifications).values(rows);
}
