// ===== 커스텀 에러 클래스 =====

export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message = '리소스를 찾을 수 없습니다.') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '권한이 없습니다.') {
    super(message, 403);
  }
}

export class AIServiceError extends AppError {
  constructor(model, detail) {
    super(`${model} AI 서비스 오류: ${detail}`, 502);
    this.model = model;
  }
}
