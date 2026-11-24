const http = require('http');
const https = require('https');
const url = require('url');
module.exports = (req, res) => {
    // Get the destination URL from the query parameter (?url=...)
    const queryObject = url.parse(req.url, true).query;
    const targetUrl = queryObject.url;
    // Default landing page if no URL is provided
    if (!targetUrl) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(`
            <div style="font-family: sans-serif; text-align: center; margin-top: 100px;">
                <h1>My Cloud Proxy</h1>
                <p>To browse, append your target URL to this page's URL like this:</p>
                <code>?url=https://example.com</code>
            </div>
        `);
    }
    try {
        const parsedUrl = url.parse(targetUrl);
        const client = parsedUrl.protocol === 'https:' ? https : http;
        // Strip headers that could cause loops or security issues
        const requestHeaders = { ...req.headers };
        delete requestHeaders.host; 
        delete requestHeaders.referer;
        const proxyReq = client.request({
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.path,
            method: req.method,
            headers: {
                ...requestHeaders,
                host: parsedUrl.hostname // Overwrite host header to avoid SSL mismatch
            }
        }, (proxyRes) => {
            // Forward status code and original response headers
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
        });
        // Forward your request body to the destination
        req.pipe(proxyReq, { end: true });
        proxyReq.on('error', (err) => {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Proxy Error: ' + err.message);
        });
    } catch (err) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid Target URL');
    }
};
