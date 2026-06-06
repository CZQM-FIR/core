import { command, form, query } from '$app/server';
import { db } from '$lib/db';
import { Course } from '@czqm/common';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { authorizeVectorAdminAccess } from './auth';

export const getCourses = query(async () => {
	await authorizeVectorAdminAccess();

	return db.query.courses.findMany({
		with: {
			waitlist: {
				with: {
					students: true
				}
			}
		}
	});
});

export const getCourse = query(type(/^[0-9a-z]{5}$/), async (id) => {
	await authorizeVectorAdminAccess();

	// Return a plain DB row, not a Course model instance: remote query results
	// are serialized over the wire, which strips methods and breaks on the db ref.
	const course = await db.query.courses.findFirst({
		where: { id },
		with: {
			waitlist: {
				with: {
					students: true
				}
			}
		}
	});

	if (!course) throw error(404, 'Course not found');

	return course;
});

export const createCourse = form(
	type({
		name: 'string',
		description: 'string'
	}),
	async ({ name, description }) => {
		await authorizeVectorAdminAccess();

		await Course.create(db, { name, description: description || null });

		getCourses().refresh();

		return { ok: true };
	}
);

export const deleteCourse = command(type(/^[0-9a-z]{5}$/), async (id) => {
	await authorizeVectorAdminAccess();

	const course = await Course.fetchById(id, db);

	if (!course) throw error(404, 'Course not found');

	await course.delete();

	getCourses().refresh();
});
