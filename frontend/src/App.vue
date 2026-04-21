<script setup lang="ts">
import { RouterView } from 'vue-router'
import Navbar from '@/components/layout/Navbar.vue'
import Footer from '@/components/layout/Footer.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#0f1319] text-white">
    <Navbar />
    <main class="flex-grow flex flex-col">
      <RouterView />
    </main>
    <Footer />
  </div>
</template>
