<template>
  <Header/>
  <div class="min-vh-100 d-flex flex-column">
    <div class="flex-grow-1">
      <div class="container-fluid">
        <div class="row">
          <aside class="col-md-3 col-lg-2 d-md-block bg-light border-end p-3">
            <AdminMenu />
          </aside>

          <!-- Content -->
          <main class="col-12 col-md-9 col-lg-10 p-3 p-md-4">
            <slot />
          </main>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Header from '~/components/Header.vue'
import AdminMenu from '~/components/AdminMenu.vue'

</script>
