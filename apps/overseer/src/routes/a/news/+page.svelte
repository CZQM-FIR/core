<script lang="ts">
	import { Plus, Search, SquarePen, Trash2 } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let search = $state('');

	let filtered = $derived(data.articles);

	$effect(() => {
		filtered =
			search == ''
				? data.articles
				: data.articles.filter((article) => {
						return (
							article.title.toLowerCase().includes(search.toLowerCase()) ||
							article.author?.name_full.toLowerCase().includes(search.toLowerCase())
						);
					});
	});
</script>

<section>
	<div class="container mx-auto">
		<h1 class="pt-6 text-2xl font-semibold">News Management</h1>
		<div class="divider"></div>

		<div class="flex min-w-full flex-row">
			<label class="input mr-auto">
				<Search class="opacity-50" size="15" />
				<input type="search" class="grow" placeholder="Search" bind:value={search} />
			</label>
			<a href="/a/news/create" class="btn btn-primary">
				<Plus class="text-xl" size="15" />
			</a>
		</div>

		<table class="table-zebra table w-full">
			<thead>
				<tr>
					<th>Article Name</th>
					<th>Date</th>
					<th>Author</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as article (article.id)}
					<tr>
						<td>{article.title}</td>
						<td
							>{article.date.toLocaleString('en-GB', { timeZone: 'UTC' })}
							{article.date.getUTCHours()}:{article.date.getUTCMinutes()}z</td
						>
						<td>{article.author ? article.author.name_full : 'CZQM Staff'}</td>
						<td class="flex flex-row items-center justify-end gap-3">
							<a href={`/a/news/${article.id}`}>
								<SquarePen class="text-xl" size="15" />
							</a>
							<form method="post">
								<input type="hidden" name="id" value={article.id} />
								<button type="submit">
									<Trash2 size="15" class="text-error cursor-pointer" />
								</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
