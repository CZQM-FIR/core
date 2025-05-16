import { auth } from '$lib/auth';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { tickets } from '@czqm/db/schema';
import { db } from '$lib/db';

export const load = (async () => {
  return {};
}) satisfies PageServerLoad;

export const actions = {
  default: async (event) => {
    const { session, user } = await auth(event);

    if (!user) {
      return {
        status: 401,
        message: 'Error 401: Unauthorized'
      };
    }

    let data = await event.request.formData();

    const categories = ['Other', 'Controller Feedback', 'Website Feedback'];

    if (
      !data.get('category') ||
      0 > Number(data.get('category')) ||
      Number(data.get('category')) > categories.length
    ) {
      return {
        status: '400',
        message: 'Error 400: Invalid category'
      };
    }

    let category = Number(data.get('category'));

    if (!data.get('subject')) {
      return {
        status: '400',
        message: 'Error 400: Subject is required'
      };
    }

    if (!data.get('message')) {
      return {
        status: '400',
        message: 'Error 400: Message is required'
      };
    }

    let subject = data.get('subject')!.toString();
    let message = data.get('message')!.toString();

    if ((!data.get('controller') && category === 1) || (!data.get('page') && category === 2)) {
      return {
        status: '400',
        message: 'Error 400: Missing data'
      };
    }

    if (category === 1) {
      message = `Referenced Controller: ${data.get('controller')}\n\n${message}`;
    } else if (category === 2) {
      message = `Referenced Page: ${data.get('page')}\n\n${message}`;
    }

    await db.insert(tickets).values({
      subject,
      description: message,
      typeId: category,
      authorId: user.cid,
      status: 'open'
    });

    return {
      status: '200',
      message:
        'Ticket Submitted! We will get back to you as soon as possible. Please see your tickets in myCZQM for a response.'
    };
  }
};
