<script lang="ts">
	import { Plus, Search, SquarePen, Trash2 } from '@lucide/svelte';
	import { deleteNewsArticle, getNewsArticles } from '$lib/remote/news.remote';

	let search = $state('');
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

		{#await getNewsArticles()}
			<p class="mt-4">Loading articles...</p>
		{:then articles}
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
					{#each search == '' ? articles : articles.filter((article) => {
								return article.title
										.toLowerCase()
										.includes(search.toLowerCase()) || article.author?.name_full
										.toLowerCase()
										.includes(search.toLowerCase());
							}) as article (article.id)}
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
								<button type="button" onclickcapture={() => deleteNewsArticle(article.id)}>
									<Trash2 size="15" class="text-error cursor-pointer" />
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:catch err}
			<p class="text-error mt-4">{err.message ?? 'Failed to load articles.'}</p>
		{/await}
	</div>
</section>
