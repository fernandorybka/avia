import type { Breadcrumb, Event } from "@sentry/nextjs";

// Routes of the projects module, whose requests and pages carry decrypted financial and personal data
const SENSITIVE_PATH = /\/(api\/)?projetos(\/|$|\?)/;

function isSensitiveUrl(url: string | undefined): boolean {
  return typeof url === "string" && SENSITIVE_PATH.test(url);
}

/** Drops request bodies, cookies and query strings from events raised on the projects module. */
export function scrubSensitiveEvent<T extends Event>(event: T): T {
  const request = event.request;
  if (request && isSensitiveUrl(request.url)) {
    delete request.data;
    delete request.cookies;
    delete request.query_string;
    if (request.headers) {
      delete request.headers.cookie;
      delete request.headers.Cookie;
    }
  }
  return event;
}

/** Keeps navigation/fetch breadcrumbs for the projects module but without bodies. */
export function scrubSensitiveBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  const data = breadcrumb.data as { url?: string; to?: string; from?: string } | undefined;
  if (data && (isSensitiveUrl(data.url) || isSensitiveUrl(data.to) || isSensitiveUrl(data.from))) {
    return { ...breadcrumb, data: { url: data.url?.split("?")[0], to: data.to?.split("?")[0], from: data.from?.split("?")[0] } };
  }
  return breadcrumb;
}
