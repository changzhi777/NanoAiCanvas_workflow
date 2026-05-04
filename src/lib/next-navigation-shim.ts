// Shim for next/navigation when not using Next.js
export function useRouter() {
  return {
    push: (href: string) => { window.location.href = href },
    replace: (href: string) => { window.location.replace(href) },
    back: () => { window.history.back() },
    forward: () => { window.history.forward() },
    prefetch: () => {},
  }
}

export function useParams() {
  return {}
}

export function useSearchParams() {
  if (typeof window === 'undefined') return new URLSearchParams()
  return new URLSearchParams(window.location.search)
}

export function usePathname() {
  if (typeof window === 'undefined') return '/'
  return window.location.pathname
}