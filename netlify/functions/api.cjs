// CJS entry point — Netlify's function runtime uses require(), so we need
// a CJS wrapper that dynamically imports our ESM server code.

let handlerPromise;

function getHandler() {
  if (!handlerPromise) {
    handlerPromise = (async () => {
      const serverless = (await import('serverless-http')).default;
      const { createApp } = await import('../../server/app.js');
      const app = createApp();
      return serverless(app);
    })();
  }
  return handlerPromise;
}

exports.handler = async (event, context) => {
  const handler = await getHandler();
  return handler(event, context);
};
