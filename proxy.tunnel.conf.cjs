const tunnelUrl = process.env.VRIN_API_TUNNEL_URL;

if (!tunnelUrl) {
  throw new Error('Define VRIN_API_TUNNEL_URL con la URL HTTPS vigente del túnel.');
}

let target;
try {
  target = new URL(tunnelUrl);
} catch {
  throw new Error('VRIN_API_TUNNEL_URL debe ser una URL HTTPS válida.');
}

if (target.protocol !== 'https:' || target.username || target.password || target.pathname !== '/' || target.search || target.hash) {
  throw new Error('VRIN_API_TUNNEL_URL debe contener solo el origen HTTPS, sin ruta ni credenciales.');
}

const proxy = {
  target: target.origin,
  secure: true,
  changeOrigin: true,
};

module.exports = {
  '/api/**': proxy,
  '/sanctum/**': proxy,
};
