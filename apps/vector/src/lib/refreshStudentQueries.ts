import { getMyTrainingSessions } from '$lib/remote/users.remote';
import {
	getStudentCourses,
	getStudentCourseView,
	getStudentTrainingSession
} from '$lib/remote/student.remote';

/** Refresh student course queries from the client after a successful mutation. */
export async function refreshStudentCourseView(courseId: string) {
	await getStudentCourseView(courseId).refresh();
}

export async function refreshAfterJoinCourseWaitlist(courseId: string) {
	await Promise.all([getStudentCourses().refresh(), getStudentCourseView(courseId).refresh()]);
}

export async function refreshAfterStudentSessionAction(courseId: string, sessionId: number) {
	await Promise.all([
		getStudentCourseView(courseId).refresh(),
		getMyTrainingSessions().refresh(),
		getStudentTrainingSession(sessionId).refresh()
	]);
}
