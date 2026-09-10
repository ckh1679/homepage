/**
 * auth.js - 프린터모아 회원 인증 모듈
 *
 * localStorage에 회원 데이터를 저장하고 관리합니다.
 * 모든 페이지에서 공통으로 사용합니다.
 *
 * 저장 구조:
 *   localStorage['pm_users']   = JSON 배열 (회원 목록)
 *   sessionStorage['pm_session'] = JSON 객체 (현재 로그인 유저)
 */

const Auth = (() => {
  const USERS_KEY = 'pm_users';
  const SESSION_KEY = 'pm_session';

  // ── 초기화: 기본 관리자 계정 생성 ──────────────────
  function init() {
    const users = getUsers();
    // admin 계정이 없으면 생성
    if (!users.find(u => u.id === 'admin')) {
      users.push({
        id: 'admin',
        password: 'admin1234',
        name: '관리자',
        phone: '010-5922-3650',
        email: 'admin@printermoa.kr',
        role: 'admin',        // 관리자 권한
        createdAt: new Date().toISOString()
      });
      saveUsers(users);
    }
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
  }

  // ── 회원가입 ────────────────────────────────────────
  // 반환값: { success: bool, message: string }
  function register({ id, password, name, phone, email }) {
    const users = getUsers();

    // 아이디 중복 확인
    if (users.find(u => u.id === id)) {
      return { success: false, message: '이미 사용 중인 아이디입니다.' };
    }

    // 유효성 검사
    if (!id || id.length < 4) {
      return { success: false, message: '아이디는 4자 이상이어야 합니다.' };
    }
    if (!password || password.length < 6) {
      return { success: false, message: '비밀번호는 6자 이상이어야 합니다.' };
    }
    if (!name || name.trim() === '') {
      return { success: false, message: '이름을 입력해주세요.' };
    }

    const newUser = {
      id,
      password,       // ⚠️ 실제 서비스에서는 반드시 해싱 필요
      name: name.trim(),
      phone: phone || '',
      email: email || '',
      role: 'user',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);
    return { success: true, message: '회원가입이 완료되었습니다.' };
  }

  // ── 로그인 ──────────────────────────────────────────
  function login(id, password) {
    const users = getUsers();
    const user = users.find(u => u.id === id && u.password === password);

    if (!user) {
      return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
    }

    // 세션에 저장 (비밀번호 제외)
    const sessionData = {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    return { success: true, user: sessionData };
  }

  // ── 구글 클라이언트 ID ──────────────────────────────
  const GOOGLE_CLIENT_ID = '757534137046-7ldla468a72bno30t1g01f1qbq2etnjm.apps.googleusercontent.com';

  // ── 대시보드 진입 허용 구글 이메일 목록 ────────────────
  // ⚠️ 여기에 대시보드에 접근할 수 있는 구글 이메일 주소를 입력하세요.
  const DASHBOARD_ADMIN_EMAILS = [
    '여기에이메일입력@gmail.com'  // 예: 'printermoa@gmail.com'
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
    const users = getUsers();

    // 1. 기존 구글 연동 계정 또는 이메일 일치 계정 찾기
    let user = users.find(u => u.googleId === googleId || (email && u.email === email));

    if (!user) {
      // 2. 신규 사용자면 자동 간편 회원가입 처리
      const shortId = 'google_' + googleId.slice(-6);
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

  // ── 로그아웃 ────────────────────────────────────────
  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    // 현재 경로 depth 계산 (루트=0, board/shop=1)
    const depth = window.location.pathname.split('/').filter(Boolean).length - 1;
    const prefix = depth > 0 ? '../'.repeat(depth) : '';
    window.location.href = prefix + 'index.html';
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
  function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
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
    const loginLink = document.getElementById('headerLoginLink');
    const registerLink = document.getElementById('headerRegisterLink');
    const logoutBtn = document.getElementById('headerLogoutBtn');
    const userNameEl = document.getElementById('headerUserName');

    if (user) {
      // 로그인 상태
      if (loginLink) loginLink.style.display = 'none';
      if (registerLink) registerLink.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      if (userNameEl) {
        userNameEl.style.display = 'inline-flex';
        userNameEl.style.alignItems = 'center';
        userNameEl.style.gap = '6px';
        if (user.picture) {
          userNameEl.innerHTML = `<img src="${user.picture}" alt="" style="width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:middle;"> <span>${user.name}님</span>`;
        } else {
          userNameEl.textContent = `${user.name}님`;
        }
      }
    } else {
      // 비로그인 상태
      if (loginLink) loginLink.style.display = 'inline-block';
      if (registerLink) registerLink.style.display = 'inline-block';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (userNameEl) {
        userNameEl.style.display = 'none';
        userNameEl.innerHTML = '';
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

  // ── 구글 소셜 로그인 사용자 여부 확인 ─────────────────
  // 상담게시판 글쓰기/수정/삭제는 구글 로그인 사용자만 가능하도록 체크
  function isGoogleUser() {
    const user = getCurrentUser();
    return user !== null && user.provider === 'google';
  }

  // ── 대시보드 관리자 여부 확인 ────────────────────────
  // 허용된 구글 이메일로 로그인한 경우에만 true 반환
  function isDashboardAdmin() {
    const user = getCurrentUser();
    if (!user || user.provider !== 'google') return false;
    return DASHBOARD_ADMIN_EMAILS.includes(user.email);
  }

  // 초기화 실행
  init();

  // 외부에 노출할 함수 목록
  return {
    GOOGLE_CLIENT_ID,
    DASHBOARD_ADMIN_EMAILS,
    parseJwt,
    register,
    login,
    loginWithGoogle,
    logout,
    getCurrentUser,
    isLoggedIn,
    isAdmin,
    isGoogleUser,
    isDashboardAdmin,
    checkIdDuplicate,
    updateHeaderUI,
    requireLogin
  };
})();
