<script lang="ts">
	import {
		createDocumentAsset,
		deleteDocumentAsset,
		editDocument,
		getDocument,
		getDocumentsByGroup,
		updateDocumentAsset
	} from '$lib/remote/dms.remote';
	import env from '$lib/publicEnv';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { ChevronLeft, SquarePen, Trash2 } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { getCurrentDmsAsset, type DmsDocument } from '@czqm/common';

	let id = $state<string>(page.params.id!);
	let name = $state('');
	let sort = $state(99);
	let required = $state('false');
	let description = $state('');
	let existingDocumentNames = $state<string[]>([]);
	let loadedDocument = $state<DmsDocument | undefined>();
	let lastLoadedDocument = $state<DmsDocument | undefined>();
	let loadError = $state<string | null>(null);
	let isLoading = $state(true);

	const normalizeName = (value: string) => value.trim().toLowerCase();
	const versionPattern = /^(\d+)\.(\d+)$/;
	const getErrorMessage = (error: unknown) => {
		if (error instanceof Error && error.message) {
			return error.message;
		}

		if (typeof error === 'string' && error.length > 0) {
			return error;
		}

		return 'Unknown error';
	};

	let hasDuplicateName = $derived(
		normalizeName(name).length > 0 &&
			existingDocumentNames.includes(normalizeName(name)) &&
			name !== loadedDocument?.name
	);
	let currentDocument = $derived(loadedDocument ?? lastLoadedDocument);
	let currentAsset = $derived(
		currentDocument?.assets ? getCurrentDmsAsset(currentDocument.assets) : null
	);

	let editDocumentMessage = $derived.by(() => {
		if (!editDocument.result) {
			return null;
		}

		return {
			text: editDocument.result.message ?? 'Document details updated.',
			isError: !editDocument.result.ok
		};
	});

	let createAssetMessage = $derived.by(() => {
		if (!createDocumentAsset.result) {
			return null;
		}

		return {
			text: createDocumentAsset.result.message ?? 'Document asset uploaded.',
			isError: !createDocumentAsset.result.ok
		};
	});

	let updateAssetMessage = $derived.by(() => {
		if (!updateDocumentAsset.result) {
			return null;
		}

		return {
			text: updateDocumentAsset.result.message ?? 'Document asset updated.',
			isError: !updateDocumentAsset.result.ok
		};
	});

	let deleteAssetMessage = $derived.by(() => {
		if (!deleteDocumentAsset.result) {
			return null;
		}

		return {
			text: deleteDocumentAsset.result.message ?? 'Document asset deleted.',
			isError: !deleteDocumentAsset.result.ok
		};
	});
	let assetVersion = $state('');
	let assetPublic = $state(false);
	let assetEffectiveDate = $state(formatDateTimeLocalValue(new Date()));
	let assetExpiryDate = $state('');
	let deleteAssetModal: HTMLDialogElement | undefined;
	let selectedAssetId = $state<string | null>(null);
	let selectedAssetVersion = $state('');
	const filesBaseUrl = env.PUBLIC_FILES_BASE_URL;

	const loadDocumentDetails = async (options?: { showLoading?: boolean }) => {
		const showLoading = options?.showLoading ?? false;
		if (showLoading) {
			isLoading = true;
		}
		loadError = null;

		try {
			const fetchedDocument = await getDocument(id);
			loadedDocument = fetchedDocument;
			lastLoadedDocument = fetchedDocument;
			name = fetchedDocument.name;
			short = fetchedDocument.short ?? '';
			sort = fetchedDocument.sort ?? 99;
			required = fetchedDocument.required ? 'true' : 'false';
			description = fetchedDocument.description ?? '';
			assetVersion = getDefaultNextVersion(fetchedDocument.assets ?? []);

			if (fetchedDocument.groupId) {
				try {
					const documents = await getDocumentsByGroup(fetchedDocument.groupId);
					existingDocumentNames = documents.map((document) => normalizeName(document.name));
				} catch {
					// Keep edit form usable even if duplicate-check context fails to load.
					existingDocumentNames = [];
				}
			} else {
				existingDocumentNames = [];
			}
		} catch (error) {
			loadError = getErrorMessage(error);
		} finally {
			if (showLoading) {
				isLoading = false;
			}
		}
	};

	onMount(async () => {
		await loadDocumentDetails({ showLoading: true });
	});

	$effect(() => {
		if (!createDocumentAsset.result?.ok) {
			return;
		}

		void loadDocumentDetails();
	});

	$effect(() => {
		if (!updateDocumentAsset.result?.ok) {
			return;
		}

		for (const element of document.querySelectorAll('dialog[id^="asset-edit-modal-"]')) {
			(element as HTMLDialogElement).close();
		}
		void loadDocumentDetails();
	});

	$effect(() => {
		if (!deleteDocumentAsset.result?.ok) {
			return;
		}

		deleteAssetModal?.close();
		selectedAssetId = null;
		selectedAssetVersion = '';
		void loadDocumentDetails();
	});

	const preventDuplicateNameSubmission = (event: SubmitEvent) => {
		if (hasDuplicateName && name !== loadedDocument?.name) {
			event.preventDefault();
		}
	};

	let short = $state('');
	const updateShort = () => {
		short = short.replaceAll(' ', '-');
		short = short.replaceAll('--', '-');
		short = short.toLowerCase();
		if (short.startsWith('-')) {
			short = short.slice(1);
		}
	};
	const blurShort = () => {
		updateShort();
		if (short.endsWith('-')) {
			short = short.slice(0, -1);
		}
		if (short.startsWith('-')) {
			short = short.slice(1);
		}
	};

	const parseMaybeDate = (value: Date | string | null | undefined) => {
		if (!value) {
			return null;
		}

		const date = value instanceof Date ? value : new Date(value);
		return Number.isNaN(date.getTime()) ? null : date;
	};

	function formatDate(value: Date | string | null | undefined) {
		const date = parseMaybeDate(value);
		if (!date) {
			return 'N/A';
		}

		return `${date.toLocaleString(undefined, { timeZone: 'UTC' })} UTC`;
	}

	function formatDateTimeLocalValue(date: Date) {
		return date.toISOString().slice(0, 16);
	}

	function formatDateTimeLocalInput(value: Date | string | null | undefined) {
		const parsed = parseMaybeDate(value);
		if (!parsed) {
			return '';
		}

		return formatDateTimeLocalValue(parsed);
	}

	function getAssetStatus(asset: DmsDocument['assets'][number]) {
		const now = new Date();
		const effectiveDate = parseMaybeDate(asset.effectiveDate);
		const expiryDate = parseMaybeDate(asset.expiryDate);

		if (!asset.public) {
			return 'Not public';
		}

		if (!effectiveDate || effectiveDate > now) {
			return 'Scheduled';
		}

		if (expiryDate && expiryDate <= now) {
			return 'Expired';
		}

		if (currentAsset?.id === asset.id) {
			return 'Current';
		}

		return 'Inactive';
	}

	function getDefaultNextVersion(assets: DmsDocument['assets']) {
		if (assets.length === 0) {
			return '1.0';
		}

		const previousVersion = assets[0]?.version?.trim();
		if (!previousVersion) {
			return '';
		}

		const match = previousVersion.match(versionPattern);
		if (!match) {
			return '';
		}

		const major = Number(match[1]);
		const minor = Number(match[2]);
		return `${major}.${minor + 1}`;
	}

	const openAssetEditModal = (assetId: string) => {
		const dialog = document.getElementById(
			`asset-edit-modal-${assetId}`
		) as HTMLDialogElement | null;
		dialog?.showModal();
	};

	const openDeleteAssetModal = (assetId: string, assetVersion: string) => {
		selectedAssetId = assetId;
		selectedAssetVersion = assetVersion;
		deleteAssetModal?.showModal();
	};
</script>

<section>
	<div class="container mx-auto">
		{#if isLoading}
			<p>Loading document...</p>
		{:else if loadError}
			<p class="text-error">Error loading document: {loadError}</p>
		{:else if currentDocument}
			<h1 class="pt-6 text-2xl font-semibold">DMS Document: {currentDocument.name}</h1>
			{#if currentDocument.groupId}
				<a
					href={resolve('/a/dms/groups/[id]', { id: currentDocument.groupId })}
					class="text-primary hover:link flex flex-row items-center gap-1"
				>
					<ChevronLeft size="15" /> Back to {currentDocument.group?.name ?? 'Group'}
				</a>
			{:else}
				<a
					href={resolve('/a/dms')}
					class="text-primary hover:link flex flex-row items-center gap-1"
				>
					<ChevronLeft size="15" /> Back to Group
				</a>
			{/if}
			<div class="divider"></div>

			<h2 class="text-xl">Document Details</h2>
			<form
				{...editDocument}
				onsubmit={preventDuplicateNameSubmission}
				onreset={(event) => event.preventDefault()}
				class="mt-3"
			>
				<div class="flex flex-row flex-wrap gap-5">
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Document Name</legend>
						<input type="text" name="name" class="input" required bind:value={name} />
						<p class="label text-error text-sm">
							{editDocument.fields.name
								.issues()
								?.map((issue) => issue.message)
								.join(' ')}
						</p>
						{#if hasDuplicateName}
							<p class="label text-error text-sm">Document name must be unique.</p>
						{/if}
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Short URL</legend>
						<input
							type="text"
							name="short"
							class="input"
							oninput={updateShort}
							onblur={blurShort}
							bind:value={short}
							required
						/>
						<p class="label text-error text-sm">
							{editDocument.fields.short
								.issues()
								?.map((issue) => issue.message)
								.join(' ')}
						</p>
						<p class="label text-sm">The short identifier for this document used in URLs</p>
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Sort Order</legend>
						<input
							type="number"
							name="sort"
							class="input"
							min="0"
							max="99"
							required
							bind:value={sort}
						/>
						<p class="label text-error text-sm">
							{editDocument.fields.sort
								.issues()
								?.map((issue) => issue.message)
								.join(' ')}
						</p>
						<p class="label text-sm">Documents are sorted from 0-99 by this value.</p>
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Required</legend>
						<select name="required" class="select" required bind:value={required}>
							<option value="false">No - Users do not need to acknowledge changes</option>
							<option value="true">Yes - Users must acknowledge changes</option>
						</select>
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Description</legend>
						<textarea name="description" class="textarea h-28" bind:value={description}></textarea>
						<p class="label text-sm">Optional additional details for this document type.</p>
					</fieldset>

					<input type="hidden" name="id" value={currentDocument.id} />
					<p class="label text-error text-sm">
						{editDocument.fields.id
							.issues()
							?.map((issue) => issue.message)
							.join(' ')}
					</p>
				</div>
				<button type="submit" class="btn btn-primary mt-5">Save</button>
			</form>
			{#if editDocumentMessage}
				<p
					class={`mt-2 text-sm ${editDocumentMessage.isError ? 'text-error' : 'text-success auto-dismiss'}`}
				>
					{editDocumentMessage.text}
				</p>
			{/if}

			<div class="divider"></div>

			<h2 class="text-xl">Document Assets</h2>
			{#if currentAsset}
				<div class="alert alert-success mt-4">
					<div class="space-y-1">
						<p class="font-semibold">Current Asset: {currentAsset.version}</p>
						<p>
							Effective {formatDate(currentAsset.effectiveDate)}{#if currentAsset.expiryDate}
								, Expires {formatDate(currentAsset.expiryDate)}
							{/if}
						</p>
						<a
							class="link link-primary"
							href={`${filesBaseUrl}/${currentAsset.url}`}
							target="_blank"
							rel="noreferrer"
						>
							Open current asset
						</a>
					</div>
				</div>
			{:else}
				<div class="alert alert-error mt-4">
					<p>No current public asset is active for this document.</p>
				</div>
			{/if}

			<h2 class="mt-6 text-xl">Upload New Asset</h2>
			<form {...createDocumentAsset} enctype="multipart/form-data" class="mt-3">
				<input type="hidden" name="documentId" value={currentDocument.id} />
				<div class="flex flex-row flex-wrap gap-5">
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Version</legend>
						<input type="text" name="version" class="input" required bind:value={assetVersion} />
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Effective Date (UTC)</legend>
						<input
							type="datetime-local"
							name="effectiveDate"
							class="input"
							required
							bind:value={assetEffectiveDate}
						/>
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Expiry Date (UTC)</legend>
						<input
							type="datetime-local"
							name="expiryDate"
							class="input"
							bind:value={assetExpiryDate}
						/>
						<p class="label text-sm">Optional</p>
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Public</legend>
						<label class="label cursor-pointer justify-start gap-2">
							<input type="checkbox" class="checkbox" name="public" bind:checked={assetPublic} />
							<span>Mark as publicly available</span>
						</label>
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Asset File</legend>
						<input type="file" name="file" class="file-input" required />
					</fieldset>
				</div>
				<button type="submit" class="btn btn-primary mt-5 mb-6">Upload Asset</button>
			</form>
			{#if createAssetMessage}
				<p class={`mt-2 text-sm ${createAssetMessage.isError ? 'text-error' : 'text-success'}`}>
					{createAssetMessage.text}
				</p>
			{/if}

			<div class="mt-4 overflow-x-auto pb-4">
				<table class="table">
					<thead>
						<tr>
							<th>Version</th>
							<th>Status</th>
							<th>Public</th>
							<th>Effective</th>
							<th>Expiry</th>
							<th>Asset</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#if currentDocument.assets.length === 0}
							<tr>
								<td colspan="7" class="text-base-content/70">No assets uploaded yet.</td>
							</tr>
						{:else}
							{#each currentDocument.assets as asset (asset.id)}
								<tr>
									<td>{asset.version}</td>
									<td>{getAssetStatus(asset)}</td>
									<td>{asset.public ? 'Yes' : 'No'}</td>
									<td>{formatDate(asset.effectiveDate)}</td>
									<td>{formatDate(asset.expiryDate)}</td>
									<td>
										<a
											class="link link-primary"
											href={`${filesBaseUrl}/${asset.url}`}
											target="_blank"
											rel="noreferrer"
										>
											View
										</a>
									</td>
									<td>
										<div class="flex gap-2">
											<button
												type="button"
												class="btn btn-xs"
												onclick={() => openAssetEditModal(asset.id)}
												aria-label="Edit asset"
												title="Edit asset"
											>
												<SquarePen size="14" />
											</button>
											<button
												type="button"
												class="btn btn-xs btn-error"
												aria-label="Delete asset"
												title="Delete asset"
												onclick={() => openDeleteAssetModal(asset.id, asset.version)}
											>
												<Trash2 size="14" />
											</button>
										</div>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
			{#each currentDocument.assets as asset (asset.id)}
				<dialog id={`asset-edit-modal-${asset.id}`} class="modal">
					<div class="modal-box">
						<h3 class="text-lg font-semibold">Edit Asset: {asset.version}</h3>
						<form {...updateDocumentAsset} class="mt-4 space-y-3">
							<input type="hidden" name="assetId" value={asset.id} />
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Effective Date (UTC)</legend>
								<input
									type="datetime-local"
									name="effectiveDate"
									class="input"
									required
									value={formatDateTimeLocalInput(asset.effectiveDate)}
								/>
							</fieldset>
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Expiry Date (UTC)</legend>
								<input
									type="datetime-local"
									name="expiryDate"
									class="input"
									value={formatDateTimeLocalInput(asset.expiryDate)}
								/>
								<p class="label text-sm">Optional</p>
							</fieldset>
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Public</legend>
								<label class="label cursor-pointer justify-start gap-2">
									<input type="checkbox" class="checkbox" name="public" checked={asset.public} />
									<span>Mark as publicly available</span>
								</label>
							</fieldset>
							<div class="modal-action">
								<button
									type="button"
									class="btn"
									onclick={(event) => {
										const dialog = (event.currentTarget as HTMLElement).closest(
											'dialog'
										) as HTMLDialogElement | null;
										dialog?.close();
									}}>Cancel</button
								>
								<button type="submit" class="btn btn-primary">Save</button>
							</div>
						</form>
					</div>
				</dialog>
			{/each}
			<dialog class="modal" bind:this={deleteAssetModal}>
				<div class="modal-box">
					<h3 class="text-lg font-bold">Delete asset?</h3>
					<p class="py-2">
						Are you sure you want to delete <span class="font-semibold">{selectedAssetVersion}</span
						>?
					</p>
					<p class="text-warning text-sm">This action cannot be undone.</p>
					<div class="modal-action">
						<form method="dialog">
							<button class="btn">Cancel</button>
						</form>
						<form {...deleteDocumentAsset}>
							<input type="hidden" name="assetId" value={selectedAssetId ?? ''} />
							<button type="submit" class="btn btn-error">Delete</button>
						</form>
					</div>
				</div>
				<form method="dialog" class="modal-backdrop">
					<button>close</button>
				</form>
			</dialog>
			{#if updateAssetMessage}
				<p class={`mt-2 text-sm ${updateAssetMessage.isError ? 'text-error' : 'text-success'}`}>
					{updateAssetMessage.text}
				</p>
			{/if}
			{#if deleteAssetMessage}
				<p class={`mt-2 text-sm ${deleteAssetMessage.isError ? 'text-error' : 'text-success'}`}>
					{deleteAssetMessage.text}
				</p>
			{/if}
		{/if}
	</div>
</section>

<style>
	.auto-dismiss {
		animation: fadeOut 5s forwards;
	}

	@keyframes fadeOut {
		0%,
		80% {
			opacity: 1;
		}

		100% {
			opacity: 0;
		}
	}
</style>
