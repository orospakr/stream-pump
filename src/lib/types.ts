// Type definitions for Stream Pump

export interface StreamConfig {
  name: string;
  enabled: boolean;
  type: 'mmsh_pull' | 'mmsh_push';
  path: string;
  source_options?: {
    host: string;
    port: string | number;
    path: string;
  };
}

export interface Config {
  port: number;
  use_http_proxy?: boolean;
  http_proxy_host?: string;
  use_proxy_for_local_addresses?: boolean;
  http_proxy_port?: number;
  redirect_404_to?: string;
  ssl?: boolean;
  ssl_port?: number;
  ssl_key?: string;
  ssl_cert?: string;
  streams: StreamConfig[];
}

export interface ConfigExport {
  config: Config;
}

export interface Handler {
  path: string;
  source?: any;
  handler: {
    consumeRequest: (req: any, response: any) => void;
  };
}

export interface HttpRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  socket: {
    remoteAddress: string;
    once(event: string, listener: (error?: boolean) => void): void;
  };
  on(event: string, listener: Function): void;
}

export interface HttpResponse {
  writeHead: (statusCode: number, headers?: Record<string, string>) => void;
  write: (content: string | Buffer) => void;
  end: (content?: string | Buffer) => void;
} 