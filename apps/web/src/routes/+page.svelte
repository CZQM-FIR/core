<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/stores';

  let { data }: { data: PageData } = $props();
</script>

<section id="hero" class="hero min-h-screen">
  <div class="hero-overlay bg-opacity-60"></div>
  <div class="hero-content text-center text-neutral-content">
    <div class="max-w-md">
      <h1 class="mb-5 text-5xl font-bold">Canada's Gateway to the East Coast</h1>
      <p class="mb-5">
        Providing realistic ATC services across the maritime provinces on the VATSIM network.
      </p>
      <a href="/about" class="btn btn-primary">Learn More</a>
    </div>
  </div>
</section>

<style>
  #hero {
    background:
      linear-gradient(rgba(0, 0, 0, 0.473), rgba(0, 0, 0, 0.473)),
      url('https://files.czqm.ca/images/hero-bg.jpg') no-repeat center / cover;
  }
</style>
