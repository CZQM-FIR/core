<script lang="ts">
	import { ROSTER_POSITION_LABELS } from '@czqm/common';
	import { getSoloPresetsAdmin, saveSoloPreset } from '$lib/remote/solo-presets.remote';

	const presetsQuery = getSoloPresetsAdmin();

	type Level = keyof typeof ROSTER_POSITION_LABELS;

	let selectedByLevel = $state<Record<Level, number[]>>({
		gnd: [],
		twr: [],
		app: [],
		ctr: []
	});
	let initialized = $state(false);
	let message = $state<{ text: string; isError: boolean } | null>(null);
	let savingLevel = $state<Level | null>(null);

	$effect(() => {
		const data = presetsQuery.current;
		if (!data || initialized) return;
		selectedByLevel = {
			gnd: data.presets.find((p) => p.level === 'gnd')?.positions.map((p) => p.id) ?? [],
			twr: data.presets.find((p) => p.level === 'twr')?.positions.map((p) => p.id) ?? [],
			app: data.presets.find((p) => p.level === 'app')?.positions.map((p) => p.id) ?? [],
			ctr: data.presets.find((p) => p.level === 'ctr')?.positions.map((p) => p.id) ?? []
		};
		initialized = true;
	});

	function togglePosition(level: Level, positionId: number, maxPositions: number) {
		const current = selectedByLevel[level];
		if (current.includes(positionId)) {
			selectedByLevel = {
				...selectedByLevel,
				[level]: current.filter((id) => id !== positionId)
			};
			return;
		}
		if (current.length >= maxPositions) {
			message = {
				text: `Select at most ${maxPositions} positions per level`,
				isError: true
			};
			return;
		}
		selectedByLevel = {
			...selectedByLevel,
			[level]: [...current, positionId]
		};
	}

	async function saveLevel(level: Level) {
		savingLevel = level;
		message = null;
		try {
			await saveSoloPreset({
				level,
				positionIds: selectedByLevel[level]
			});
			message = {
				text: `${ROSTER_POSITION_LABELS[level]} preset saved`,
				isError: false
			};
			initialized = false;
			await presetsQuery.refresh();
		} catch (err) {
			message = {
				text: err instanceof Error ? err.message : 'Failed to save preset',
				isError: true
			};
		} finally {
			savingLevel = null;
		}
	}
</script>

<section class="container mx-auto mb-12 px-4">
	<div class="mt-6 flex flex-wrap items-baseline justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold">Solo Presets</h1>
			<p class="text-sm opacity-70">
				Configure up to 5 same-level positions per roster level. Course solo tasks grant the preset
				for that level.
			</p>
		</div>
		<a href="/a/courses" class="link">Back to Training Administration</a>
	</div>

	{#if message}
		<p class="{message.isError ? 'text-error' : 'text-success'} mt-4 text-sm">{message.text}</p>
	{/if}

	{#if presetsQuery.loading && !presetsQuery.current}
		<p class="mt-6 text-sm opacity-70">Loading presets...</p>
	{:else if presetsQuery.error}
		<p class="text-error mt-6 text-sm">
			{presetsQuery.error.message ?? 'Failed to load solo presets.'}
		</p>
	{:else if presetsQuery.current}
		{@const data = presetsQuery.current}
		<div class="mt-6 grid gap-6 lg:grid-cols-2">
			{#each Object.keys(ROSTER_POSITION_LABELS) as level (level)}
				{@const typedLevel = level as Level}
				{@const options = data.positionsByLevel[typedLevel] ?? []}
				{@const selected = selectedByLevel[typedLevel]}
				<div class="rounded border border-gray-600 p-4">
					<div class="mb-3 flex items-center justify-between gap-3">
						<div>
							<h2 class="text-lg font-semibold">{ROSTER_POSITION_LABELS[typedLevel]}</h2>
							<p class="text-sm opacity-70">
								{selected.length}/{data.maxPositions} selected
							</p>
						</div>
						<button
							type="button"
							class="btn btn-primary btn-sm"
							disabled={savingLevel === typedLevel}
							onclick={() => saveLevel(typedLevel)}
						>
							{#if savingLevel === typedLevel}
								<span class="loading loading-spinner loading-sm"></span>
								Saving...
							{:else}
								Save
							{/if}
						</button>
					</div>

					{#if options.length === 0}
						<p class="text-sm italic opacity-70">No facility positions at this level.</p>
					{:else}
						<ul class="flex max-h-80 flex-col gap-2 overflow-y-auto">
							{#each options as position (position.id)}
								<li>
									<label class="flex cursor-pointer items-start gap-2">
										<input
											type="checkbox"
											class="checkbox checkbox-sm mt-0.5"
											checked={selected.includes(position.id)}
											onchange={() =>
												togglePosition(typedLevel, position.id, data.maxPositions)}
										/>
										<span>
											<span class="font-medium">{position.callsign}</span>
											<span class="block text-sm opacity-70">{position.name}</span>
										</span>
									</label>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</section>
