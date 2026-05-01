<script lang="ts">
  import type { PageProps } from './$types';
  import {
    acknowledgeDocument,
    getCurrentAsset,
    getDocumentAcknowledgement,
    getDocumentByShort,
    getNextAsset
  } from '$lib/remote/dms.remote';
  import { formatDmsDateUtc } from '$lib/utilities/dms';
  import { ChevronLeft } from '@lucide/svelte';
  let { params }: PageProps = $props();
  let acknowledgeError = $state<string | null>(null);
  let isAcknowledging = $state(false);

  async function onAcknowledge(documentId: string) {
    acknowledgeError = null;
    isAcknowledging = true;

    try {
      await acknowledgeDocument(documentId);
      getDocumentAcknowledgement(documentId).refresh();
    } catch (error) {
      if (error instanceof Error && error.message) {
        acknowledgeError = error.message;
      } else {
        acknowledgeError = 'Unable to acknowledge this document right now.';
      }
    } finally {
      isAcknowledging = false;
    }
  }
</script>

<section id="join" class="min-h-screen">
  <div class="container mx-auto">
    {#await getDocumentByShort([params.groupSlug, params.documentShort])}
      <h1 class="pt-6 text-2xl">Loading Document</h1>
      <a href="/docs" class="text-primary hover:link flex flex-row items-center gap-1">
        <ChevronLeft size="15" /> Back to Documents
      </a>
      <div class="divider"></div>
      <span>Loading...</span>
    {:then document}
      {#if document}
        <h1 class="pt-6 text-2xl">{document.name}</h1>
        <a href="/docs" class="text-primary hover:link flex flex-row items-center gap-1">
          <ChevronLeft size="15" /> Back to Documents
        </a>
        <div class="divider"></div>

        {#await getCurrentAsset(document.id) then asset}
          {#if !asset}
            <div class="alert alert-dash alert-error my-6">
              <span>There is no available version of this document.</span>
            </div>
          {:else}
            {#await getNextAsset(document.id) then nextAsset}
              <p>
                Effective {formatDmsDateUtc(asset.effectiveDate)}
                {#if asset.expiryDate != null}
                  to {formatDmsDateUtc(asset.expiryDate)}
                {:else if nextAsset}
                  until {formatDmsDateUtc(nextAsset.effectiveDate)}
                {:else}
                  until further notice
                {/if}
              </p>
            {/await}
          {/if}
        {/await}

        {#await getNextAsset(document.id) then nextAsset}
          {#if nextAsset}
            <div class="alert alert-info alert-dash mt-5">
              <div>
                <span
                  >There is a newer version of this document effective from {formatDmsDateUtc(
                    nextAsset.effectiveDate
                  )}.</span
                >
                <a
                  class="underline transition hover:text-white"
                  href="/docs/{params.groupSlug}/{params.documentShort}/next"
                  >Click here to view it.</a
                >
              </div>
            </div>
          {/if}
        {/await}

        <p class="text-base-content/70 mt-2">{document.description}</p>

        {#await getCurrentAsset(document.id) then asset}
          {#if asset}
            <a
              href="/docs/{params.groupSlug}/{params.documentShort}/pdf"
              class="btn btn-primary mt-6"
              target="_blank">View Document</a
            >
          {:else}
            <button class="btn btn-primary mt-6" disabled>View Document</button>
          {/if}

          {#if document.required}
            <div class="mt-12">
              {#await getDocumentAcknowledgement(document.id) then acknowledgement}
                {#if acknowledgement.acknowledgedAt}
                  <div class="alert alert-success alert-soft mt-6">
                    <span>
                      You acknowledged this document on
                      {formatDmsDateUtc(acknowledgement.acknowledgedAt)}.
                    </span>
                  </div>
                {:else if acknowledgement.canAcknowledge}
                  <p>You have not yet acknowledged this document.</p>
                  <p>
                    By clicking acknowledge, you are saying that you have read and understand this
                    document.
                  </p>
                  <button
                    class="btn btn-success my-3"
                    onclick={() => onAcknowledge(document.id)}
                    disabled={isAcknowledging}
                  >
                    {isAcknowledging ? 'Acknowledging...' : 'Acknowledge Document'}
                  </button>
                {:else}
                  <div class="alert alert-warning alert-soft mt-6">
                    <span>
                      {#if !acknowledgement.currentAssetId}
                        Acknowledgement is unavailable because there is no current asset for this
                        document.
                      {:else}
                        You must be a Home Controller or a Visitor and logged in to acknowledge
                        documents.
                      {/if}
                    </span>
                  </div>
                {/if}

                {#if acknowledgeError}
                  <div class="alert alert-error alert-soft mt-4">
                    <span>{acknowledgeError}</span>
                  </div>
                {/if}
              {/await}
            </div>
          {/if}
        {/await}
      {:else}
        <h1 class="pt-6 text-2xl">Document Not Found</h1>
        <div class="divider"></div>
      {/if}
    {/await}
  </div>
</section>
