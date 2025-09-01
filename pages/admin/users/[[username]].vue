<template>
  <div class="container mt-4">
    <h1 class="mb-4">Kurszuweisungen verwalten</h1>

    <!-- Schülersuche -->
    <div class="mb-4">
      <label class="form-label">Schüler suchen</label>
      <input
          v-model="studentSearch"
          class="form-control"
          placeholder="Vorname oder Nachname"
      />
      <ul class="list-group" v-if="filteredStudents.length && studentSearch">
        <li
            class="list-group-item list-group-item-action"
            v-for="student in filteredStudents"
            :key="student.username"
            @click="selectStudent(student)"
        >
          {{ student.firstName }} {{ student.lastName }} ({{ student.userName }})
        </li>
      </ul>
    </div>

    <!-- Feedback-Ausgabe -->
    <div v-if="feedback.info.length" class="alert alert-success">{{ feedback.info.join(' ') }}</div>
    <div v-if="feedback.warning.length" class="alert alert-warning">{{ feedback.warning.join(' ') }}</div>
    <div v-if="feedback.error.length" class="alert alert-danger">{{ feedback.error.join(' ') }}</div>

    <!-- Kurszuweisungen anzeigen -->
    <div v-if="selectedStudent">
      <h5>Kurse von {{ selectedStudent.firstName }} {{ selectedStudent.lastName }}</h5>
      <table class="table table-sm">
        <thead>
        <tr>
          <th>Kurs</th>
          <th>Aktion</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="assignment in assignments" :key="assignment.id">
          <td>{{ assignment.course.courseId}}:&nbsp;{{ assignment.course.name }}</td>
          <td>
            <button class="btn btn-danger btn-sm" @click="removeAssignment(assignment.id)">Entfernen</button>
          </td>
        </tr>
        </tbody>
      </table>

      <!-- Kurs hinzufügen -->
      <div class="mt-4">
        <label class="form-label">Kurs hinzufügen</label>
        <input
            v-model="courseSearch"
            @input="filterCourses"
            class="form-control"
            placeholder="Kursname oder Kurs-ID"
        />
        <ul class="list-group" v-if="filteredCourses.length && courseSearch">
          <li
              class="list-group-item list-group-item-action"
              v-for="course in filteredCourses"
              :key="course.courseId"
              @click="selectCourse(course)"
          >
            {{ course.name }} ({{ course.courseId }})
          </li>
        </ul>
        <div v-if="selectedCourse" class="mt-2">
          {{selectedCourse.courseId}}:&nbsp;{{selectedCourse.name}}
          <button class="btn btn-primary" @click="assignCourse">Zuweisen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

definePageMeta({
  layout: 'admin'
})

const route = useRoute()
const { $authFetch } = useNuxtApp()

const students = ref([])
const courses = ref([])
const assignments = ref([])

const studentSearch = ref('')
const selectedStudent = ref(null)

const courseSearch = ref('')
const filteredCourses = ref([])
const selectedCourse = ref(null)

const feedback = ref({ info: [], warning: [], error: [] })

const filteredStudents = computed(() => {
  const q = studentSearch.value
  if (!q) return []
  return students.value.filter(s => s.firstName?.includes(q) || s.lastName?.includes(q))
})

onMounted(async () => {
  students.value = await $authFetch('/users')
  courses.value = await $authFetch('/courses')
  const param = route.params?.username
  if (param) {
    const userName = decodeURIComponent(param)
    selectStudent({userName})
    studentSearch.value = userName
  }
})

function selectStudent(student) {
  selectedStudent.value = student
  studentSearch.value = ''
  filteredStudents.value = []
  loadAssignments()
}

async function loadAssignments() {
  if (!selectedStudent.value) return
  assignments.value = await $authFetch(`/assignments?user-name=${selectedStudent.value.userName}`)
}

function filterCourses() {
  const q = courseSearch.value.toLowerCase()
  filteredCourses.value = courses.value.filter(
      c => c.name.toLowerCase().includes(q) || c.courseId.toString().includes(q)
  )
}

function selectCourse(course) {
  console.log('course selected: ' + course.name)
  selectedCourse.value = course
  courseSearch.value = ''
  filteredCourses.value = []
}

async function assignCourse() {
  if (!selectedStudent.value || !selectedCourse.value) return
  const result = await $authFetch('/assignments', {
    method: 'POST',
    body: {
      userName: selectedStudent.value.userName,
      courseId: selectedCourse.value.courseId,
    },
  })
  showFeedback(result)
  await loadAssignments()
  selectedCourse.value = null
}

async function removeAssignment(id) {
  console.log("deleting " + id)
  const result = await $authFetch(`/assignments/${id}`, { method: 'DELETE' })
  showFeedback(result)
  await loadAssignments()
}

function showFeedback(result) {
  console.log("feedback: " + result.info)
  feedback.value = {
    info: result.info || [],
    warning: result.warning || [],
    error: result.error || [],
  }
}

// Wenn intern auf anderen Nutzer-Param navigiert wird (ebenfalls nur mit [[username]].vue relevant)
watch(() => route.params?.username, (val) => {
  if (val) {
    const userName = decodeURIComponent(String(val))
    selectStudent(userName)
  }
})
</script>

<style scoped>
.container {
  max-width: 800px;
}
</style>
