import type { Course } from '@czqm/common';
import {
	describeCourseTask,
	fetchVatcanCbtBlockOptions,
	formatCourseTaskType,
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
};

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
	const vatcanCbtMetaByBlockId = await buildVatcanCbtMetaMap(course.tasks);
	const describeOptions = vatcanCbtMetaByBlockId ? { vatcanCbtMetaByBlockId } : undefined;

	return Promise.all(
		course.tasks.map(async (task) => {
			const completion = await task.getCompletion(cid);
			return {
				taskId: task.taskId,
				taskType: task.taskType,
				taskValue2: task.taskValue2,
				description: describeCourseTask(task, describeOptions),
				typeLabel: formatCourseTaskType(task.taskType),
				startedAt: completion?.startedAt ?? null,
				completedAt: completion?.completedAt ?? null,
				isComplete: completion?.isComplete ?? false,
				manuallyCompletable: !task.isAutoCompletable()
			};
		})
	);
}
