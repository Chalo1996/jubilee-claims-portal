function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const isDev = process.env.NODE_ENV !== 'production';
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.message}`);
  if (isDev) console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const message =
    statusCode === 500 && !isDev
      ? 'An unexpected error occurred.'
      : err.message;

  res.status(statusCode).json({ error: message });
}

module.exports = errorHandler;
