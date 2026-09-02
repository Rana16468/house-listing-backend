import { Request } from 'express';

const logError = (err: Error, req: Request) => {
  const logError = {
    timestamps: new Date().toISOString(),
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    api: {
      method: req.method,
      endpoint: req.originalUrl, // full path including query string
      baseUrl: req.baseUrl,
      path: req.path,
      protocol: req.protocol,
      fullUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      params: req.params,
      query: req.query,
      body: req.body,
    },
    request: {
      headers: req.headers,
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      ips: req.ips, // list of IPs when behind proxies (X-Forwarded-For)
    },
    socket: {
      remoteAddress: req.socket?.remoteAddress,
      remotePort: req.socket?.remotePort,
      localAddress: req.socket?.localAddress,
      localPort: req.socket?.localPort,
      bytesRead: req.socket?.bytesRead,
      bytesWritten: req.socket?.bytesWritten,
    },
  };

  console.log(JSON.stringify(logError, null, 2));

  return logError;
};

export default logError;