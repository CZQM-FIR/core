import { form, getRequestEvent, query } from '$app/server';
import { db } from '$lib/db';
import { tickets } from '@czqm/db/schema';
import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/auth';

export const getMyTickets = query(async () => {
  const event = getRequestEvent();
  if (!event.locals.user) {
    throw redirect(303, '/auth?redirect=/my/tickets');
  }
  const user = await db.query.users.findFirst({
    where: { cid: event.locals.user.cid },
    columns: { bio: false, email: false },
    with: {
      authoredTickets: {
        columns: { authorId: false, typeId: false },
        with: { type: true, messages: true }
      }
    }
  });
  return { user };
});

const getSingle = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export const submitTicket = form('unchecked', async (raw) => {
  const event = getRequestEvent();
  const { user } = await auth(event);
  if (!user) {
    return { status: 401, message: 'Error 401: Unauthorized' };
  }
  const categories = ['Other', 'Controller Feedback', 'Website Feedback'];
  const categoryRaw = getSingle(raw.category);
  const category = categoryRaw != null ? Number(categoryRaw) : NaN;
  if (category < 0 || category > categories.length) {
    return { status: '400', message: 'Error 400: Invalid category' };
  }
  const subject = getSingle(raw.subject)?.toString();
  const messageRaw = getSingle(raw.message)?.toString();
  if (!subject) {
    return { status: '400', message: 'Error 400: Subject is required' };
  }
  if (!messageRaw) {
    return { status: '400', message: 'Error 400: Message is required' };
  }
  if ((category === 1 && !getSingle(raw.controller)) || (category === 2 && !getSingle(raw.page))) {
    return { status: '400', message: 'Error 400: Missing data' };
  }
  let message = messageRaw;
  if (category === 1) {
    message = `Referenced Controller: ${getSingle(raw.controller)}\n\n${message}`;
  } else if (category === 2) {
    message = `Referenced Page: ${getSingle(raw.page)}\n\n${message}`;
  }
  await db.insert(tickets).values({
    subject,
    description: message,
    typeId: category,
    authorId: user.cid,
    status: 'open',
    createdAt: Math.floor(Date.now() / 1000)
  });
  return {
    status: '200',
    message:
      'Ticket Submitted! We will get back to you as soon as possible. Please see your tickets in myCZQM for a response.'
  };
});
