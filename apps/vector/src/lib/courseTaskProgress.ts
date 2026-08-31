import type { Course, CourseTask } from '@czqm/common';
import {
	CourseTaskCompletion,
	DelayCourseTask,
	describeCourseTask,
	fetchVatcanCbtBlockOptions,
	formatCourseTaskType,
	requiresInstructorToComplete,
	vatcanCbtBlockMetaFromOption,
	type VatcanCbtBlockMeta
} from '@czqm/common';
import { env } from '$env/dynamic/private';

export type CourseTaskProgress = {
	taskId: number;
	taskType: string;
	taskValue2: string | null;
	description: string;
	typeLabel: string;
	startedAt: Date | null;
	completedAt: Date | null;
	isComplete: boolean;
	manuallyCompletable: boolean;
	requiresInstructorCompletion: boolean;
	remainingLabel: string | null;
};

async function loadCompletionByTaskId(
	course: Course,
	cid: number
): Promise<Map<number, CourseTaskCompletion>> {
	const rows = await course.db.query.courseTaskCompletions.findMany({
		where: { userId: cid, courseId: course.id }
	});

	return new Map(rows.map((row) => [row.taskId, CourseTaskCompletion.fromDBRow(row, course.db)]));
}

export function findNextIncompleteTask(
	course: Course,
	completionByTaskId: Map<number, CourseTaskCompletion>
): CourseTask | null {
	return (
		course.tasks.find((task) => {
			const completion = completionByTaskId.get(task.taskId);
			return !completion?.isComplete;
		}) ?? null
	);
}

export async function assertNextTrainingSessionTask(
	course: Course,
	cid: number,
	taskId: number,
	message = 'Session scheduling is not available for this task'
): Promise<void> {
	const completionByTaskId = await loadCompletionByTaskId(course, cid);
	const nextTask = findNextIncompleteTask(course, completionByTaskId);

	if (!nextTask || nextTask.taskType !== 'training_session' || nextTask.taskId !== taskId) {
		throw new Error(message);
	}
}

async function buildVatcanCbtMetaMap(
	tasks: Course['tasks']
): Promise<Map<number, VatcanCbtBlockMeta> | undefined> {
	const needsCatalog = tasks.some((task) => {
		if (task.taskType !== 'vatcan_cbt') return false;
		const value2 = task.taskValue2?.trim();
		if (!value2) return true;
		return !/^(division|facility):/.test(value2);
	});
	if (!needsCatalog || !env.VATCAN_API_TOKEN) {
		return undefined;
	}

	try {
		const blocks = await fetchVatcanCbtBlockOptions({
			VATCAN_API_TOKEN: env.VATCAN_API_TOKEN
		});
		return new Map(blocks.map((block) => [block.id, vatcanCbtBlockMetaFromOption(block)]));
	} catch {
		return undefined;
	}
}

export async function getCourseTaskProgress(
	course: Course,
	cid: number
): Promise<CourseTaskProgress[]> {
	const [vatcanCbtMetaByBlockId, completionByTaskId] = await Promise.all([
		buildVatcanCbtMetaMap(course.tasks),
		loadCompletionByTaskId(course, cid)
	]);
	const describeOptions = vatcanCbtMetaByBlockId ? { vatcanCbtMetaByBlockId } : undefined;

	return Promise.all(
		course.tasks.map(async (task) => {
			const completion = completionByTaskId.get(task.taskId) ?? null;
			const remainingLabel =
				task instanceof DelayCourseTask && !completion?.isComplete
					? await task.getRemainingLabel(cid, completion)
					: null;
			return {
				taskId: task.taskId,
				taskType: task.taskType,
				taskValue2: task.taskValue2,
				description: describeCourseTask(task, describeOptions),
				typeLabel: formatCourseTaskType(task.taskType),
				startedAt: completion?.startedAt ?? null,
				completedAt: completion?.completedAt ?? null,
				isComplete: completion?.isComplete ?? false,
				manuallyCompletable: task.isManuallyCompletable(),
				requiresInstructorCompletion: requiresInstructorToComplete(task.taskType),
				remainingLabel
			};
		})
	);
}
