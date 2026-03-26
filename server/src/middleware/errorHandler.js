import { AppError } from '../errors/index.js';

export function errorHandler(err, req, res, _next) {
  const isAppError = err instanceof AppError;
  const status = err.status || 500;

  if (!isAppError) {
    console.error(`[Error] ${req.method} ${req.originalUrl} →`, err.message);
  } else {
    console.warn(`[${err.name}] ${req.method} ${req.originalUrl} →`, err.message);
  }

  res.status(status).json({
    error: err.message || '서버 내부 오류가 발생했습니다.',
    status,
    code: err.name || 'InternalError',
  });
}
