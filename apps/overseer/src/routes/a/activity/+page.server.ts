import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { getUserRole } from '$lib/utilities/getUserRole';

export const load = (async () => {
	const users = await db.query.users.findMany({
		columns: {
			cid: true,
			name_full: true
		},
		with: {
			flags: {
				columns: {
					flagId: false,
					userId: false
				},
				with: {
					flag: true
				}
			},
			rating: true,
			sessions: {
				with: {
					position: true
				}
			}
		}
	});

	const modifiedUsers = await Promise.all(
		users.map(async (user) => {
			const now = new Date();
			const currentQuarter = Math.floor(now.getMonth() / 3);
			const currentYear = now.getFullYear();

			const sessionsThisQuarter = user.sessions.filter((session) => {
				const sessionDate = new Date(session.logonTime);
				const sessionQuarter = Math.floor(sessionDate.getMonth() / 3);
				const sessionYear = sessionDate.getFullYear();

				return sessionQuarter === currentQuarter && sessionYear === currentYear;
			});

			const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
			const lastYear = currentQuarter === 0 ? currentYear - 1 : currentYear;

			const sessionsLastQuarter = user.sessions.filter((session) => {
				const sessionDate = new Date(session.logonTime);
				const sessionQuarter = Math.floor(sessionDate.getMonth() / 3);
				const sessionYear = sessionDate.getFullYear();

				return sessionQuarter === lastQuarter && sessionYear === lastYear;
			});

			const internalThis = sessionsThisQuarter
				.filter((s) => s.positionId !== 0)
				.filter((s) =>
					(user.rating.id >= 5 ? ['APP', 'CTR'] : ['GND', 'TWR', 'APP', 'CTR']).includes(
						s.position.callsign.split('_').pop() ?? ''
					)
				)
				.reduce((count, session) => count + session.duration, 0);
			const externalThis = sessionsThisQuarter
				.filter((s) => s.positionId === 0)
				.reduce((count, session) => count + session.duration, 0);
			const internalLast = sessionsLastQuarter
				.filter((s) => s.positionId !== 0)
				.filter((s) =>
					(user.rating.id >= 5 ? ['APP', 'CTR'] : ['GND', 'TWR', 'APP', 'CTR']).includes(
						s.position.callsign.split('_').pop() ?? ''
					)
				)
				.reduce((count, session) => count + session.duration, 0);
			const externalLast = sessionsLastQuarter
				.filter((s) => s.positionId === 0)
				.reduce((count, session) => count + session.duration, 0);

			return {
				...user,
				role: getUserRole(user.flags),
				hours: {
					this: {
						internal: Number((internalThis / 3600).toFixed(2)),
						external: Number((externalThis / 3600).toFixed(2))
					},
					last: {
						internal: Number((internalLast / 3600).toFixed(2)),
						external: Number((externalLast / 3600).toFixed(2))
					}
				}
			};
		})
	);

	return {
		users: modifiedUsers.filter((u) =>
			u.flags.some((f) => ['controller', 'visitor'].includes(f.flag.name))
		)
	};
}) satisfies PageServerLoad;
