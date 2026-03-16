import { supabaseAdmin } from '../config/supabase.js';

export async function getProfile(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { nickname, avatar_url, gender, age } = req.body;

    // 1) profiles 테이블 업데이트
    const updateFields = {};
    if (nickname !== undefined) updateFields.nickname = nickname;
    if (avatar_url !== undefined) updateFields.avatar_url = avatar_url;
    if (gender !== undefined) updateFields.gender = gender;
    if (age !== undefined) updateFields.age = age;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updateFields)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    // 2) Supabase Auth user_metadata 동기화 (프론트 세션에 반영되도록)
    const metaUpdate = {};
    if (nickname !== undefined) metaUpdate.nickname = nickname;
    if (gender !== undefined) metaUpdate.gender = gender;
    if (age !== undefined) metaUpdate.age = age;

    if (Object.keys(metaUpdate).length > 0) {
      await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
        user_metadata: metaUpdate,
      });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    // req.accessToken에 실제 JWT가 있음 (auth 미들웨어에서 저장)
    const { error } = await supabaseAdmin.auth.admin.signOut(req.accessToken, 'global');
    if (error) throw error;
    res.json({ message: '로그아웃 되었습니다.' });
  } catch (err) {
    // 서버 세션 무효화 실패해도 클라이언트 signOut은 진행되므로 성공 처리
    res.json({ message: '로그아웃 되었습니다.' });
  }
}
