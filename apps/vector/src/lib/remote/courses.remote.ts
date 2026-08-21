import { command, form, query } from '$app/server';
import { db } from '$lib/db';
import {
	Course,
	encodeVatcanCbtTaskValue2,
	fetchVatcanCbtBlockOptions,
	findVatcanCbtBlock,
	isRosterPosition,
	isTrainingSessionType,
	parseRatingComparison,
	parseSoloDurationDays,
	requireTrainingSessionObjectives,
	type PrerequisiteType,
	type TaskType
} from '@czqm/common';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { authorizeVectorAdminAccess } from './auth';

const CourseId = type(/^[0-9a-z]{5}$/);

const TaskTypeSchema = type(
	"'moodle' | 'vatcan_cbt' | 'vatcan_exam' | 'training_session' | 'delay' | 'manual' | 'certify' | 'solo'"
);

const PrerequisiteTypeSchema = type(
	"'rating' | 'controlling_hours' | 'prior_course' | 'earliest_enroll_date' | 'home_controller' | 'visiting_controller' | 'home_or_visiting_controller'"
);

const FormId = type('string.integer > 0')
	.pipe((value) => Number(value))
	.to('number.integer > 0');

const CourseTaskOptions = type({
	courseId: CourseId,
	taskId: FormId,
	taskType: TaskTypeSchema,
	'taskValue1?': 'string',
	'taskValue2?': 'string',
	'objectivesJson?': 'string'
});

async function resolveVatcanCbtTaskValues(blockKey: string): Promise<{
	taskValue1: string;
	taskValue2: string;
}> {
	if (!env.VATCAN_API_TOKEN) {
		throw error(400, 'VATCAN API token is not configured on this server.');
	}

	const blocks = await fetchVatcanCbtBlockOptions(
		{ VATCAN_API_TOKEN: env.VATCAN_API_TOKEN },
		{ requireFacility: true }
	);
	const block = findVatcanCbtBlock(blocks, blockKey);
	if (!block) {
		throw error(400, `CBT block ${blockKey} was not found in the VATCAN catalog`);
	}

	return { taskValue1: String(block.id), taskValue2: encodeVatcanCbtTaskValue2(block) };
}

const CBT_BLOCK_KEY_PATTERN = /^(?:(?:division|facility):)?\d+$/;

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

function validateCertifyTaskValues(taskValue1: string | undefined): {
	taskValue1: string;
	taskValue2: null;
} {
	const position = taskValue1?.trim();
	if (!position || !isRosterPosition(position)) {
		throw error(400, 'Certify position is required and must be Ground, Tower, Approach, or Centre');
	}

	return { taskValue1: position, taskValue2: null };
}

async function validateSoloTaskValues(
	taskValue1: string | undefined,
	taskValue2: string | undefined
): Promise<{ taskValue1: string; taskValue2: string }> {
	const callsign = taskValue1?.trim().toUpperCase();
	if (!callsign) {
		throw error(400, 'Solo position is required');
	}

	const position = await db.query.positions.findFirst({
		where: { callsign }
	});
	if (!position) {
		throw error(400, `Position not found: ${callsign}`);
	}

	try {
		const durationDays = parseSoloDurationDays(taskValue2);
		return { taskValue1: callsign, taskValue2: String(durationDays) };
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : 'Invalid solo duration');
	}
}

function parseTrainingSessionObjectives(objectivesJson: string | undefined): string[] {
	let parsed: unknown = [];
	if (objectivesJson?.trim()) {
		try {
			parsed = JSON.parse(objectivesJson);
		} catch {
			throw error(400, 'Invalid objectives');
		}
	}

	if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
		throw error(400, 'Invalid objectives');
	}

	try {
		return requireTrainingSessionObjectives(parsed);
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : 'Invalid objectives');
	}
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
		'taskValue2?': 'string',
		'objectivesJson?': 'string'
	}),
	async ({ courseId, taskType, taskValue1, taskValue2, objectivesJson }) => {
		await authorizeVectorAdminAccess();

		const course = await Course.fetchById(courseId, db);
		if (!course) throw error(404, 'Course not found');

		let resolvedTaskValue1 = taskValue1 ?? null;
		let resolvedTaskValue2 = taskValue2 ?? null;
		let resolvedObjectives: string[] = [];

		if (taskType === 'training_session') {
			const validated = validateTrainingSessionTaskValues(taskValue1, taskValue2);
			resolvedTaskValue1 = validated.taskValue1;
			resolvedTaskValue2 = validated.taskValue2;
			resolvedObjectives = parseTrainingSessionObjectives(objectivesJson);
		}

		if (taskType === 'vatcan_cbt') {
			const blockKey = taskValue1?.trim();
			if (!blockKey || !CBT_BLOCK_KEY_PATTERN.test(blockKey)) {
				throw error(400, 'CBT block is required');
			}
			const resolved = await resolveVatcanCbtTaskValues(blockKey);
			resolvedTaskValue1 = resolved.taskValue1;
			resolvedTaskValue2 = resolved.taskValue2;
		}

		if (taskType === 'certify') {
			const validated = validateCertifyTaskValues(taskValue1);
			resolvedTaskValue1 = validated.taskValue1;
			resolvedTaskValue2 = validated.taskValue2;
		}

		if (taskType === 'solo') {
			const validated = await validateSoloTaskValues(taskValue1, taskValue2);
			resolvedTaskValue1 = validated.taskValue1;
			resolvedTaskValue2 = validated.taskValue2;
		}

		await course.createTask(
			taskType as TaskType,
			resolvedTaskValue1,
			resolvedTaskValue2,
			resolvedObjectives
		);

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
	let resolvedObjectives: string[] = [];

	if (data.taskType === 'training_session') {
		const validated = validateTrainingSessionTaskValues(data.taskValue1, data.taskValue2);
		resolvedTaskValue1 = validated.taskValue1;
		resolvedTaskValue2 = validated.taskValue2;
		resolvedObjectives = parseTrainingSessionObjectives(data.objectivesJson);
	}

	if (data.taskType === 'vatcan_cbt') {
		const blockKey = data.taskValue1?.trim();
		if (!blockKey || !CBT_BLOCK_KEY_PATTERN.test(blockKey)) {
			throw error(400, 'CBT block is required');
		}
		const resolved = await resolveVatcanCbtTaskValues(blockKey);
		resolvedTaskValue1 = resolved.taskValue1;
		resolvedTaskValue2 = resolved.taskValue2;
	}

	if (data.taskType === 'certify') {
		const validated = validateCertifyTaskValues(data.taskValue1);
		resolvedTaskValue1 = validated.taskValue1;
		resolvedTaskValue2 = validated.taskValue2;
	}

	if (data.taskType === 'solo') {
		const validated = await validateSoloTaskValues(data.taskValue1, data.taskValue2);
		resolvedTaskValue1 = validated.taskValue1;
		resolvedTaskValue2 = validated.taskValue2;
	}

	await course.updateTask(
		data.taskId,
		data.taskType as TaskType,
		resolvedTaskValue1,
		resolvedTaskValue2,
		resolvedObjectives
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

export const getFacilityPositions = query(async () => {
	await authorizeVectorAdminAccess();

	const rows = await db.query.positions.findMany({
		orderBy: (positions, { asc }) => [asc(positions.callsign)]
	});

	return rows.filter((position) => {
		const name = position.name.trim();
		const callsign = position.callsign.trim();
		if (callsign === 'UNKN' || callsign === 'EXTERNAL') return false;
		return name.length > 0 && name.toUpperCase() !== callsign.toUpperCase();
	});
});

export const getVatcanCbtBlocks = query(async () => {
	await authorizeVectorAdminAccess();

	if (!env.VATCAN_API_TOKEN) {
		return {
			blocks: [],
			error: 'VATCAN API token is not configured on this server.'
		};
	}

	try {
		const blocks = await fetchVatcanCbtBlockOptions({
			VATCAN_API_TOKEN: env.VATCAN_API_TOKEN
		});
		return { blocks, error: null };
	} catch (err) {
		return {
			blocks: [],
			error: err instanceof Error ? err.message : 'Failed to load CBT blocks from VATCAN.'
		};
	}
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

		if (prerequisiteType === 'rating') {
			const comparison = parseRatingComparison(prerequisiteValue2 ?? null);
			if (!comparison) {
				throw error(400, 'Rating comparison must be equal, minimum, or maximum');
			}

			const requiredRatingId = Number(prerequisiteValue1);
			if (!Number.isFinite(requiredRatingId) || requiredRatingId <= 0) {
				throw error(400, 'Rating is required and cannot be inactive or suspended');
			}
		}

		await course.createPrerequisite(
			prerequisiteType as PrerequisiteType,
			prerequisiteValue1 ?? null,
			prerequisiteValue2 ?? null
		);

		getCourse(courseId).refresh();

		return { ok: true };
	}
);

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
