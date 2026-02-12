import { db } from '$lib/db';

export const getAllEvents = async () => {
	const eventData = db.query.events.findMany({
		orderBy: {
			start: 'desc'
		}
	});

	return eventData;
};

export const getEventById = async (id: number) => {
	const event = db.query.events.findFirst({
		where: {
			id: id
		}
	});

	return event;
};
