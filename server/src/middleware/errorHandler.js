export function errorHandler(err, _req, res, _next) {
  console.error('[Error]', err.message);

  const status = err.status || 500;
  res.status(status).json({
    error: err.message || '서버 내부 오류가 발생했습니다.',
  });
}
