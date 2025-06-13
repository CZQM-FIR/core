<script lang="ts">
	import { enhance } from '$app/forms';
	import { SquarePen, Trash2 } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let edit: number | null = $state(null);

	let deleted: number[] = $state([]);
</script>

<section>
	<div class="container mx-auto">
		<form
			action="?/createResource"
			method="post"
			class="bg-base-300 flex flex-col items-start gap-3 rounded-2xl p-4 px-6"
			use:enhance
		>
			<h1 class="text-xl font-semibold">New Resource</h1>
			<div class="flex flex-row flex-wrap items-baseline gap-3">
				<fieldset class="fieldset">
					<legend class="fieldset-legend">Resource Name</legend>
					<input
						type="text"
						class="input"
						name="name"
						value={form?.name}
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
						value={form?.link}
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
						value={form?.category}
						placeholder="Category"
					/>
				</fieldset>

				<fieldset class="fieldset">
					<legend class="fieldset-legend">Description</legend>
					<textarea class="textarea min-w-80" name="description" placeholder="Description"
						>{form?.description}</textarea
					>
				</fieldset>

				<div class="flex flex-row items-center gap-3">
					<span>Available to Controllers</span>
					<input
						type="checkbox"
						name="public"
						checked={form?.publicResource ?? false}
						class="checkbox"
					/>
				</div>

				<div class="flex flex-col gap-2">
					<button type="submit" class="btn btn-outline btn-success ms-auto">Create Resource</button>
					{#if form && !form.id}
						<p class="{form.ok ? 'text-success' : 'text-error'} text-sm">
							{form.ok ? '' : 'Error: '}{form.message}
						</p>
					{/if}
				</div>
			</div>
		</form>
		<div class="mt-3 flex flex-col gap-3">
			{#each data.resources as resource (resource.id)}
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
							{#if form && form.id === resource.id}
								<p class="{form.ok ? 'text-success' : 'text-error'} ms-auto text-sm">
									{form.ok ? '' : 'Error: '}{form.message}
								</p>
							{/if}
							<div
								class="flex flex-row items-center justify-center gap-2 {form &&
								form.id === resource.id
									? ''
									: 'ms-auto'}"
							>
								<button onclick={() => (edit = edit === resource.id ? null : resource.id)}>
									<SquarePen class="cursor-pointer text-2xl" size="15" />
								</button>
								<form
									action="?/deleteResource"
									method="post"
									use:enhance
									class="flex flex-row items-center"
								>
									<input type="text" name="id" value={resource.id} hidden />
									<button
										type="submit"
										onclick={() => {
											deleted.push(resource.id);
											setTimeout(() => {
												deleted = deleted.filter((id) => id !== resource.id);
											}, 1000);
										}}
									>
										<Trash2 class="hover:text-error cursor-pointer text-2xl transition" size="15" />
									</button>
								</form>
							</div>
						</div>
						<p>{resource.description}</p>
						{#if edit === resource.id}
							<form action="?/editResource" method="post" use:enhance>
								<div class="flex flex-row flex-wrap items-baseline gap-3">
									<fieldset class="fieldset">
										<legend class="fieldset-legend">Resource Name</legend>
										<input
											type="text"
											class="input"
											name="name"
											value={form?.name || resource.name}
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
											value={form?.link || resource.url}
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
											value={form?.category || resource.category}
											placeholder="Category"
										/>
									</fieldset>

									<fieldset class="fieldset">
										<legend class="fieldset-legend">Description</legend>
										<textarea class="textarea min-w-80" name="description" placeholder="Description"
											>{form?.description || resource.description}</textarea
										>
									</fieldset>

									<div class="flex flex-row items-center gap-3">
										<span>Available to Controllers</span>
										<input
											type="checkbox"
											name="public"
											checked={form?.publicResource ?? resource.public}
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
	</div>
</section>
