<script lang="ts">
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data = $bindable() }: Props = $props();
</script>

<section id="about" class="bg-base-200">
  <div class="hero min-h-max pt-7">
    <div class="hero-content container flex-col md:flex-row">
      <img
        src="https://files.czqm.ca/images/simple-black-airspace.png"
        class="hidden max-w-sm rounded-lg shadow-2xl md:block"
        alt="Blank map of eastern Canadian provinces representing airspace"
      />
      <div>
        <h1 class="text-5xl font-bold">What is the Moncton Gander FIR?</h1>
        <p class="py-3">
          The Moncton Flight Information Region (CZQM) is a virtual controlling region on the VATSIM
          network. The Moncton FIR controls over 700,000sq miles of airspace.
        </p>
        <p class="">
          CZQM currently has seven (7) controlled airports and three (3) Flight service specialist
          (FSS) operated aerodromes.
        </p>
        <p class="py-3">
          CZQM is governed by the leadership and Code of Conduct (CoC) of VATCAN and VATSIM. The FIR
          provides regulated training to those who are active members so they can provide realistic
          Air Traffic services to other VATSIM users.
        </p>
        <a href="/join" class="btn btn-primary join-item">Join Us</a>
      </div>
    </div>
  </div>

  <div class="hero min-h-max md:py-10">
    <div class="hero-content text-center">
      <div class="max-w-xl">
        <h1 class="text-left text-5xl font-bold md:text-center">Still Have Questions?</h1>
        <p class="py-6">
          Checkout our FAQs! Our volunteer staff team is also availible to answer any questions you
          may have. Checkout our contact page to reach out. Please keep in mind that we are all
          volunteers and it may take 24-48 hours before you recieve a response.
        </p>
        <div class="join">
          <a href="https://wiki.czqm.ca/en/faqs" class="btn btn-primary join-item">FAQs</a>
          <a href="/contact" class="btn btn-primary join-item">Contact Us</a>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  p {
    @apply text-justify;
  }
</style>
