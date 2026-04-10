<script lang="ts">
	import { deleteGroup, editGroup, getGroups } from '$lib/remote/dms.remote';
	import { SquarePen, Trash } from '@lucide/svelte';

	let deleteModal: HTMLDialogElement | undefined;
	let editModal: HTMLDialogElement | undefined;
	let selectedGroupId = $state<string | null>(null);
	let selectedGroupName = $state('');
	let selectedGroupSlug = $state('');
	let selectedGroupSort = $state(99);

	function openEditModal(id: string, name: string, slug: string, sort: number) {
		selectedGroupId = id;
		selectedGroupName = name;
		selectedGroupSlug = slug;
		selectedGroupSort = sort;
		editModal?.showModal();
	}

	function openDeleteModal(id: string, name: string) {
		selectedGroupId = id;
		selectedGroupName = name;
		deleteModal?.showModal();
	}

	async function confirmDelete() {
		if (selectedGroupId === null) {
			return;
		}

		await deleteGroup(selectedGroupId);
		deleteModal?.close();
		selectedGroupId = null;
		selectedGroupName = '';
	}

	$effect(() => {
		if (editGroup.result?.ok) {
			selectedGroupId = null;
			selectedGroupName = '';
			selectedGroupSlug = '';
			selectedGroupSort = 99;
			editModal?.close();
		}
	});
</script>

<section>
	<div class="container mx-auto">
		<h1 class="pt-6 text-2xl font-semibold">CZQM Document Management System</h1>
		<div class="divider"></div>
		<div class="flex flex-row items-center justify-between gap-2">
			<p>
				Welcome to the CZQM Document management system! Please select a group of documents to
				continue or create a new group.
			</p>
			<a href="/a/dms/new-group" class="btn btn-primary">Create New Group</a>
		</div>

		<div class="mt-5 overflow-x-auto">
			{#await getGroups()}
				<p>Loading groups...</p>
			{:then groups}
				<table class="table">
					<!-- head -->
					<thead>
						<tr>
							<th>#</th>
							<th>Group Name</th>
							<th>Slug</th>
							<th># of Documents</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each groups as { name, documents, slug, sort, id }, index (id)}
							<tr>
								<td>{index + 1}</td>
								<td>{name}</td>
								<td>/{slug}</td>
								<td>{documents.length}</td>
								<td class="flex flex-row gap-3">
									<button onclickcapture={() => openEditModal(id, name, slug, sort)}>
										<SquarePen class="hover:text-primary ms-2 max-h-4 transition-colors" />
									</button>
									<button onclickcapture={() => openDeleteModal(id, name)}>
										<Trash class="hover:text-error max-h-4 transition-colors" />
									</button>
									<a class="btn btn-xs btn-outline btn-secondary" href="/a/dms/groups/{id}"
										>Manage Documents</a
									>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/await}
		</div>
	</div>

	<dialog class="modal" bind:this={deleteModal}>
		<div class="modal-box">
			<h3 class="text-lg font-bold">Delete group?</h3>
			<p class="py-2">
				Are you sure you want to delete <span class="font-semibold">{selectedGroupName}</span>?
			</p>
			<p class="text-warning text-sm">
				Warning: deleting this group will also delete all documents within the group. This
				action cannot be undone.
			</p>
			<div class="modal-action">
				<form method="dialog">
					<button class="btn">Cancel</button>
				</form>
				<button class="btn btn-error" onclick={confirmDelete}>Delete</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button>close</button>
		</form>
	</dialog>

	<dialog class="modal" bind:this={editModal}>
		<div class="modal-box">
			<h3 class="text-lg font-bold">Edit Group</h3>
			<form {...editGroup}>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">Group Name</legend>
					<input
						{...editGroup.fields.name.as('text')}
						class="input"
						required
						value={selectedGroupName}
					/>
					<p class="label text-error text-sm">
						{editGroup.fields.name
							.issues()
							?.map((issue) => issue.message)
							.join(' ')}
					</p>
				</fieldset>

				<fieldset class="fieldset">
					<legend class="fieldset-legend">Slug</legend>
					<input
						{...editGroup.fields.slug.as('text')}
						class="input"
						required
						value={selectedGroupSlug}
					/>
					<p class="label text-error text-sm">
						{editGroup.fields.slug
							.issues()
							?.map((issue) => issue.message)
							.join(' ')}
					</p>
				</fieldset>

				<fieldset class="fieldset">
					<legend class="fieldset-legend">Sort Order</legend>
					<input
						{...editGroup.fields.sort.as('number')}
						class="input"
						placeholder="Optional sort order for the group"
						value={selectedGroupSort}
					/>
					<p class="label text-error text-sm">
						{editGroup.fields.sort
							.issues()
							?.map((issue) => issue.message)
							.join(' ')}
					</p>
					<p class="label text-sm">Groups are sorted from 1-99 by this value. The default is 99.</p>
					<p class="label text-error text-sm">
						{editGroup.fields.sort
							.issues()
							?.map((issue) => issue.message)
							.join(' ')}
					</p>
				</fieldset>

				<input {...editGroup.fields.id.as('hidden', selectedGroupId ?? 'none')} />

				<button class="btn btn-primary" type="submit">Save</button>
				<button
					type="button"
					class="btn"
					onclickcapture={() => {
						editModal?.close();
						selectedGroupId = null;
						selectedGroupName = '';
						selectedGroupSlug = '';
						selectedGroupSort = 99;
					}}>Cancel</button
				>
			</form>
		</div>
	</dialog>
</section>
