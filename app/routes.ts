import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("health", "routes/health.tsx"),

  // Auth (OAuth via git provider)
  route("auth/login", "routes/auth.login.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("auth/logout", "routes/auth.logout.tsx"),

  // Search + realtime
  route("search", "routes/search.tsx"),
  route("api/search", "routes/api.search.tsx"),
  route("api/search/suggestions", "routes/api.search.suggestions.tsx"),
  route("api/events", "routes/api.events.tsx"),

  // Collaboration APIs
  route("api/comments", "routes/api.comments.tsx"),
  route("api/comments/:id", "routes/api.comments.$id.tsx"),
  route("api/suggestions", "routes/api.suggestions.tsx"),
  route("api/suggestions/:id", "routes/api.suggestions.$id.tsx"),
  route("api/discussions", "routes/api.discussions.tsx"),
  route("api/discussions/:id", "routes/api.discussions.$id.tsx"),
  route("api/discussions/:id/messages", "routes/api.discussions.$id.messages.tsx"),
  route(
    "api/discussions/:id/messages/:messageId",
    "routes/api.discussions.$id.messages.$messageId.tsx"
  ),
  route("api/sessions", "routes/api.sessions.tsx"),

  // Notification preferences + email unsubscribe
  route("settings/notifications", "routes/settings.notifications.tsx"),
  route("unsubscribe/success", "routes/unsubscribe.success.tsx"),
  route("unsubscribe/:token", "routes/unsubscribe.$token.tsx"),

  // Dev/test utilities
  route("test-env", "routes/test-env.tsx"),
  route("test-doc", "routes/test-doc.tsx"),

  // Document browsing
  route("docs", "routes/docs.tsx", [
    index("routes/docs._index.tsx"),
    route(":documentId", "routes/docs.$documentId.tsx"),
  ]),
] satisfies RouteConfig;
