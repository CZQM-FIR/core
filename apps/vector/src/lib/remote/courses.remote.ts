import { command, form, query } from '$app/server';
import { db } from '$lib/db';
import { Course, isTrainingSessionType, type PrerequisiteType, type TaskType } from '@czqm/common';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { authorizeVectorAdminAccess } from './auth';

const CourseId = type(/^[0-9a-z]{5}$/);

const TaskTypeSchema = type(
	"'moodle' | 'vatcan_cbt' | 'vatcan_exam' | 'training_session' | 'delay' | 'manual'"
);

const PrerequisiteTypeSchema = type(
	"'minimum_rating' | 'controlling_hours' | 'prior_course' | 'earliest_enroll_date' | 'home_controller' | 'visiting_controller' | 'home_or_visiting_controller'"
);

const FormId = type('string.integer > 0')
	.pipe((value) => Number(value))
	.to('number.integer > 0');

const CourseTaskOptions = type({
	courseId: CourseId,
	taskId: FormId,
	taskType: TaskTypeSchema,
	'taskValue1?': 'string',
	'taskValue2?': 'string'
});

const CoursePrerequisiteOptions = type({
	courseId: CourseId,
	prerequisiteId: FormId,
	prerequisiteType: PrerequisiteTypeSchema,
	'prerequisiteValue1?': 'string',
	'prerequisiteValue2?': 'string'
});

function validateTrainingSessionTaskValues(
	taskValue1: string | undefined,
	taskValue2: string | undefined
): { taskValue1: string; taskValue2: string | null } {
	if (!taskValue1 || !isTrainingSessionType(taskValue1)) {
		throw error(
			400,
			'Training session type is required and must be monitoring, sweatbox, orientation, ots, or generic'
		);
	}

	const trimmedName = taskValue2?.trim();
	return {
		taskValue1,
		taskValue2: trimmedName ? trimmedName : null
	};
}

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

export const getCourse = query(CourseId, async (id) => {
	await authorizeVectorAdminAccess();

	const course = await db.query.courses.findFirst({
		where: { id },
		with: {
			waitlist: {
				with: {
					students: {
						orderBy: (students) => [students.position],
						with: {
							user: true
						}
					}
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

export const updateCourse = form(
	type({
		id: CourseId,
		name: 'string',
		description: 'string'
	}),
	async ({ id, name, description }) => {
		await authorizeVectorAdminAccess();

		const course = await Course.fetchById(id, db);
		if (!course) throw error(404, 'Course not found');

		await course.setName(name);
		await course.setDescription(description || null);

		getCourses().refresh();

		return { ok: true };
	}
);

export const saveCourse = command(
	type({
		id: CourseId,
		name: 'string',
		description: 'string'
	}),
	async ({ id, name, description }) => {
		await authorizeVectorAdminAccess();

		const course = await Course.fetchById(id, db);
		if (!course) throw error(404, 'Course not found');

		await course.setName(name);
		await course.setDescription(description || null);

		getCourses().refresh();

		return { ok: true };
	}
);

export const deleteCourse = command(CourseId, async (id) => {
	await authorizeVectorAdminAccess();

	const course = await Course.fetchById(id, db);

	if (!course) throw error(404, 'Course not found');

	await course.delete();

	getCourses().refresh();
});

export const createCourseTask = form(
	type({
		courseId: CourseId,
		taskType: TaskTypeSchema,
		'taskValue1?': 'string',
		'taskValue2?': 'string'
	}),
	async ({ courseId, taskType, taskValue1, taskValue2 }) => {
		await authorizeVectorAdminAccess();

		const course = await Course.fetchById(courseId, db);
		if (!course) throw error(404, 'Course not found');

		let resolvedTaskValue1 = taskValue1 ?? null;
		let resolvedTaskValue2 = taskValue2 ?? null;

		if (taskType === 'training_session') {
			const validated = validateTrainingSessionTaskValues(taskValue1, taskValue2);
			resolvedTaskValue1 = validated.taskValue1;
			resolvedTaskValue2 = validated.taskValue2;
		}

		await course.createTask(taskType as TaskType, resolvedTaskValue1, resolvedTaskValue2);

		getCourse(courseId).refresh();

		return { ok: true };
	}
);

export const updateCourseTask = form(CourseTaskOptions, async (data) => {
	await authorizeVectorAdminAccess();

	const course = await Course.fetchById(data.courseId, db);
	if (!course) throw error(404, 'Course not found');

	let resolvedTaskValue1 = data.taskValue1 ?? null;
	let resolvedTaskValue2 = data.taskValue2 ?? null;

	if (data.taskType === 'training_session') {
		const validated = validateTrainingSessionTaskValues(data.taskValue1, data.taskValue2);
		resolvedTaskValue1 = validated.taskValue1;
		resolvedTaskValue2 = validated.taskValue2;
	}

	await course.updateTask(
		data.taskId,
		data.taskType as TaskType,
		resolvedTaskValue1,
		resolvedTaskValue2
	);

	getCourse(data.courseId).refresh();

	return { ok: true };
});

export const deleteCourseTask = command(
	type({
		courseId: CourseId,
		taskId: 'number.integer > 0'
	}),
	async ({ courseId, taskId }) => {
		await authorizeVectorAdminAccess();

		const course = await Course.fetchById(courseId, db);
		if (!course) throw error(404, 'Course not found');

		await course.deleteTask(taskId);

		getCourse(courseId).refresh();
	}
);

export const moveCourseTaskUp = command(
	type({
		courseId: CourseId,
		taskId: 'number.integer > 0'
	}),
	async ({ courseId, taskId }) => {
		await authorizeVectorAdminAccess();

		const course = await Course.fetchById(courseId, db);
		if (!course) throw error(404, 'Course not found');

		await course.moveTaskUp(taskId);

		getCourse(courseId).refresh();
	}
);

export const moveCourseTaskDown = command(
	type({
		courseId: CourseId,
		taskId: 'number.integer > 0'
	}),
	async ({ courseId, taskId }) => {
		await authorizeVectorAdminAccess();

		const course = await Course.fetchById(courseId, db);
		if (!course) throw error(404, 'Course not found');

		await course.moveTaskDown(taskId);

		getCourse(courseId).refresh();
	}
);

export const getRatings = query(async () => {
	await authorizeVectorAdminAccess();

	return db.query.ratings.findMany();
});

export const createCoursePrerequisite = form(
	type({
		courseId: CourseId,
		prerequisiteType: PrerequisiteTypeSchema,
		'prerequisiteValue1?': 'string',
		'prerequisiteValue2?': 'string'
	}),
	async ({ courseId, prerequisiteType, prerequisiteValue1, prerequisiteValue2 }) => {
		await authorizeVectorAdminAccess();

		const course = await Course.fetchById(courseId, db);
		if (!course) throw error(404, 'Course not found');

		await course.createPrerequisite(
			prerequisiteType as PrerequisiteType,
			prerequisiteValue1 ?? null,
			prerequisiteValue2 ?? null
		);

		getCourse(courseId).refresh();

		return { ok: true };
	}
);

export const updateCoursePrerequisite = form(CoursePrerequisiteOptions, async (data) => {
	await authorizeVectorAdminAccess();

	const course = await Course.fetchById(data.courseId, db);
	if (!course) throw error(404, 'Course not found');

	await course.updatePrerequisite(
		data.prerequisiteId,
		data.prerequisiteType as PrerequisiteType,
		data.prerequisiteValue1 ?? null,
		data.prerequisiteValue2 ?? null
	);

	getCourse(data.courseId).refresh();

	return { ok: true };
});

export const deleteCoursePrerequisite = command(
	type({
		courseId: CourseId,
		prerequisiteId: 'number.integer > 0'
	}),
	async ({ courseId, prerequisiteId }) => {
		await authorizeVectorAdminAccess();

		const course = await Course.fetchById(courseId, db);
		if (!course) throw error(404, 'Course not found');

		await course.deletePrerequisite(prerequisiteId);

		getCourse(courseId).refresh();
	}
);
