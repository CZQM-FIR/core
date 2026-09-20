import { db } from '$lib/db';
import {
	User,
	userCanAccessOverseerEventsTools,
	userCanAccessOverseerTrainingTools,
	userCanUseStaffScopedOverseerTools
} from '@czqm/common';
import { redirect } from '@sveltejs/kit';

async function loadAreaUser(cid: number | undefined) {
	if (cid == null) {
		redirect(303, '/');
	}
	const user = await User.fromCid(db, cid);
	if (!user) {
		redirect(303, '/');
	}
	return user;
}

export async function requireOverseerTrainingTools(cid: number | undefined) {
	const user = await loadAreaUser(cid);
	if (!(await userCanAccessOverseerTrainingTools(db, user))) {
		redirect(303, '/');
	}
}

export async function requireOverseerEventsTools(cid: number | undefined) {
	const user = await loadAreaUser(cid);
	if (!(await userCanAccessOverseerEventsTools(db, user))) {
		redirect(303, '/');
	}
}

export async function requireOverseerStaffScopedTools(cid: number | undefined) {
	const user = await loadAreaUser(cid);
	if (!(await userCanUseStaffScopedOverseerTools(db, user))) {
		redirect(303, '/');
	}
}
