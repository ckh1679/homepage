/**
 * auth.js - 프린터모아 회원 인증 모듈 (Google 전용 로그인)
 *
 * 인증 방식: 구글 OAuth2.0 전용
 * 저장 구조:
 *   localStorage['pm_users']    = JSON 배열 (회원 목록)
 *   sessionStorage['pm_session'] = JSON 객체 (현재 로그인 유저)
 */

const Auth = (() => {
  const USERS_KEY = 'pm_users';
  const SESSION_KEY = 'pm_session';
  const BLACKLIST_KEY = 'pm_blacklist';

  // ── 블랙리스트 조회 / 저장 / 차단 확인 ─────────────────
  function getBlacklist() {
    try {
      return JSON.parse(localStorage.getItem(BLACKLIST_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveBlacklist(list) {
    localStorage.setItem(BLACKLIST_KEY, JSON.stringify(list));
    localStorage.setItem(`pm_ts_${BLACKLIST_KEY}`, Date.now().toString());
    if (window.FirebaseDB && typeof window.FirebaseDB.save === 'function') {
      window.FirebaseDB.save(BLACKLIST_KEY, list);
    }
  }

  function cleanStr(s) {
    return s ? String(s).trim().toLowerCase() : '';
  }

  function stripProviderPrefix(s) {
    return cleanStr(s).replace(/^(google_|kakao_|naver_)/, '');
  }

  const GENERIC_NAMES = [
    '카카오 회원', '카카오회원', '카카오 사용자',
    '네이버 회원', '네이버회원', '네이버 사용자',
    '구글 사용자', '회원', '사용자', '차단회원', '수동등록 차단'
  ];

  function isBlacklisted(param1, param2) {
    const list = getBlacklist();
    if (!list || list.length === 0) return false;

    // 파라미터 유연화: 객체 또는 (email, id) 지원
    let target = {};
    if (param1 && typeof param1 === 'object') {
      target = param1;
    } else {
      target = { email: param1, id: param2 };
    }

    const targetEmail = cleanStr(target.email);
    const targetName = cleanStr(target.name || target.nickname);
    
    // 검사할 타겟 ID 후보군 모음 (대소문자, 접두어 제거, 원본)
    const rawTargetIds = [
      target.id,
      target.rawId,
      target.googleId,
      target.kakaoId,
      target.naverId
    ].filter(Boolean).map(cleanStr);

    const targetIdPool = new Set();
    rawTargetIds.forEach(id => {
      targetIdPool.add(id);
      const stripped = stripProviderPrefix(id);
      if (stripped) targetIdPool.add(stripped);
    });

    return list.some(item => {
      // 1. 이메일 일치 검증
      const itemEmail = cleanStr(item.email);
      if (targetEmail && itemEmail && targetEmail === itemEmail) return true;

      // 2. ID 일치 검증 (고유 ID, rawId, 접두어 제거 ID, 끝자리 매칭)
      const itemRawIds = [
        item.id,
        item.rawId,
        item.googleId,
        item.kakaoId,
        item.naverId,
        item.identifier
      ].filter(Boolean).map(cleanStr);

      const itemIdPool = new Set();
      itemRawIds.forEach(id => {
        itemIdPool.add(id);
        const stripped = stripProviderPrefix(id);
        if (stripped) itemIdPool.add(stripped);
      });

      // ID 풀 간의 교차 일치 검사
      for (const tId of targetIdPool) {
        if (!tId) continue;
        for (const iId of itemIdPool) {
          if (!iId) continue;
          if (tId === iId) return true;
          // 끝자리 6자리 매칭 (카카오/구글 shortId 끝자리 vs 전체 ID)
          if (tId.length >= 6 && iId.length >= 6) {
            if (tId.endsWith(iId) || iId.endsWith(tId)) return true;
          }
        }
      }

      // 3. 이름/닉네임 일치 검증 (일반적인 기본 닉네임 제외)
      const itemName = cleanStr(item.name);
      if (itemName && !GENERIC_NAMES.includes(itemName)) {
        if (targetName && targetName === itemName) return true;
        // 관리자가 수동으로 아이디/이메일 칸에 닉네임을 적어둔 경우
        if (itemEmail && targetName === itemEmail) return true;
        if (itemRawIds.includes(targetName)) return true;
      }

      // 4. 관리자가 수동 등록창에 입력한 문자열이 타겟 이메일/ID/닉네임과 일치하는 경우
      if (itemEmail && (targetIdPool.has(itemEmail) || (targetName && targetName === itemEmail))) return true;
      for (const iId of itemIdPool) {
        if (targetEmail && iId === targetEmail) return true;
      }

      return false;
    });
  }

  function addBlacklist({ email, id, rawId, googleId, kakaoId, naverId, name, reason }) {
    const list = getBlacklist();
    if (isBlacklisted({ email, id, rawId, googleId, kakaoId, naverId, name })) return false;
    list.unshift({
      email: (email || '').trim(),
      id: (id || '').trim(),
      rawId: (rawId || '').trim(),
      googleId: (googleId || '').trim(),
      kakaoId: (kakaoId || '').trim(),
      naverId: (naverId || '').trim(),
      name: (name || '차단회원').trim(),
      reason: (reason || '관리자 지정 차단').trim(),
      createdAt: new Date().toISOString()
    });
    saveBlacklist(list);
    return true;
  }

  function removeBlacklist(identifier) {
    let list = getBlacklist();
    const target = cleanStr(identifier);
    const targetClean = stripProviderPrefix(target);

    list = list.filter(item => {
      const e = cleanStr(item.email);
      const i = cleanStr(item.id);
      const r = cleanStr(item.rawId);
      const n = cleanStr(item.name);
      const iClean = stripProviderPrefix(i);

      if (e === target || i === target || r === target || n === target) return false;
      if (targetClean && iClean && targetClean === iClean) return false;
      return true;
    });
    saveBlacklist(list);
  }

  // ── 회원 삭제 (탈퇴 처리 - 추후 재가입 가능) ───────────
  function deleteUser(userId) {
    let users = getUsers();
    const target = users.find(u => u.id === userId);
    if (!target) return false;

    users = users.filter(u => u.id !== userId);
    saveUsers(users);

    // 만약 현재 로그인된 본인이 삭제된 경우 세션 로그아웃
    const cur = getCurrentUser();
    if (cur && cur.id === userId) {
      sessionStorage.removeItem(SESSION_KEY);
    }
    return true;
  }

  // ── 초기화: 페이지 로드 시 차단된 세션 즉시 만료 ──
  function init() {
    try {
      const cur = getCurrentUser();
      if (cur && isBlacklisted(cur)) {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem('pm_naver_user_id');
        localStorage.removeItem('pm_naver_user_name');
      }
    } catch (e) {}
  }

  // ── 회원 목록 조회 ──────────────────────────────────
  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  // ── 회원 목록 저장 ──────────────────────────────────
  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(`pm_ts_${USERS_KEY}`, Date.now().toString());
    if (window.FirebaseDB && typeof window.FirebaseDB.save === 'function') {
      window.FirebaseDB.save(USERS_KEY, users);
    }
  }

  // ── 회원가입 (내부 함수 유지, 구글 사용시 호출하지 않음) ──
  function register({ id, password, name, phone, email }) {
    return { success: false, message: '구글 계정으로만 가입할 수 있습니다.' };
  }

  // ── 일반 아이디/비밀번호 로그인 (고의로 비활성화 — 구글 전용) ──
  function login(id, password) {
    return { success: false, message: '구글 계정으로만 로그인할 수 있습니다.\n[Google로 로그인] 버튼을 이용해 주세요.' };
  }

  // ── 소셜 로그인 클라이언트 설정 ──────────────────────────
  const GOOGLE_CLIENT_ID = '757534137046-7ldla468a72bno30t1g01f1qbq2etnjm.apps.googleusercontent.com';
  // 카카오 디벨로퍼스(https://developers.kakao.com) JavaScript 키
  const KAKAO_JS_KEY = 'ae5205ab758e7a7f63b131d1e1d0244b';
  // 네이버 디벨로퍼스(https://developers.naver.com) Client ID
  const NAVER_CLIENT_ID = 'ClcJBJHoTgHglSoqrDT0';

  // ── 대시보드 진입 허용 구글 이메일 목록 ────────────────
  // 이 3개 이메일은 홈페이지 관리자 계정으로, 대시보드 + 상담게시판 전체 열람 권한 보유
  const DASHBOARD_ADMIN_EMAILS = [
    'ckh1679@gmail.com',
    'printer.moa@gmail.com',
    'rental.oa.kor@gmail.com'
  ];

  // ── JWT 토큰 디코딩 헬퍼 ─────────────────────────────
  function parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('JWT 디코딩 실패:', e);
      return null;
    }
  }

  // ── 구글 소셜 로그인/간편가입 ────────────────────────
  function loginWithGoogle(credential) {
    const payload = parseJwt(credential);
    if (!payload || !payload.sub) {
      return { success: false, message: '유효하지 않은 구글 인증 정보입니다.' };
    }

    const { sub: googleId, email, name, picture } = payload;

    // 블랙리스트 차단 여부 확인 (이메일, 원본 sub ID, shortId, 이름 종합 검증)
    const shortId = 'google_' + String(googleId).slice(-6);
    if (isBlacklisted({ email, id: shortId, rawId: String(googleId), googleId: String(googleId), name })) {
      return { success: false, message: '이용이 제한(차단)된 계정입니다.\n관리자에게 문의해 주세요.' };
    }

    const users = getUsers();

    // 1. 기존 구글 연동 계정 또는 이메일 일치 계정 찾기
    let user = users.find(u => u.googleId === googleId || (email && u.email === email));

    if (!user) {
      // 2. 신규 사용자면 자동 간편 회원가입 처리
      user = {
        id: shortId,
        googleId: googleId,
        password: '', // 소셜 로그인은 비밀번호 없음
        name: name || '구글 사용자',
        email: email || '',
        phone: '',
        picture: picture || '',
        provider: 'google',
        role: 'user',
        createdAt: new Date().toISOString()
      };
      users.push(user);
      saveUsers(users);
    } else {
      // 기존 계정에 구글 정보 업데이트 (프로필 사진, 구글 ID 등)
      if (!user.googleId) user.googleId = googleId;
      if (!user.picture && picture) user.picture = picture;
      if (!user.provider) user.provider = 'google';
      saveUsers(users);
    }

    // 3. 세션 저장 (로그인 활성화)
    const sessionData = {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      picture: user.picture || picture || '',
      provider: 'google'
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

    return { success: true, user: sessionData };
  }

  // ── 카카오 소셜 로그인/간편가입 ───────────────────────
  function loginWithKakao({ id: kakaoId, nickname, email, picture }) {
    if (!kakaoId) {
      return { success: false, message: '유효하지 않은 카카오 인증 정보입니다.' };
    }

    const strKakaoId = String(kakaoId);
    const shortId = 'kakao_' + strKakaoId.slice(-6);
    // 블랙리스트 차단 여부 확인 (이메일, 카카오 숫자 고유ID, shortId, 닉네임 종합 검증)
    if (isBlacklisted({ email, id: shortId, rawId: strKakaoId, kakaoId: strKakaoId, name: nickname })) {
      return { success: false, message: '이용이 제한(차단)된 계정입니다.\n관리자에게 문의해 주세요.' };
    }

    const users = getUsers();
    let user = users.find(u => u.kakaoId === strKakaoId || (email && u.email === email));

    if (!user) {
      user = {
        id: shortId,
        kakaoId: strKakaoId,
        password: '',
        name: nickname || '카카오 사용자',
        email: email || '',
        phone: '',
        picture: picture || '',
        provider: 'kakao',
        role: 'user',
        createdAt: new Date().toISOString()
      };
      users.push(user);
    } else {
      // 기존 계정 정보 최신화
      if (!user.kakaoId) user.kakaoId = strKakaoId;
      if (nickname && (user.name === '카카오 회원' || user.name === '카카오 사용자' || !user.name)) {
        user.name = nickname;
      } else if (nickname) {
        user.name = nickname;
      }
      if (email && !user.email) user.email = email;
      if (picture) user.picture = picture;
      user.provider = 'kakao';
    }
    saveUsers(users);

    const sessionData = {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      picture: user.picture || picture || '',
      provider: 'kakao'
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

    return { success: true, user: sessionData };
  }

  // ── 네이버 소셜 로그인/간편가입 ───────────────────────
  function loginWithNaver({ id: naverId, name, nickname, email, picture }) {
    if (!naverId) {
      return { success: false, message: '유효하지 않은 네이버 인증 정보입니다.' };
    }

    const strNaverId = String(naverId);
    const shortId = strNaverId.startsWith('naver_') ? strNaverId : ('naver_' + strNaverId.slice(-6));
    const displayName = name || nickname || '네이버 사용자';

    // 블랙리스트 차단 여부 확인 (이메일, 네이버 고유 ID, shortId, 닉네임 종합 검증)
    if (isBlacklisted({ email, id: shortId, rawId: strNaverId, naverId: strNaverId, name: displayName })) {
      try {
        localStorage.removeItem('pm_naver_user_id');
        localStorage.removeItem('pm_naver_user_name');
      } catch (e) {}
      return { success: false, message: '이용이 제한(차단)된 계정입니다.\n관리자에게 문의해 주세요.' };
    }

    const users = getUsers();
    let user = users.find(u => u.naverId === strNaverId || (email && u.email === email));
    const displayName = name || nickname || '네이버 사용자';

    if (!user) {
      const shortId = 'naver_' + strNaverId.slice(-6);
      user = {
        id: shortId,
        naverId: strNaverId,
        password: '',
        name: displayName,
        email: email || '',
        phone: '',
        picture: picture || '',
        provider: 'naver',
        role: 'user',
        createdAt: new Date().toISOString()
      };
      users.push(user);
    } else {
      // 기존 계정 정보 최신화
      if (!user.naverId) user.naverId = strNaverId;
      if (displayName && (user.name === '네이버 회원' || user.name === '네이버 사용자' || !user.name)) {
        user.name = displayName;
      } else if (name || nickname) {
        user.name = displayName;
      }
      if (email && !user.email) user.email = email;
      if (picture) user.picture = picture;
      user.provider = 'naver';
    }
    saveUsers(users);

    const sessionData = {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      picture: user.picture || picture || '',
      provider: 'naver'
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

    return { success: true, user: sessionData };
  }

  // ── 로그아웃 ────────────────────────────────────────
  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    try {
      if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
      }
    } catch (e) {}
    try {
      if (window.Kakao && Kakao.Auth && Kakao.Auth.getAccessToken()) {
        Kakao.Auth.logout();
      }
    } catch (e) {}

    // GitHub Pages(/homepage/) 및 로컬 환경 모두에서 안전한 메인페이지 경로 계산
    const origin = window.location.origin;
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0 && pathParts[0] === 'homepage') {
      window.location.href = origin + '/homepage/index.html';
    } else {
      const depth = pathParts.filter(p => !p.endsWith('.html') && p !== '').length;
      const prefix = depth > 0 ? '../'.repeat(depth) : './';
      window.location.href = prefix + 'index.html';
    }
  }

  // ── 현재 로그인 유저 조회 ────────────────────────────
  function getCurrentUser() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    } catch {
      return null;
    }
  }

  // ── 로그인 여부 확인 ─────────────────────────────────
  function isLoggedIn() {
    return getCurrentUser() !== null;
  }

  // ── 관리자 여부 확인 ─────────────────────────────────
  // 3개 관리자 구글 이메일(isDashboardAdmin) 또는 role === 'admin'
  function isAdmin() {
    const user = getCurrentUser();
    if (!user) return false;
    return isDashboardAdmin() || user.role === 'admin';
  }

  // ── 아이디 중복 확인 ─────────────────────────────────
  function checkIdDuplicate(id) {
    const users = getUsers();
    return users.some(u => u.id === id);
  }

  // ── 헤더 로그인 상태 UI 업데이트 ────────────────────
  // 각 페이지의 헤더 영역을 현재 로그인 상태에 맞게 변경
  function updateHeaderUI() {
    const user = getCurrentUser();

    // 블랙리스트 차단 검사: 현재 세션의 유저가 차단 대상인 경우 즉시 세션 파기 및 로그아웃
    if (user && isBlacklisted(user)) {
      sessionStorage.removeItem(SESSION_KEY);
      try {
        localStorage.removeItem('pm_naver_user_id');
        localStorage.removeItem('pm_naver_user_name');
      } catch (e) {}
      alert('현재 이용 중인 계정은 관리자에 의해 차단(이용제한)되었습니다.\n세션이 강제 종료됩니다.');
      window.location.reload();
      return;
    }

    const googleShortcut = document.getElementById('headerGoogleShortcut');
    const loginLink = document.getElementById('headerLoginLink');
    const registerLink = document.getElementById('headerRegisterLink');
    const logoutBtn = document.getElementById('headerLogoutBtn');
    const userNameEl = document.getElementById('headerUserName');

    // 일반 회원가입 및 일반 로그인 링크는 항상 숨김 처리
    if (loginLink) loginLink.style.display = 'none';
    if (registerLink) registerLink.style.display = 'none';

    if (user) {
      // 로그인 상태: 구글 로그인 버튼 숨기고 사용자 이름/로그아웃 표시
      if (googleShortcut) googleShortcut.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      if (userNameEl) {
        userNameEl.style.display = 'inline-flex';
        userNameEl.style.alignItems = 'center';
        userNameEl.style.gap = '6px';
        let providerBadge = '';
        if (user.provider === 'kakao') {
          providerBadge = '<span style="font-size:10px; background:#FEE500; color:#000; padding:1px 5px; border-radius:4px; font-weight:700;">카카오</span>';
        } else if (user.provider === 'naver') {
          providerBadge = '<span style="font-size:10px; background:#03C75A; color:#fff; padding:1px 5px; border-radius:4px; font-weight:700;">네이버</span>';
        } else if (user.provider === 'google') {
          providerBadge = '<span style="font-size:10px; background:#e8f0fe; color:#1a73e8; padding:1px 5px; border-radius:4px; font-weight:700;">구글</span>';
        }

        userNameEl.style.cursor = 'pointer';
        userNameEl.title = '클릭하여 닉네임을 변경할 수 있습니다.';

        if (user.picture) {
          userNameEl.innerHTML = `<img src="${user.picture}" alt="" style="width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:middle;"> <span>${user.name}님 <i class="fa fa-pen" style="font-size:10px; opacity:0.6; margin-left:2px;"></i></span> ${providerBadge}`;
        } else {
          userNameEl.innerHTML = `<span>${user.name}님 <i class="fa fa-pen" style="font-size:10px; opacity:0.6; margin-left:2px;"></i></span> ${providerBadge}`;
        }

        userNameEl.onclick = () => {
          const newName = prompt('변경할 닉네임(이름)을 입력해 주세요:', user.name);
          if (newName && newName.trim() && newName.trim() !== user.name) {
            user.name = newName.trim();
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
            const users = getUsers();
            const idx = users.findIndex(u => u.id === user.id);
            if (idx !== -1) {
              users[idx].name = newName.trim();
              saveUsers(users);
            }
            if (user.provider === 'naver') {
              localStorage.setItem('pm_naver_user_name', user.name);
            }
            updateHeaderUI();
            alert('닉네임이 "' + user.name + '"으로 변경되었습니다.');
          }
        };
      }
    } else {
      // 비로그인 상태: Google 로그인 단축 버튼만 표시
      if (googleShortcut) googleShortcut.style.display = 'inline-flex';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (userNameEl) {
        userNameEl.style.display = 'none';
        userNameEl.innerHTML = '';
        userNameEl.onclick = null;
      }
    }

    // 로그아웃 버튼 이벤트
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('로그아웃 하시겠습니까?')) logout();
      });
    }
  }

  // ── 로그인 필요 페이지 접근 제어 ────────────────────
  function requireLogin(redirectUrl) {
    if (!isLoggedIn()) {
      alert('로그인이 필요한 서비스입니다.');
      // redirectUrl이 명시되면 사용, 아니면 경로 depth반영
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        const depth = window.location.pathname.split('/').filter(Boolean).length - 1;
        const prefix = depth > 0 ? '../'.repeat(depth) : '';
        window.location.href = prefix + 'login.html';
      }
      return false;
    }
    return true;
  }

  // ── 소셜 로그인 사용자 여부 확인 (구글, 카카오, 네이버) ─────────────────
  // 상담게시판 글쓰기/수정/삭제 권한 확인 (소셜 로그인 사용자 허용)
  function isGoogleUser() {
    const user = getCurrentUser();
    return user !== null && ['google', 'kakao', 'naver'].includes(user.provider);
  }
  function isSocialUser() {
    return isGoogleUser();
  }

  // ── 대시보드 관리자 여부 확인 ────────────────────────
  // 허용된 구글 이메일로 로그인한 경우에만 true 반환
  function isDashboardAdmin() {
    const user = getCurrentUser();
    if (!user || user.provider !== 'google') return false;
    return DASHBOARD_ADMIN_EMAILS.includes(user.email);
  }

  // ── 상담게시판 게시글 열람 권한 확인 ─────────────────────
  // 열람 가능한 경우: 관리자 3명 OR 해당 글의 작성자 본인
  function canViewConsultPost(post) {
    const user = getCurrentUser();
    if (!user) return false;

    // 관리자 3명은 모든 게시글 열람 가능
    if (isDashboardAdmin()) return true;

    // 작성자 본인 확인 (구글 userId 또는 email로 비교)
    if (post.userId && user.id && post.userId === user.id) return true;
    if (post.authorEmail && user.email && post.authorEmail === user.email) return true;

    return false;
  }

  // 초기화 실행
  init();

  // 외부에 노출할 함수 목록
  return {
    GOOGLE_CLIENT_ID,
    KAKAO_JS_KEY,
    NAVER_CLIENT_ID,
    DASHBOARD_ADMIN_EMAILS,
    parseJwt,
    getUsers,
    saveUsers,
    deleteUser,
    getBlacklist,
    saveBlacklist,
    isBlacklisted,
    addBlacklist,
    removeBlacklist,
    register,
    login,
    loginWithGoogle,
    loginWithKakao,
    loginWithNaver,
    logout,
    getCurrentUser,
    isLoggedIn,
    isAdmin,
    isGoogleUser,
    isSocialUser,
    isDashboardAdmin,
    canViewConsultPost,
    checkIdDuplicate,
    updateHeaderUI,
    requireLogin
  };
})();
