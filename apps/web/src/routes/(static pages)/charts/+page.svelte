<script lang="ts">
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data = $bindable() }: Props = $props();
</script>

<section id="charts-info" class="hero bg-base-200 min-h-screen">
  <div class="hero-content flex-col lg:flex-row">
    <img
      src="https://files.czqm.ca/images/fundy5.png"
      alt="NAVCAN Chart for the FUNDY5 arrival into Halifax"
      class="image"
    />
    <div>
      <h1 class="text-5xl font-bold">What about charts?</h1>
      <p class="">
        Unfortunatly, we are unable to provide pilots with charts at this time. There are many
        different places where you can access charts for free online.
      </p>
      <br />
      <p>
        The best option for IFR charts is <a
          href="https://navigraph.com"
          target="_blank"
          class="link">Navigraph</a
        > which provides Jeppesen charts and FMS data for a monthly subscription.
      </p>
      <br />
      <p>
        The <a href="https://www.navcanada.ca/en/ecfs_07_en.pdf" target="_blank" class="link"
          >Canada Flight Supplement</a
        > is a great option for accessing airport charts and procedure charts for all airports across
        Canada.
      </p>
      <br />
      <p class="">
        For airport charts, <a href="https://fltplan.com" target="_blank" class="link"
          >fltplan.com</a
        > is a great resource and has all Canadian charts availible with a free account. They even include
        moving charts if you use their app!
      </p>
      <br />
      <p>
        For VFR sectionals, <a href="https://skyvector.com" target="_blank" class="link"
          >Skyvector</a
        > has the majority of Canadian VFR charts
      </p>
    </div>
  </div>
</section>

<style>
  .image {
    width: 40%;
    height: auto;
    transform: rotate(-90deg);
  }
</style>
