import 'server-only';

import {
  AxiosError,
  AxiosHeaders,
  create,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from 'axios';

export class DolibarrApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'DolibarrApiError';
  }
}

export class DolibarrAuthError extends DolibarrApiError {
  constructor(details?: unknown) {
    super('Authentification Dolibarr refusee', 401, 'DOLIBARR_AUTH_ERROR', details);
    this.name = 'DolibarrAuthError';
  }
}

export class DolibarrNotFoundError extends DolibarrApiError {
  constructor(details?: unknown) {
    super('Ressource Dolibarr introuvable', 404, 'DOLIBARR_NOT_FOUND', details);
    this.name = 'DolibarrNotFoundError';
  }
}

export class DolibarrServerError extends DolibarrApiError {
  constructor(details?: unknown) {
    super('Erreur serveur Dolibarr', 500, 'DOLIBARR_SERVER_ERROR', details);
    this.name = 'DolibarrServerError';
  }
}

interface DolibarrRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    startedAt: number;
  };
  retryCount?: number;
}

const MAX_NETWORK_RETRIES = 2;

function getDolibarrEnv() {
  const baseURL = process.env.DOLIBARR_API_URL;

  if (!baseURL) {
    throw new DolibarrApiError('Configuration Dolibarr manquante', 500, 'DOLIBARR_CONFIG_ERROR');
  }

  return { baseURL };
}

function createDolibarrClient(): AxiosInstance {
  const { baseURL } = getDolibarrEnv();
  const client = create({
    baseURL,
    timeout: 10_000,
    headers: {
      Accept: 'application/json'
    }
  });

  client.interceptors.request.use((config) => {
    const requestConfig = config as DolibarrRequestConfig;
    requestConfig.metadata = { startedAt: Date.now() };
    requestConfig.headers = AxiosHeaders.from(requestConfig.headers);
    return requestConfig;
  });

  client.interceptors.response.use(
    (response: AxiosResponse) => {
      logRequest(response.config as DolibarrRequestConfig, response.status);
      return response;
    },
    async (error: AxiosError) => {
      const config = error.config as DolibarrRequestConfig | undefined;
      const status = error.response?.status;

      if (config && !status && (config.retryCount ?? 0) < MAX_NETWORK_RETRIES) {
        config.retryCount = (config.retryCount ?? 0) + 1;
        return client.request(config);
      }

      if (config) {
        logRequest(config, status ?? 0);
      }

      if (status === 401) throw new DolibarrAuthError(error.response?.data);
      if (status === 404) throw new DolibarrNotFoundError(error.response?.data);
      if (status && status >= 500) throw new DolibarrServerError(error.response?.data);

      throw new DolibarrApiError(
        error.message,
        status ?? 503,
        status ? 'DOLIBARR_HTTP_ERROR' : 'DOLIBARR_NETWORK_ERROR',
        error.response?.data
      );
    }
  );

  return client;
}

function logRequest(config: DolibarrRequestConfig, status: number) {
  if (process.env.NODE_ENV !== 'development') return;

  const duration = config.metadata?.startedAt ? Date.now() - config.metadata.startedAt : 0;
  const method = config.method?.toUpperCase() ?? 'GET';
  const url = config.url ?? '/';

  console.warn(
    JSON.stringify({
      source: 'dolibarr',
      method,
      url,
      status,
      duration
    })
  );
}

export const dolibarrClient = createDolibarrClient();

export function getDolibarrAuthHeaders(apiKey?: string) {
  const token = apiKey || process.env.DOLIBARR_API_KEY;

  if (!token) {
    throw new DolibarrAuthError('Jeton Dolibarr manquant pour cet utilisateur');
  }

  return {
    DOLAPIKEY: token
  };
}

interface DolibarrLoginResponse {
  token?: string;
  apikey?: string;
  success?: {
    token?: string;
    apikey?: string;
  };
}

export async function requestDolibarrToken(options: {
  login: string;
  password: string;
  reset?: boolean;
}) {
  const response = await dolibarrClient.get<DolibarrLoginResponse>('/login', {
    params: {
      login: options.login,
      password: options.password,
      reset: options.reset ? 1 : undefined
    }
  });

  const token =
    response.data.token ??
    response.data.apikey ??
    response.data.success?.token ??
    response.data.success?.apikey;

  if (!token) {
    throw new DolibarrAuthError(response.data);
  }

  return token;
}
