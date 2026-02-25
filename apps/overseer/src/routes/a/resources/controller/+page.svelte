<script lang="ts">
	import {
		getAdminControllerResources,
		createControllerResource,
		editControllerResource,
		deleteResource
	} from '$lib/remote/resources.remote';
	import { SquarePen, Trash2 } from '@lucide/svelte';

	const resourcesPromise = getAdminControllerResources();
	let resources: Awaited<ReturnType<typeof getAdminControllerResources>>['resources'] = $state([]);
	$effect(() => {
		resourcesPromise.then((r) => {
			resources = r.resources;
		});
	});

	let edit: number | null = $state(null);
	let deleted: number[] = $state([]);
	type FormResult = {
		ok?: boolean;
		status?: number;
		message?: string;
		id?: number;
		name?: string;
		link?: string;
		category?: string;
		description?: string;
		public?: boolean;
	};
</script>

<section>
	<div class="container mx-auto">
		{#await resourcesPromise}
			<p class="p-4">Loading...</p>
		{:then _}
			<form
				{...createControllerResource}
				method="post"
				class="bg-base-300 flex flex-col items-start gap-3 rounded-2xl p-4 px-6"
			>
				<h1 class="text-xl font-semibold">New Resource</h1>
				<div class="flex flex-row flex-wrap items-baseline gap-3">
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Resource Name</legend>
						<input
							type="text"
							class="input"
							name="name"
							value={(createControllerResource.result as FormResult | undefined)?.name ?? ''}
							required
							placeholder="Resource Name"
						/>
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Resource Link</legend>
						<input
							type="text"
							class="input w-80"
							required
							name="link"
							value={(createControllerResource.result as FormResult | undefined)?.link ?? ''}
							placeholder="Resource Link"
						/>
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Category</legend>
						<input
							type="text"
							class="input"
							required
							name="category"
							value={(createControllerResource.result as FormResult | undefined)?.category ?? ''}
							placeholder="Category"
						/>
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Description</legend>
						<textarea class="textarea min-w-80" name="description" placeholder="Description"
							>{(createControllerResource.result as FormResult | undefined)?.description ??
								''}</textarea
						>
					</fieldset>

					<div class="flex flex-row items-center gap-3">
						<span>Available to Controllers</span>
						<input
							type="checkbox"
							name="public"
							checked={(createControllerResource.result as FormResult | undefined)?.public ?? false}
							class="checkbox"
						/>
					</div>

					<div class="flex flex-col gap-2">
						<button type="submit" class="btn btn-outline btn-success ms-auto"
							>Create Resource</button
						>
						{#if (createControllerResource.result as FormResult | undefined) && !(createControllerResource.result as FormResult)?.id}
							<p
								class="{(createControllerResource.result as FormResult).ok
									? 'text-success'
									: 'text-error'} text-sm"
							>
								{(createControllerResource.result as FormResult).ok ? '' : 'Error: '}{(
									createControllerResource.result as FormResult
								).message}
							</p>
						{/if}
					</div>
				</div>
			</form>
			<div class="mt-3 flex flex-col gap-3">
				{#each resources as resource (resource.id)}
					<div class="card bg-base-300 shadow-xl {deleted.includes(resource.id) ? 'hidden' : ''}">
						<div class="card-body">
							<div class="flex flex-row items-end gap-3">
								<h2 class="card-title">{resource.name}</h2>
								<span>{resource.url}</span>
								<div class="badge badge-neutral">
									{resource.category[0].toUpperCase()}{resource.category.slice(1)}
								</div>
								{#if resource.public}
									<div class="badge badge-success">Public</div>
								{:else}
									<div class="badge badge-warning">Private</div>
								{/if}
								{#if (editControllerResource.result as FormResult)?.id === resource.id || (deleteResource.result as FormResult)?.id === resource.id}
									{@const res =
										(editControllerResource.result as FormResult)?.id === resource.id
											? (editControllerResource.result as FormResult)
											: (deleteResource.result as FormResult)}
									<p class="{res?.ok ? 'text-success' : 'text-error'} ms-auto text-sm">
										{res?.ok ? '' : 'Error: '}{res?.message ?? ''}
									</p>
								{/if}
								<div
									class="flex flex-row items-center justify-center gap-2 {(
										editControllerResource.result as FormResult
									)?.id === resource.id || (deleteResource.result as FormResult)?.id === resource.id
										? ''
										: 'ms-auto'}"
								>
									<button onclickcapture={() => (edit = edit === resource.id ? null : resource.id)}>
										<SquarePen class="cursor-pointer text-2xl" size="15" />
									</button>
									<form {...deleteResource} method="post" class="flex flex-row items-center">
										<input type="text" name="id" value={resource.id} hidden />
										<button
											type="submit"
											onclickcapture={() => {
												deleted.push(resource.id);
												setTimeout(() => {
													deleted = deleted.filter((id) => id !== resource.id);
												}, 1000);
											}}
										>
											<Trash2
												class="hover:text-error cursor-pointer text-2xl transition"
												size="15"
											/>
										</button>
									</form>
								</div>
							</div>
							<p>{resource.description}</p>
							{#if edit === resource.id}
								<form {...editControllerResource} method="post">
									<div class="flex flex-row flex-wrap items-baseline gap-3">
										<fieldset class="fieldset">
											<legend class="fieldset-legend">Resource Name</legend>
											<input
												type="text"
												class="input"
												name="name"
												value={resource.name}
												required
												placeholder="Resource Name"
											/>
										</fieldset>

										<fieldset class="fieldset">
											<legend class="fieldset-legend">Resource Link</legend>
											<input
												type="text"
												class="input w-80"
												required
												name="link"
												value={resource.url}
												placeholder="Resource Link"
											/>
										</fieldset>

										<fieldset class="fieldset">
											<legend class="fieldset-legend">Category</legend>
											<input
												type="text"
												class="input"
												required
												name="category"
												value={resource.category}
												placeholder="Category"
											/>
										</fieldset>

										<fieldset class="fieldset">
											<legend class="fieldset-legend">Description</legend>
											<textarea
												class="textarea min-w-80"
												name="description"
												placeholder="Description">{resource.description ?? ''}</textarea
											>
										</fieldset>

										<div class="flex flex-row items-center gap-3">
											<span>Available to Controllers</span>
											<input
												type="checkbox"
												name="public"
												checked={resource.public}
												class="checkbox"
											/>
										</div>

										<div class="flex flex-col gap-2">
											<input type="text" name="id" required value={resource.id} hidden />
											<button type="submit" class="btn btn-outline btn-success ms-auto"
												>Edit Resource</button
											>
										</div>
									</div>
								</form>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{:catch err}
			<p class="text-error p-4">{err?.message ?? 'Failed to load resources.'}</p>
		{/await}
	</div>
</section>
