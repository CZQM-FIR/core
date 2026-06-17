import { getRequestEvent } from '$app/server';
import { db } from '$lib/db';
import { error } from '@sveltejs/kit';
import {
	User,
	getAssistantParentFlagsForUser,
	userHasVectorAdminAccess,
	userHasVectorInstructorAccess
} from '@czqm/common';

export async function authorizeVectorAdminAccess() {
	const event = getRequestEvent();
	const token = event.cookies.get('session');
	if (!token) {
		throw error(403, 'Forbidden');
	}
	const actioner = await User.fromSessionToken(db, token);
	if (!actioner) {
		throw error(403, 'Forbidden');
	}
	const parents = await getAssistantParentFlagsForUser(db, actioner.cid);
	if (!userHasVectorAdminAccess(actioner, parents)) {
		throw error(403, 'Forbidden');
	}
	return actioner;
}

export async function authorizeVectorInstructorAccess() {
	const event = getRequestEvent();
	const token = event.cookies.get('session');
	if (!token) {
		throw error(403, 'Forbidden');
	}
	const actioner = await User.fromSessionToken(db, token);
	if (!actioner) {
		throw error(403, 'Forbidden');
	}
	if (!userHasVectorInstructorAccess(actioner)) {
		throw error(403, 'Forbidden');
	}
	return actioner;
}

export async function authorizeVectorStudentAccess() {
	const event = getRequestEvent();
	const token = event.cookies.get('session');
	if (!token) {
		throw error(403, 'Forbidden');
	}
	const actioner = await User.fromSessionToken(db, token);
	if (!actioner) {
		throw error(403, 'Forbidden');
	}
	if (!actioner.hasFlag(['controller', 'visitor', 'admin'])) {
		throw error(403, 'Forbidden');
	}
	return actioner;
}
