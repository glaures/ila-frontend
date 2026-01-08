<template>
  <div class="instructor-layout">
    <!-- Header -->
    <header class="instructor-header">
      <div class="container-fluid">
        <div class="d-flex justify-content-between align-items-center py-3">
          <h1 class="h5 mb-0">ILA Kursleiter</h1>
          <button class="btn btn-sm btn-outline-light" @click="handleLogout">
            <i class="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </div>
    </header>

    <!-- Navigation Tabs -->
    <nav class="instructor-nav">
      <div class="container-fluid">
        <div class="nav nav-pills nav-fill" role="tablist">
          <NuxtLink
              to="/instructor/attendance"
              class="nav-link"
              :class="{ active: currentRoute === 'attendance' }"
              role="tab"
          >
            <i class="bi bi-calendar-check d-block fs-4 mb-1"></i>
            <span class="small">Abwesenheiten</span>
          </NuxtLink>
          <NuxtLink
              to="/instructor/assignments"
              class="nav-link"
              :class="{ active: currentRoute === 'assignments' }"
              role="tab"
          >
            <i class="bi bi-person-plus d-block fs-4 mb-1"></i>
            <span class="small">Zuweisungen</span>
          </NuxtLink>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="instructor-main">
      <div class="container-fluid py-3">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()

const currentRoute = computed(() => {
  const path = route.path
  if (path.includes('attendance')) return 'attendance'
  if (path.includes('assignments')) return 'assignments'
  return ''
})

const handleLogout = () => {
  localStorage.removeItem('jwt')
  router.push('/')
}
</script>

<style scoped>
.instructor-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
}

.instructor-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.instructor-nav {
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 60px;
  z-index: 999;
}

.instructor-nav .nav-link {
  color: #6c757d;
  border-radius: 0;
  border-bottom: 3px solid transparent;
  transition: all 0.3s ease;
  padding: 1rem 0.5rem;
}

.instructor-nav .nav-link:hover {
  color: #667eea;
  background-color: #f8f9fa;
}

.instructor-nav .nav-link.active {
  color: #667eea;
  background-color: transparent;
  border-bottom-color: #667eea;
  font-weight: 600;
}

.instructor-main {
  flex: 1;
  overflow-y: auto;
}

/* Mobile Optimierungen */
@media (max-width: 576px) {
  .instructor-header h1 {
    font-size: 1rem;
  }

  .instructor-nav .nav-link {
    padding: 0.75rem 0.25rem;
  }

  .instructor-nav .nav-link i {
    font-size: 1.5rem !important;
  }

  .instructor-nav .nav-link span {
    font-size: 0.75rem;
  }
}

/* Touch-optimierte Klickflächen */
.instructor-nav .nav-link,
.instructor-header button {
  min-height: 44px;
  min-width: 44px;
  touch-action: manipulation;
}
</style>