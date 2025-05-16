<script lang="ts">
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let categories = ['Other', 'Controller Feedback', 'Website Feedback'];

  let feedbackCategory = $state('');
  let controllerCID = $state('');
  let feedbackPage = $state('');
  let subject = $state('');
  let feedbackText = $state('');
</script>

<section id="contact" class="min-h-screen">
  <div class="container mx-auto">
    <h1 class="pt-6 text-2xl">Contact Us</h1>
    <div class="divider"></div>
    <p class="text-center">
      Thanks for looking to submit feedback! Our staff do our best to respond to all inqueries as
      fast as we can. Please be patient as we work to get back to you.
    </p>

    <form class="mt-3 flex flex-col gap-4" method="POST">
      <fieldset class="fieldset w-full max-w-sm">
        <div class="label">
          <span class="label-text">Feedback Category</span>
        </div>
        <select class="select" bind:value={feedbackCategory} required name="category">
          <option disabled selected value={''}>Select a Category</option>
          {#each categories as category, i}
            <option value={i}>{category}</option>
          {/each}
        </select>
      </fieldset>

      {#if feedbackCategory === '1'}
        <fieldset class="fieldset w-full max-w-sm">
          <div class="label">
            <span class="label-text">Controller CID or Name</span>
          </div>
          <input
            type="text"
            class="input w-full max-w-sm"
            bind:value={controllerCID}
            required={feedbackCategory === '1'}
            name="controller"
          />
          <div class="label"></div>
        </fieldset>
      {:else if feedbackCategory === '2'}
        <fieldset class="fieldset w-full max-w-sm">
          <div class="label">
            <span class="label-text">Page</span>
          </div>
          <input
            type="text"
            class="input w-full max-w-sm"
            bind:value={feedbackPage}
            required={feedbackCategory === '2'}
            name="page"
          />
          <div class="label"></div>
        </fieldset>
      {/if}

      <fieldset class="fieldset w-full max-w-sm">
        <div class="label">
          <span class="label-text">Subject</span>
        </div>
        <input
          type="text"
          class="input w-full max-w-sm"
          bind:value={subject}
          required
          name="subject"
        />
        <div class="label"></div>
      </fieldset>

      <fieldset class="fieldset">
        <div class="label">
          <span class="label-text">{feedbackCategory === '2' ? 'Message' : 'Feedback'}</span>
        </div>
        <textarea
          class="textarea h-24"
          disabled={feedbackCategory === ''}
          placeholder={feedbackCategory === ''
            ? 'Please select a feedback category first!'
            : 'Write feedback here...'}
          bind:value={feedbackText}
          required
          name="message"
        ></textarea>
        <div class="label"></div>
      </fieldset>

      <div>
        <button
          class={`btn px-6 ${!form ? 'btn-neutral' : form.status == 200 ? 'btn-success' : 'btn-error'}`}
          >Submit</button
        >
        {#if form}
          <p class="text-md italic">{form.message}</p>
        {/if}
      </div>
    </form>
  </div>
</section>
