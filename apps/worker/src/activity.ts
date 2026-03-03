import { DB, User } from '@czqm/common';
import { Job, jobs, notifications } from '@czqm/db/schema';

const ACTIVITY_REMINDER_JOB_TYPE = 'activity_reminder';

const getPreviousScheduledExecutionTime = () => {
  const now = new Date();
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();

  const quarterEndMonths = [2, 5, 8, 11];
  let targetMonth = 11;
  let targetYear = currentYear;

  if (currentMonth < quarterEndMonths[0]) {
    targetYear = currentYear - 1;
  } else {
    for (let i = quarterEndMonths.length - 1; i >= 0; i--) {
      if (quarterEndMonths[i] <= currentMonth) {
        targetMonth = quarterEndMonths[i];
        break;
      }
    }
  }

  const previousScheduledExecutionTime = new Date(Date.UTC(targetYear, targetMonth, 1));

  return previousScheduledExecutionTime;
};

const runActivityReminderJob = (executeJobs: Job[]) => {
  const hasExecuted = executeJobs.some((job) => {
    return (
      job.type === ACTIVITY_REMINDER_JOB_TYPE &&
      new Date(job.executedTime) >= getPreviousScheduledExecutionTime()
    );
  });

  return !hasExecuted;
};

export const activityReminder = async (db: DB, executedJobs: Job[]) => {
  if (!runActivityReminderJob(executedJobs)) {
    return;
  }

  const users = [
    ...(await User.fromFlag(db, 'controller', {
      sessions: true,
      waitingPositions: true,
      enrolledPositions: true
    })),
    ...(await User.fromFlag(db, 'visitor', {
      sessions: true,
      waitingPositions: true,
      enrolledPositions: true
    }))
  ];

  const usersToNotify: User[] = users.filter((controller) => {
    const activityStatus = controller.active;
    const meetingRequirements = controller.hours.meetingActivityRequirement;
    const hasSessions = controller.sessions.length > 0;
    const exempt = controller.hasFlag('activity-excempt');
    const isStaff = controller.hasFlag('staff');
    const isInstructorOrMentor = controller.hasFlag(['instructor', 'mentor']);
    const isTraining = controller.enrolledPositions.length > 0;
    const isWaitlisted = controller.waitlistPositions.length > 0;

    return (
      activityStatus === 'active' &&
      !meetingRequirements &&
      hasSessions &&
      !exempt &&
      !isStaff &&
      !isInstructorOrMentor &&
      !isTraining &&
      !isWaitlisted
    );
  });

  await Promise.all(
    usersToNotify.map((user) => {
      const isVisitor = user.hasFlag('visitor');
      const localHoursIssue = user.hours.thisActivityHours < 3;
      const externalHoursIssue = isVisitor
        ? user.hours.thisQuarterExternal < user.hours.thisQuarter
        : user.hours.thisQuarter < user.hours.thisQuarterExternal;

      console.log(user.waitlistPositions, user.enrolledPositions);

      let message: string[];

      if (localHoursIssue) {
        console.log(
          `User ${user.cid} has only logged ${user.hours.thisActivityHours.toFixed(1)} hours in the current activity period.`
        );

        message = [
          `Hello ${user.name_full} (${user.cid}),`,
          `Our records indicate that you have not met the activity requirements for this quarter. You have only logged ${user.hours.thisActivityHours.toFixed(1)} hours in the current activity period, which is below the required 3 hours.`,
          `Please ensure that you log the required hours to maintain your active status. If you have any questions or believe this is an error, please contact the CZQM administration team by replying to this email.`,
          `Best regards,\nCZQM Team`
        ];
      } else if (externalHoursIssue) {
        message = [`Hello ${user.name_full} (${user.cid}),`];
        if (isVisitor) {
          console.log(
            `Visitor ${user.cid} has logged ${user.hours.thisQuarter.toFixed(1)} hours in CZQM but only ${user.hours.thisQuarterExternal.toFixed(1)} hours outside of CZQM this quarter.`
          );
          message.push(
            `Our records indicate that you have logged too many hours in CZQM for this quarter. You have logged ${user.hours.thisQuarter.toFixed(1)} hours on CZQM positions but only ${user.hours.thisQuarterExternal.toFixed(1)} hours outside of CZQM.`
          );
        } else {
          console.log(
            `Controller ${user.cid} has logged ${user.hours.thisQuarter.toFixed(1)} hours in CZQM but only ${user.hours.thisQuarterExternal.toFixed(1)} hours outside of CZQM this quarter.`
          );
          message.push(
            `Our records indicate that you have logged too many hours outside of CZQM for this quarter. You have logged ${user.hours.thisQuarter.toFixed(1)} hours on CZQM positions but ${user.hours.thisQuarterExternal.toFixed(1)} hours outside of CZQM.`
          );
        }

        message.push(
          `We wish to inform you that the VATSIM Transfer and Visiting Controller policy states the following: 6.4 All controllers must perform at least half of their controlling in their Home Allocation in any given quarter.`,
          `Please ensure that you meet the requirements to maintain your visitor status. If you have any questions or believe this is an error, please contact the CZQM administration team by replying to this email.`
        );
      } else {
        return null;
      }

      const subject = 'CZQM - Activity Reminder';
      const replyto = 'administration@czqm.ca';
      const bcc = ['administration@czqm.ca'];

      const body = /*html*/ `
      <html>
        <body>
          ${message.map((p) => `<p>${p}</p>`).join('\n')}
          <p><em>This is an automated message. This message was sent in accordance with <a href="https://czqm.ca/privacy">CZQM's Privacy Policy</a></em></p>
        </body>
      </html>
      `;

      return db.insert(notifications).values({
        userId: user.cid,
        type: 'trainingUpdates',
        message: JSON.stringify({ subject, body, replyto, bcc }),
        location: 'email',
        timestamp: new Date()
      });
    })
  );

  await db.insert(jobs).values({
    type: ACTIVITY_REMINDER_JOB_TYPE,
    scheduledTime: getPreviousScheduledExecutionTime(),
    executedTime: new Date()
  });
};
