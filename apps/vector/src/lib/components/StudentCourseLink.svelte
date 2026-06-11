<script lang="ts">
	let {
		courseId,
		cid,
		nameFull,
		class: className = 'link link-hover truncate text-sm font-semibold'
	}: {
		courseId: string;
		cid: number;
		nameFull: string;
		class?: string;
	} = $props();
</script>

<a href="/i/{courseId}/{cid}" class={className}>
	{nameFull} ({cid})
</a>
