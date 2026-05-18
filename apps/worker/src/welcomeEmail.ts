import { DB, User } from '@czqm/common';
import { notifications } from '@czqm/db/schema';
import { marked } from 'marked';

const WELCOME_EMAIL_SUBJECT = 'Welcome to CZQM';

export const sendWelcomeEmail = async (db: DB, user: User) => {
  const isVisitor = user.hasFlag('visitor');

  const emailContent = await db.query.emailContent.findFirst({
    where: {
      type: 'welcome_email',
      audience: isVisitor ? 'visitor' : 'controller'
    }
  });

  if (!emailContent) {
    console.warn(`No welcome email content found for ${isVisitor ? 'visitor' : 'controller'}`);
    return;
  }

  if (!user.email) {
    console.warn(`User ${user.cid} does not have an email address, cannot send welcome email`);
    return;
  }

  const bodyHtml = marked.parse(emailContent.content, { async: false }) as string;

  const body = /* html */ `
<html>
  <body>
    ${bodyHtml}
    <p><em>This is an automated message. This message was sent in accordance with <a href="https://czqm.ca/privacy">CZQM's Privacy Policy</a></em></p>
  </body>
</html>
  `;

  await db.insert(notifications).values({
    location: 'email',
    userId: user.cid,
    type: 'trainingUpdates',
    timestamp: new Date(),
    message: JSON.stringify({ subject: WELCOME_EMAIL_SUBJECT, body })
  });
};
