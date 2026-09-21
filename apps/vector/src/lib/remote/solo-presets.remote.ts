import { command, query } from '$app/server';
import { db } from '$lib/db';
import {
	ensureSoloPresets,
	rosterLevelFromCallsign,
	setSoloPresetPositions,
	SOLO_MAX_POSITIONS
} from '@czqm/common';
import { SOLO_PRESET_LEVELS, type SoloPresetLevel } from '@czqm/db/schema';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { authorizeVectorAdminAccess } from './auth';

const SoloPresetLevelSchema = type("'gnd' | 'twr' | 'app' | 'ctr'");

function isFacilityPosition(callsign: string, name: string): boolean {
	const trimmedCallsign = callsign.trim();
	const trimmedName = name.trim();
	if (trimmedCallsign === 'UNKN' || trimmedCallsign === 'EXTERNAL') return false;
	return trimmedName.length > 0 && trimmedName.toUpperCase() !== trimmedCallsign.toUpperCase();
}

export const getSoloPresetsAdmin = query(async () => {
	await authorizeVectorAdminAccess();

	const [presets, allPositions] = await Promise.all([
		ensureSoloPresets(db),
		db.query.positions.findMany({
			orderBy: (positions, { asc }) => [asc(positions.callsign)]
		})
	]);

	const facilityPositions = allPositions.filter((position) =>
		isFacilityPosition(position.callsign, position.name)
	);

	return {
		presets: presets.map((preset) => ({
			id: preset.id,
			level: preset.level,
			name: preset.name,
			positions: preset.positions.map((position) => ({
				id: position.id,
				callsign: position.callsign,
				name: position.name,
				frequency: position.frequency
			}))
		})),
		positionsByLevel: Object.fromEntries(
			SOLO_PRESET_LEVELS.map((level) => [
				level,
				facilityPositions
					.filter((position) => rosterLevelFromCallsign(position.callsign) === level)
					.map((position) => ({
						id: position.id,
						callsign: position.callsign,
						name: position.name,
						frequency: position.frequency
					}))
			])
		) as Record<
			SoloPresetLevel,
			{ id: number; callsign: string; name: string; frequency: string }[]
		>,
		maxPositions: SOLO_MAX_POSITIONS
	};
});

export const saveSoloPreset = command(
	type({
		level: SoloPresetLevelSchema,
		positionIds: type('number.integer > 0').array()
	}),
	async ({ level, positionIds }) => {
		await authorizeVectorAdminAccess();

		if (positionIds.length > SOLO_MAX_POSITIONS) {
			throw error(400, `Select at most ${SOLO_MAX_POSITIONS} positions`);
		}

		try {
			const preset = await setSoloPresetPositions(db, level, positionIds);
			getSoloPresetsAdmin().refresh();
			return {
				ok: true as const,
				preset: {
					id: preset.id,
					level: preset.level,
					name: preset.name,
					positions: preset.positions.map((position) => ({
						id: position.id,
						callsign: position.callsign,
						name: position.name,
						frequency: position.frequency
					}))
				}
			};
		} catch (err) {
			throw error(400, err instanceof Error ? err.message : 'Failed to save solo preset');
		}
	}
);
