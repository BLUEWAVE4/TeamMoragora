import { ValidationError } from '../errors/index.js';

// UUID v4 형식 검증
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// req.params의 지정 키가 UUID인지 검증하는 미들웨어
export function validateUUID(...paramNames) {
  return (req, _res, next) => {
    for (const name of paramNames) {
      const value = req.params[name];
      if (value && !UUID_RE.test(value)) {
        return next(new ValidationError(`잘못된 ID 형식입니다: ${name}`));
      }
    }
    next();
  };
}

// 프로필 업데이트 필드 검증
const VALID_GENDERS = ['male', 'female', 'other'];

export function validateProfileUpdate(req, _res, next) {
  const { nickname, gender, age } = req.body;

  if (nickname !== undefined) {
    if (typeof nickname !== 'string' || nickname.trim().length === 0 || nickname.length > 20) {
      return next(new ValidationError('닉네임은 1~20자 문자열이어야 합니다.'));
    }
  }

  if (gender !== undefined && !VALID_GENDERS.includes(gender)) {
    return next(new ValidationError(`성별은 ${VALID_GENDERS.join(', ')} 중 하나여야 합니다.`));
  }

  if (age !== undefined) {
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
      return next(new ValidationError('나이는 1~150 사이 숫자여야 합니다.'));
    }
    req.body.age = ageNum;
  }

  next();
}
