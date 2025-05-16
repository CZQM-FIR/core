<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="hero min-h-screen bg-base-200">
  <div class="hero-content text-center">
    <div class="max-w-md">
      <h1 class="text-5xl font-bold">Error {$page.status}</h1>
      <h2 class="text-3xl font-light">{$page.error?.message}</h2>
      <p class="py-6 text-xl">
        {#if $page.status === 404}
          Uh Oh! It looks like you've stumbled upon a page that doesn't exist...
        {:else}
          Whoops! It looks like something went wrong...
        {/if}
      </p>
      <a href="/" class="btn btn-primary">Go Home</a>
    </div>
  </div>
</div>
