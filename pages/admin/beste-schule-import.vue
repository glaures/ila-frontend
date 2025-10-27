<template>
    <div class="container-fluid py-3">
        <div class="d-flex align-items-center justify-content-between mb-3">
            <h1 class="h4 mb-0">Beste Schule Import</h1>
        </div>
        
        <div class="row">
            <div class="col-12">
                
                <div class="card">
                    <div class="card-body">
                        <div 
                            class="upload-area"
                            :class="{ 'drag-over': isDragging }"
                            @drop.prevent="handleDrop"
                            @dragover.prevent="isDragging = true"
                            @dragleave.prevent="isDragging = false"
                            @click="triggerFileInput"
                        >
                            <div v-if="!selectedFile" class="upload-content">
                                <i class="bi bi-cloud-upload fs-1 text-primary mb-3"></i>
                                <h5>JSON-Datei hier ablegen</h5>
                                <p class="text-muted">oder klicken zum Auswählen</p>
                                <button type="button" class="btn btn-primary mt-2">
                                    Datei auswählen
                                </button>
                            </div>
                            
                            <div v-else class="selected-file">
                                <i class="bi bi-file-earmark-text fs-1 text-success mb-3"></i>
                                <h5>{{ selectedFile.name }}</h5>
                                <p class="text-muted">{{ formatFileSize(selectedFile.size) }}</p>
                                <button 
                                    type="button" 
                                    class="btn btn-outline-danger btn-sm"
                                    @click.stop="removeFile"
                                >
                                    <i class="bi bi-trash"></i> Entfernen
                                </button>
                            </div>
                        </div>
                        
                        <input 
                            ref="fileInput"
                            type="file" 
                            accept=".json,application/json"
                            class="d-none"
                            @change="handleFileSelect"
                        />
                        
                        <div v-if="selectedFile" class="mt-4 d-flex gap-2">
                            <button 
                                type="button" 
                                class="btn btn-success"
                                :disabled="isUploading"
                                @click="uploadFile"
                            >
                                <span v-if="isUploading">
                                    <span class="spinner-border spinner-border-sm me-2"></span>
                                    Wird hochgeladen...
                                </span>
                                <span v-else>
                                    <i class="bi bi-upload me-2"></i>
                                    Importieren
                                </span>
                            </button>
                            
                            <button 
                                type="button" 
                                class="btn btn-secondary"
                                :disabled="isUploading"
                                @click="removeFile"
                            >
                                Abbrechen
                            </button>
                        </div>
                        
                        <div v-if="uploadResult" class="mt-4">
                            <div 
                                class="alert"
                                :class="{
                                    'alert-success': uploadResult.success,
                                    'alert-danger': !uploadResult.success
                                }"
                            >
                                <h5 class="alert-heading">
                                    <i :class="uploadResult.success ? 'bi bi-check-circle' : 'bi bi-x-circle'"></i>
                                    {{ uploadResult.success ? 'Import erfolgreich' : 'Import fehlgeschlagen' }}
                                </h5>
                                <p class="mb-0">{{ uploadResult.message }}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card mt-4">
                    <div class="card-body">
                        <h5 class="card-title">Hinweise</h5>
                        <ul>
                            <li>Es werden nur JSON-Dateien akzeptiert</li>
                            <li>Die Datei sollte das Format der "Beste Schule" App entsprechen</li>
                            <li>Der Import kann einige Zeit dauern, je nach Dateigröße</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    layout: 'admin'
})

const { $authFetch } = useNuxtApp()
const errorStore = useErrorStore()
const toastStore = useToastStore()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const isDragging = ref(false)
const isUploading = ref(false)
const uploadResult = ref<{ success: boolean; message: string } | null>(null)

const triggerFileInput = () => {
    fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement
    if (target.files && target.files.length > 0) {
        selectFile(target.files[0])
    }
}

const handleDrop = (event: DragEvent) => {
    isDragging.value = false
    
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
        selectFile(event.dataTransfer.files[0])
    }
}

const selectFile = (file: File) => {
    if (!file.type.includes('json') && !file.name.endsWith('.json')) {
        errorStore.show('Bitte wählen Sie eine JSON-Datei aus')
        return
    }
    
    selectedFile.value = file
    uploadResult.value = null
}

const removeFile = () => {
    selectedFile.value = null
    uploadResult.value = null
    if (fileInput.value) {
        fileInput.value.value = ''
    }
}

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const uploadFile = async () => {
    if (!selectedFile.value) return
    
    isUploading.value = true
    uploadResult.value = null
    
    try {
        const formData = new FormData()
        formData.append('file', selectedFile.value)
        
        const response = await $authFetch('/import/besteschule', {
            method: 'POST',
            body: formData
        })
        
        uploadResult.value = {
            success: true,
            message: 'Die Daten wurden erfolgreich importiert.'
        }
        
        toastStore.success('Import erfolgreich abgeschlossen')
        
        // Reset nach erfolg
        setTimeout(() => {
            removeFile()
        }, 2000)
        
    } catch (err: any) {
        uploadResult.value = {
            success: false,
            message: err?.data?.message || 'Es ist ein Fehler beim Import aufgetreten.'
        }
        
        errorStore.show(err?.data?.message ?? 'Es ist ein interner Fehler aufgetreten: ' + err)
    } finally {
        isUploading.value = false
    }
}
</script>

<style scoped>
.upload-area {
    border: 3px dashed #dee2e6;
    border-radius: 8px;
    padding: 60px 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background-color: #f8f9fa;
}

.upload-area:hover {
    border-color: #0d6efd;
    background-color: #e7f1ff;
}

.upload-area.drag-over {
    border-color: #0d6efd;
    background-color: #cfe2ff;
    transform: scale(1.02);
}

.upload-content i,
.selected-file i {
    display: block;
}

.selected-file {
    padding: 20px;
}

.alert {
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
