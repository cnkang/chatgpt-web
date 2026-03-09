type RouteUuidParam = string | string[] | null | undefined

interface SyncChatRouteOptions {
  routeUuid: number | null
  activeUuid: number | null
  replaceRoute: (uuid: number) => Promise<void> | void
  syncActive: (uuid: number) => void
}

export function parseChatRouteUuid(value: RouteUuidParam): number | null {
  const routeValue = Array.isArray(value) ? value[0] : value
  if (!routeValue) return null

  const parsed = Number.parseInt(routeValue, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

export async function syncChatRoute({
  routeUuid,
  activeUuid,
  replaceRoute,
  syncActive,
}: SyncChatRouteOptions) {
  if (routeUuid === null) {
    if (activeUuid !== null) await replaceRoute(activeUuid)
    return
  }

  syncActive(routeUuid)
}
