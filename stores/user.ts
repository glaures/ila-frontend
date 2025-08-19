// stores/user.ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
    state: () => ({
        username: null as string | null,
    }),
    actions: {
        setUsername(name: string | null) {
            this.username = name
        },
    },
    persist: true,  // reicht völlig! default = localStorage
})
