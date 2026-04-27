'use strict';

const http = require('http');
const https = require('https');

const PORT = Number(process.env.DEV_PROXY_PORT || 8099);
const API_ORIGIN = process.env.DEV_PROXY_API_ORIGIN || 'https://foodplayserver.shop';
const ALLOWED_ASSET_HOSTS = new Set([
  'cdn.plate-service.com',
  'foodplayserver.shop',
]);
const ALLOWED_ASSET_HOST_SUFFIXES = [
  '.s3.ap-northeast-2.amazonaws.com',
  '.s3.amazonaws.com',
];

const hopByHopHeaders = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

const sanitizeHeaders = (headers) => {
  const nextHeaders = {};
  Object.entries(headers || {}).forEach(([key, value]) => {
    if (!hopByHopHeaders.has(String(key).toLowerCase()) && value != null) {
      nextHeaders[key] = value;
    }
  });
  return nextHeaders;
};

const writeJson = (res, statusCode, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
};

const isAllowedAssetHost = (hostname) =>
  ALLOWED_ASSET_HOSTS.has(hostname) ||
  ALLOWED_ASSET_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));

const proxyRequest = (req, res, upstreamUrl) => {
  const client = upstreamUrl.protocol === 'https:' ? https : http;
  const headers = sanitizeHeaders(req.headers);
  headers.host = upstreamUrl.host;

  const upstreamReq = client.request(
    upstreamUrl,
    {
      method: req.method,
      headers,
    },
    (upstreamRes) => {
      res.writeHead(
        upstreamRes.statusCode || 502,
        sanitizeHeaders(upstreamRes.headers),
      );
      upstreamRes.pipe(res);
    },
  );

  upstreamReq.on('error', (error) => {
    console.error('[dev-emulator-proxy] upstream error', {
      target: upstreamUrl.toString(),
      message: error.message,
    });
    if (!res.headersSent) {
      writeJson(res, 502, {
        message: 'Proxy upstream request failed',
        target: upstreamUrl.toString(),
        error: error.message,
      });
      return;
    }
    res.destroy(error);
  });

  req.pipe(upstreamReq);
};

const server = http.createServer((req, res) => {
  if (!req.url) {
    writeJson(res, 400, { message: 'Missing request URL' });
    return;
  }

  const requestUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (requestUrl.pathname === '/healthz') {
    writeJson(res, 200, {
      ok: true,
      apiOrigin: API_ORIGIN,
      allowedAssetHosts: Array.from(ALLOWED_ASSET_HOSTS),
    });
    return;
  }

  if (requestUrl.pathname.startsWith('/api-proxy/')) {
    const upstreamPath = requestUrl.pathname.replace(/^\/api-proxy/, '') || '/';
    const upstreamUrl = new URL(`${upstreamPath}${requestUrl.search}`, API_ORIGIN);
    console.log('[dev-emulator-proxy] api', req.method, upstreamUrl.toString());
    proxyRequest(req, res, upstreamUrl);
    return;
  }

  if (requestUrl.pathname === '/asset-proxy') {
    const encodedTarget = requestUrl.searchParams.get('url');
    if (!encodedTarget) {
      writeJson(res, 400, { message: 'Missing url query parameter' });
      return;
    }

    let upstreamUrl;
    try {
      upstreamUrl = new URL(encodedTarget);
    } catch {
      writeJson(res, 400, { message: 'Invalid asset target URL' });
      return;
    }

    if (!isAllowedAssetHost(upstreamUrl.hostname)) {
      writeJson(res, 403, { message: 'Asset host is not allowed', host: upstreamUrl.hostname });
      return;
    }

    console.log('[dev-emulator-proxy] asset', req.method, upstreamUrl.toString());
    proxyRequest(req, res, upstreamUrl);
    return;
  }

  writeJson(res, 404, { message: 'Unknown proxy route' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(
    `[dev-emulator-proxy] listening on http://0.0.0.0:${PORT} -> ${API_ORIGIN}`,
  );
});
