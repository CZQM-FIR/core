import { command, form, query } from '$app/server';
import { db } from '$lib/db';
import { Course } from '@czqm/common';
import { error, redirect } from '@sveltejs/kit';
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

export const getCourse = query(type('number.integer >= 0'), async (id) => {
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

		redirect(303, '/a/courses');
	}
);

export const deleteCourse = command(type('number.integer >= 0'), async (id) => {
	await authorizeVectorAdminAccess();

	const course = await Course.fetchById(id, db);

	if (!course) throw error(404, 'Course not found');

	await course.delete();

	getCourses().refresh();
});
