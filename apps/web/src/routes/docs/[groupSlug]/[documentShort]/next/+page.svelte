<script lang="ts">
  import type { PageProps } from './$types';
  import { getDocumentByShort, getNextAsset } from '$lib/remote/dms.remote';
  import { formatDmsDateUtc } from '$lib/utilities/dms';
  import { ChevronLeft } from '@lucide/svelte';
  let { params }: PageProps = $props();
  const query = $derived(getDocumentByShort([params.groupSlug, params.documentShort]));
</script>

<section id="join" class="min-h-screen">
  <div class="container mx-auto">
    {#if query.error}
      <h1 class="pt-6 text-2xl">Document Not Found</h1>
      <p class="text-error">{query.error.message ?? 'Failed to load document.'}</p>
    {:else if !query.ready}
      <h1 class="pt-6 text-2xl">Loading Document</h1>
      <a
        href="/docs/{params.groupSlug}/{params.documentShort}"
        class="text-primary hover:link flex flex-row items-center gap-1"
      >
        <ChevronLeft size="15" /> Back to Current Version
      </a>
      <div class="divider"></div>
      <span>Loading...</span>
    {:else}
      {@const document = query.current}
      {#if document}
        {@const nextAssetQuery = getNextAsset(document.id)}
        <h1 class="pt-6 text-2xl">{document.name}</h1>
        <a
          href="/docs/{params.groupSlug}/{params.documentShort}"
          class="text-primary hover:link flex flex-row items-center gap-1"
        >
          <ChevronLeft size="15" /> Back to Current Version
        </a>
        <div class="divider"></div>

        {#if nextAssetQuery.ready}
          {@const nextAsset = nextAssetQuery.current}
          {#if !nextAsset}
            <div class="alert alert-dash alert-warning my-6">
              <span>There is no upcoming version of this document.</span>
            </div>
            <a href="/docs/{params.groupSlug}/{params.documentShort}" class="btn btn-primary mt-2">
              Return to Current Version
            </a>
          {:else}
            <div class="alert alert-dash alert-warning mb-4">
              <span>
                You are viewing an upcoming version of this document, effective {formatDmsDateUtc(
                  nextAsset.effectiveDate
                )}. The current version remains in force until then.
              </span>
            </div>

            <p>
              Effective {formatDmsDateUtc(nextAsset.effectiveDate)}
              {#if nextAsset.expiryDate != null}
                to {formatDmsDateUtc(nextAsset.expiryDate)}
              {:else}
                until further notice
              {/if}
            </p>

            <p class="text-base-content/70 mt-2">{document.description}</p>

            <a
              href="/docs/{params.groupSlug}/{params.documentShort}/next/pdf"
              class="btn btn-primary mt-6"
              target="_blank">View Document</a
            >

            {#if document.required}
              <div class="mt-12">
                <p>This document requires acknowledgement.</p>
                <button class="btn btn-success my-3" disabled>Acknowledge Document</button>
                <div class="alert alert-info alert-soft mt-4">
                  <span>
                    Acknowledgement will be available once this version becomes effective on
                    {formatDmsDateUtc(nextAsset.effectiveDate)}.
                  </span>
                </div>
              </div>
            {/if}
          {/if}
        {/if}
      {:else}
        <h1 class="pt-6 text-2xl">Document Not Found</h1>
        <div class="divider"></div>
      {/if}
    {/if}
  </div>
</section>
