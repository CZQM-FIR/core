import type { PrefetchRoute } from '$lib/prefetch.svelte';
import { getCurrentUserInfo, getMyTrainingSessions } from '$lib/remote/users.remote';
import { getCourse, getCourses } from '$lib/remote/courses.remote';
import { getSoloPresetsAdmin } from '$lib/remote/solo-presets.remote';
import { getStudentCourseView, getMyTrainingNotes } from '$lib/remote/student.remote';
import {
	getAuthoredTrainingNotes,
	getInstructorCourse,
	getInstructorCourses,
	getScheduledSessionsInWindow,
	getSessionsAwaitingTrainingNotes,
	getStudentsWithSessionAvailability,
	getUpcomingInstructorSession
} from '$lib/remote/instructor.remote';

const COURSE_ID = '([0-9a-z]{5})';

/** Queries to start fetching when the user hovers a link to the matching route. */
export const prefetchRoutes: PrefetchRoute[] = [
	{ pattern: /^\/?$/, queries: () => [getCurrentUserInfo(), getMyTrainingSessions()] },
	{ pattern: /^\/notes\/?$/, queries: () => [getMyTrainingNotes()] },
	{
		pattern: new RegExp(`^/courses/${COURSE_ID}/?$`),
		queries: (m) => [getStudentCourseView(m[1])]
	},
	{ pattern: /^\/a\/courses\/?$/, queries: () => [getCourses()] },
	{ pattern: new RegExp(`^/a/courses/${COURSE_ID}/?$`), queries: (m) => [getCourse(m[1])] },
	{ pattern: /^\/a\/solo-presets\/?$/, queries: () => [getSoloPresetsAdmin()] },
	{
		pattern: /^\/i\/?$/,
		queries: () => [getUpcomingInstructorSession(), getSessionsAwaitingTrainingNotes()]
	},
	{ pattern: /^\/i\/courses\/?$/, queries: () => [getInstructorCourses()] },
	{
		pattern: new RegExp(`^/i/courses/${COURSE_ID}/?$`),
		queries: (m) => [getInstructorCourse(m[1])]
	},
	{ pattern: /^\/i\/notes\/?$/, queries: () => [getAuthoredTrainingNotes()] },
	{
		pattern: /^\/i\/availability\/?$/,
		queries: () => [getStudentsWithSessionAvailability(), getScheduledSessionsInWindow()]
	}
];
