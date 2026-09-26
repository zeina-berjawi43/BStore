import { readTokens } from './tokenStorage';

export class RequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

// Bound network waits without retrying mutations such as checkout.
export async function request(
  url: string,
  options: RequestInit = {},
  timeoutMs = 30000
): Promise<Response> {
  const headers = options.headers as Record<string, string> | undefined;
  const authenticated = !!(headers?.Authorization || headers?.authorization);
  const credentials = authenticated ? await readTokens() : null;
  const session = credentials?.refreshToken;
  if (authenticated && (!credentials?.accessToken ||
      (headers?.Authorization || headers?.authorization) !== `Bearer ${credentials.accessToken}`)) {
    throw new RequestError('Your session changed. Please reload this page.', 409);
  }
  const verifySession = async () => {
    if (authenticated && (await readTokens()).refreshToken !== session) {
      throw new RequestError('Your session changed. Please reload this page.', 409);
    }
  };
  const controller = new AbortController();
  const cancel = () => controller.abort();
  const signal = options.signal;
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', cancel);
  const timer = setTimeout(cancel, timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    await verifySession();
    if (response.status === 403 && !url.includes('/auth/')) {
      throw new RequestError('You do not have permission to perform this action.', 403);
    }
    const json = response.json.bind(response);
    response.json = async () => {
      let bodyTimer: ReturnType<typeof setTimeout> | undefined;
      let onAbort: (() => void) | undefined;
      try {
        const deadline = new Promise<never>((_, reject) => {
          onAbort = () => { controller.abort(); reject(new Error('Request cancelled.')); };
          if (signal?.aborted) { onAbort(); return; }
          signal?.addEventListener('abort', onAbort);
          bodyTimer = setTimeout(() => {
            controller.abort();
            reject(new Error('The server response timed out. Please try again.'));
          }, timeoutMs);
        });
        const data = await Promise.race([json(), deadline]);
        await verifySession();
        return data;
      } finally {
        clearTimeout(bodyTimer);
        if (onAbort) signal?.removeEventListener('abort', onAbort);
      }
    };
    return response;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}
