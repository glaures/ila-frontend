// composables/useAuthFetch.ts
export const useAuthFetch = <T>(url: string, opts: any = {}) => {
    const token = localStorage.getItem('token')

    return useFetch<T>(url, {
        ...opts,
        headers: {
            ...(opts.headers || {}),
            Authorization: token ? `Bearer ${token}` : '',
        },
    })
}
