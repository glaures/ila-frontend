// stores/user.ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
    state: () => ({
        username: null as string | null,
        name: null as string | null,
        roles: [] as string[],
        // Gesetzt, solange die Sitzung von einem Admin übernommen wurde (Impersonation)
        impersonatedBy: null as string | null,
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
        setImpersonatedBy(admin: string | null) {
            this.impersonatedBy = admin ?? null
        },
        setUser(user: { username: string | null; name: string | null; roles: string[]; impersonatedBy?: string | null }) {
            this.username = user.username
            this.name = user.name
            this.roles = user.roles
            this.impersonatedBy = user.impersonatedBy ?? null
        },
        clear() {
            this.username = null
            this.name = null
            this.roles = []
            this.impersonatedBy = null
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
