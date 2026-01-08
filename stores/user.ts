// stores/user.ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
    state: () => ({
        username: null as string | null,
        name: null as string | null,
        roles: [] as string[],
    }),
    actions: {
        setUsername(name: string | null) {
            this.username = name
        },
        setName(name: string | null) {
            this.name = name
        },
        setRoles(roles: string[]) {
            this.roles = roles
        },
        setUser(user: { username: string | null; name: string | null; roles: string[] }) {
            this.username = user.username
            this.name = user.name
            this.roles = user.roles
        },
        clear() {
            this.username = null
            this.name = null
            this.roles = []
        },
        hasRole(role: string): boolean {
            return this.roles.includes(role)
        },
        isAdmin(): boolean {
            return this.hasRole('ADMIN') || this.hasRole('SCHOOL_Admin')
        }
    },
    persist: true,
})