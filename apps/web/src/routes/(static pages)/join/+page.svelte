<script lang="ts">
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data = $bindable() }: Props = $props();
</script>

<section id="join" class="min-h-screen">
  <div class="container mx-auto">
    <h1 class="pt-6 text-2xl">Join Us</h1>
    <div class="divider"></div>
  </div>
  <div class="flex flex-col justify-center gap-10 max-md:items-center md:flex-row">
    <div class="card w-96 bg-base-200 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">New Controllers</h2>
        <p>
          Are you looking to join an energetic and friendly controlling environment? Moncton/Gander
          FIR, The Gateway to Canada's East Coast, is an amazing learning environment with some of
          Canada's best Instructors and Mentors as well as an amazing community.
        </p>
        <p>
          In the Moncton/Gander FIR, we strive to provide you with the best training as a virtual air
          traffic controller in order for virtual pilots that fly in airspace, to receive the high
          level of ATC they have come to expect. Sign up with CZQM/QX FIR today and start your
          virtual air traffic control career.
        </p>
        <div class="card-actions justify-end">
          <a href="https://vatcan.ca/division/controlling" target="_blank" class="btn btn-primary"
            >Learn More</a
          >
        </div>
      </div>
    </div>

    <div class="card w-96 bg-base-200 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Request a Transfer</h2>
        <p>
          Already a controller in another FIR or division but want to control in the Atlantic? We
          are always looking for controllers to join our team. If you are interested in transferring
          to Moncton/Gander FIR, please fill out a transfer request.
        </p>
        <div class="card-actions justify-end">
          <a href="https://vatcan.ca/my/transfer" target="_blank" class="btn btn-primary"
            >Transfer</a
          >
        </div>
      </div>
    </div>

    <div class="card w-96 bg-base-200 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Visiting</h2>
        <p>
          The Moncton/Gander FIR is a great place to control as a visitor. We accept visitors from
          all over the world and are always looking for new people to join our community. If you are
          interested in controlling with us, please feel free to aply!
        </p>
        <div class="card-actions justify-end">
          <a href="https://vatcan.ca/my/visit" target="_blank" class="btn btn-primary"
            >Apply to Visit</a
          >
        </div>
      </div>
    </div>
  </div>
</section>
