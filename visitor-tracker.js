/**
 * visitor-tracker.js - 프린터모아 방문자 실시간 추적 모듈
 *
 * 역할:
 * - 사이트 방문 시 Firestore의 system_data 컬렉션에 방문 기록 저장
 * - 저장 항목: 날짜, 페이지URL, 기기유형(PC/모바일/태블릿), 유입경로(직접/검색/소셜/레퍼럴)
 * - 대시보드 방문자 통계 기능에서 이 데이터를 읽어 차트/통계로 표시
 * - 봇/크롤러는 최대한 필터링하여 실제 사용자만 카운트
 * - 로컬스토리지 세션 키로 동일 브라우저 세션 내 중복 카운트 방지 (30분 기준)
 */

const VisitorTracker = (() => {
  // ── 상수 설정 ────────────────────────────────────────
  const COLLECTION = 'system_data';
  const DOC_VISITS = 'pm_visitor_logs';       // 최근 방문 기록 배열 저장
  const DOC_STATS  = 'pm_visitor_stats';      // 날짜별 집계 통계 저장
  const SESSION_KEY = 'pm_visit_session';
  const SESSION_TTL = 30 * 60 * 1000;        // 30분 세션 유지
  const MAX_LOGS   = 500;                     // 최대 보관 방문 로그 수 (Firestore 문서 크기 제한 고려)

  // ── 봇/크롤러 판별 ──────────────────────────────────
  function isBot() {
    const ua = navigator.userAgent.toLowerCase();
    const botPatterns = [
      'bot', 'crawler', 'spider', 'slurp', 'baiduspider',
      'googlebot', 'bingbot', 'yandex', 'duckduckbot',
      'facebookexternalhit', 'twitterbot', 'rogerbot',
      'linkedinbot', 'whatsapp', 'applebot', 'semrushbot',
      'ahrefsbot', 'mj12bot', 'dotbot', 'prerender'
    ];
    return botPatterns.some(p => ua.includes(p));
  }

  // ── 기기 유형 판별 ──────────────────────────────────
  function getDeviceType() {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk|(android(?!.*mobile))/i.test(ua)) return 'tablet';
    if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  // ── 유입 경로 분류 ──────────────────────────────────
  function getReferrerType() {
    const ref = document.referrer;
    if (!ref) return 'direct'; // 직접 입력 또는 즐겨찾기

    const refHost = new URL(ref).hostname.toLowerCase();
    const currentHost = location.hostname.toLowerCase();

    // 자사 내부 이동은 추적 제외 (새로운 페이지 방문만)
    if (refHost === currentHost) return 'internal';

    const searchEngines = ['google', 'naver', 'daum', 'bing', 'yahoo', 'baidu', 'duckduckgo', 'zum'];
    const socialMedia = ['facebook', 'instagram', 'twitter', 'kakaotalk', 'kakao', 'band', 'naver.com/section', 'youtube', 'tiktok', 'linkedin'];

    if (searchEngines.some(s => refHost.includes(s))) return 'search';
    if (socialMedia.some(s => refHost.includes(s))) return 'social';
    return 'referral'; // 그 외 외부 사이트에서 유입
  }

  // ── 현재 페이지명 추출 ──────────────────────────────
  function getPageName() {
    const path = location.pathname;
    const filename = path.split('/').pop() || 'index.html';

    // 주요 페이지를 사람이 읽기 쉬운 이름으로 변환
    const pageMap = {
      '': '홈',
      'index.html': '홈',
      'login.html': '로그인',
      'register.html': '회원가입',
      'product.html': '제품 상세',
    };
    return pageMap[filename] || filename;
  }

  // ── 세션 중복 방문 체크 ──────────────────────────────
  // 같은 브라우저 세션(30분)에서 이미 카운트된 방문은 재기록하지 않음
  function isSessionDuplicate() {
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (!session) return false;
      if (Date.now() - session.ts > SESSION_TTL) return false; // 세션 만료
      return true;
    } catch {
      return false;
    }
  }

  // ── 세션 기록 갱신 ──────────────────────────────────
  function markSession() {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now() }));
    } catch {
      // 시크릿 모드 등 localStorage 불가 환경에서 오류 무시
    }
  }

  // ── 오늘 날짜 문자열 반환 (YYYY-MM-DD) ──────────────
  function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ── Firestore에 방문 기록 저장 ─────────────────────
  async function recordVisit(db) {
    if (!db) return;

    const today = getTodayKey();
    const device = getDeviceType();
    const refType = getReferrerType();
    const page = getPageName();

    // ① 날짜별 집계 통계 업데이트 (pm_visitor_stats)
    // 구조: { "2026-10-13": { total: N, mobile: N, desktop: N, tablet: N, search: N, direct: N, social: N, referral: N } }
    try {
      const statsRef = db.collection(COLLECTION).doc(DOC_STATS);
      const statsSnap = await statsRef.get();
      const statsData = statsSnap.exists ? (statsSnap.data() || {}) : {};

      // 오늘 날짜의 통계 객체 초기화 또는 가져오기
      const todayStats = statsData[today] || {
        total: 0, desktop: 0, mobile: 0, tablet: 0,
        direct: 0, search: 0, social: 0, referral: 0, internal: 0,
        pages: {}
      };

      // 카운터 증가
      todayStats.total++;
      todayStats[device] = (todayStats[device] || 0) + 1;
      todayStats[refType] = (todayStats[refType] || 0) + 1;

      // 페이지별 방문 횟수 (인기 페이지 Top5 계산용)
      todayStats.pages = todayStats.pages || {};
      todayStats.pages[page] = (todayStats.pages[page] || 0) + 1;

      // Firestore에 병합 저장 (다른 날짜 데이터 덮어쓰지 않음)
      await statsRef.set({ [today]: todayStats }, { merge: true });

      console.log(`[VisitorTracker] 방문 기록 완료: ${today} / ${device} / ${refType} / ${page}`);
    } catch (err) {
      // 방문자 추적 오류는 사용자 경험에 영향 없도록 조용히 처리
      console.warn('[VisitorTracker] 집계 통계 저장 실패:', err.message);
    }

    // ② 최근 방문 로그 추가 (pm_visitor_logs) - 선택적 상세 로그
    try {
      const logsRef = db.collection(COLLECTION).doc(DOC_VISITS);
      const logsSnap = await logsRef.get();
      const logsData = logsSnap.exists ? (logsSnap.data() || {}) : {};
      const logs = Array.isArray(logsData.logs) ? logsData.logs : [];

      // 새 방문 로그 항목 추가
      const newLog = {
        ts: new Date().toISOString(),
        date: today,
        page,
        device,
        ref: refType,
        ua: navigator.userAgent.substring(0, 80) // UA 일부만 저장 (용량 절약)
      };

      logs.push(newLog);

      // 최대 보관 수 초과 시 오래된 것부터 삭제
      const trimmedLogs = logs.slice(-MAX_LOGS);

      await logsRef.set({ logs: trimmedLogs });
    } catch (err) {
      console.warn('[VisitorTracker] 방문 로그 저장 실패:', err.message);
    }
  }

  // ── 메인 진입점: 방문 추적 시작 ───────────────────────
  function track() {
    // 봇이면 추적하지 않음
    if (isBot()) {
      console.log('[VisitorTracker] 봇 감지 - 추적 건너뜀');
      return;
    }

    // 같은 세션 내 재방문이면 추적하지 않음 (30분 내 중복 카운트 방지)
    if (isSessionDuplicate()) {
      console.log('[VisitorTracker] 세션 중복 - 추적 건너뜀');
      return;
    }

    // 내부 페이지 이동(internal)도 집계 제외
    if (getReferrerType() === 'internal') {
      console.log('[VisitorTracker] 내부 페이지 이동 - 추적 건너뜀');
      return;
    }

    // Firebase가 준비될 때까지 최대 5초 대기 후 기록
    let retries = 0;
    const maxRetries = 10;

    const tryRecord = () => {
      const db = window._pmFirestoreDb;
      if (db) {
        markSession(); // 세션 기록 후 방문 저장
        recordVisit(db);
      } else if (retries < maxRetries) {
        retries++;
        setTimeout(tryRecord, 500); // 0.5초마다 재시도
      } else {
        console.warn('[VisitorTracker] Firebase 준비 타임아웃 - 추적 실패');
      }
    };

    // DOM 로드 완료 후 바로 시작
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryRecord);
    } else {
      tryRecord();
    }
  }

  // ── 공개 API ────────────────────────────────────────
  return { track };
})();

// 자동 실행
VisitorTracker.track();
