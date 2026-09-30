/**
 * firebase-db.js - 프린터모아 클라우드 데이터베이스(Firebase Firestore) 실시간 동기화 모듈
 * 
 * 기능:
 * 1. 거래처/업체정보(pm_clients), 가입회원(pm_users), 상담게시판(pm_board_posts) 등
 *    모든 브라우저 로컬스토리지 데이터를 Cloud Firestore와 실시간 양방향 동기화
 * 2. PC, 태블릿, 모바일 등 모든 기기에서 동일한 최신 데이터 조회 및 수정 지원
 * 3. 오프라인/로컬 캐시 지원: 인터넷 연결 상태에 상관없이 0초 지연 로딩
 * 4. 자동 마이그레이션: 현재 PC의 최신 로컬 데이터를 클라우드 최초 생성 시 자동 업로드
 */

const FirebaseDB = (() => {
  // ── Firebase 프로젝트 설정 ──────────────────────────
  const firebaseConfig = {
    apiKey: "AIzaSyC679FQVdZkLOEAW_kcZU2CaYTWHeHk3kE",
    authDomain: "printermoa-homepage.firebaseapp.com",
    projectId: "printermoa-homepage",
    storageBucket: "printermoa-homepage.firebasestorage.app",
    messagingSenderId: "274344488742",
    appId: "1:274344488742:web:94aa471eba826efb1b9be7",
    measurementId: "G-TFYJ2MF9FY"
  };

  // ── 동기화 대상 주요 스토리지 키 목록 ────────────────
  const SYNC_KEYS = [
    'pm_clients',            // 거래처/업체 목록 (가장 핵심)
    'pm_meter_history',      // 검침 및 정산 이력
    'pm_users',              // 가입 회원 목록
    'pm_blacklist',          // 블랙리스트 차단 목록 (신규)
    'pm_board_posts',        // 상담 및 전화신청 게시글
    'pm_admin_read_requests',// 전화상담 확인 목록
    'pm_admin_read_consults',// 온라인상담 확인 목록
    'pm_admin_read_reviews', // 사용후기 확인 목록
    'pm_client_costs',       // 기기별 렌탈 원가 설정
    'pm_maintenance_logs',   // 소모품/부품 지출 장부
    'pm_supplies_records',   // 소모품 입출고 내역
    'pm_activity_logs'       // 최근 활동 로그 내역
  ];

  let db = null;
  let isInitialized = false;
  let isSyncing = false;
  const changeListeners = [];

  // ── Firebase 초기화 ──────────────────────────────────
  function init() {
    if (isInitialized) return;

    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK가 로드되지 않았습니다. 로컬 모드로 작동합니다.');
      updateStatusUI('offline', '로컬 모드 (SDK 미로드)');
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.firestore();
      isInitialized = true;
      console.log('Firebase Firestore 연결 성공:', firebaseConfig.projectId);
      updateStatusUI('syncing', '클라우드 동기화 중...');

      // 초기 동기화 및 실시간 리스너 등록
      startSync();
    } catch (err) {
      console.error('Firebase 초기화 오류:', err);
      updateStatusUI('error', '동기화 오류');
    }
  }

  // ── 초기 동기화 및 실시간 변경 감지 리스너 ─────────────
  async function startSync() {
    if (!db) return;

    try {
      isSyncing = true;

      // 1. 각 키별 초기 데이터 확인 및 동기화 (최초 업로드/다운로드)
      for (const key of SYNC_KEYS) {
        await syncKey(key);
      }

      // 2. Firestore 컬렉션 실시간 변경 감시 (onSnapshot)
      db.collection('system_data').onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const docId = change.doc.id;
          if (SYNC_KEYS.includes(docId)) {
            const cloudData = change.doc.data();
            const source = change.doc.metadata.hasPendingWrites ? 'local' : 'server';

            // 서버에서 변경된 최신 데이터일 때 로컬스토리지 반영
            if (source === 'server' && cloudData && cloudData.payload !== undefined) {
              const currentLocal = localStorage.getItem(docId);
              const newPayloadStr = JSON.stringify(cloudData.payload);

              if (currentLocal !== newPayloadStr) {
                localStorage.setItem(docId, newPayloadStr);
                localStorage.setItem(`pm_ts_${docId}`, cloudData.updatedAt || Date.now());
                console.log(`[클라우드 동기화 수신] ${docId} 업데이트 완료`);
                notifyListeners(docId, cloudData.payload);
              }
            }
          }
        });
        updateStatusUI('online', '클라우드 동기화 완료');
      }, (error) => {
        console.warn('Firestore 실시간 리스너 오류:', error);
        updateStatusUI('offline', '동기화 일시 중단');
      });

      isSyncing = false;
      updateStatusUI('online', '클라우드 동기화 완료');
    } catch (e) {
      console.error('초기 동기화 처리 실패:', e);
      isSyncing = false;
      updateStatusUI('error', '동기화 실패');
    }
  }

  // ── 특정 키에 대한 단일 동기화 (클라우드 vs 로컬 비교) ─
  async function syncKey(key) {
    if (!db) return;

    try {
      const docRef = db.collection('system_data').doc(key);
      const docSnap = await docRef.get();
      const localRaw = localStorage.getItem(key);
      const localData = localRaw ? JSON.parse(localRaw) : null;
      const localTs = Number(localStorage.getItem(`pm_ts_${key}`) || '0');

      if (!docSnap.exists) {
        // [경우 1] 클라우드에 아직 데이터가 없는 경우 (새 DB 생성 직후)
        // 현재 PC의 로컬 데이터가 있으면 클라우드로 즉시 업로드 (최초 마이그레이션)
        if (localData !== null) {
          const now = Date.now();
          await docRef.set({
            payload: localData,
            updatedAt: now,
            updatedBy: 'initial_pc_sync'
          });
          localStorage.setItem(`pm_ts_${key}`, String(now));
          console.log(`[최초 마이그레이션] ${key} 로컬 데이터를 클라우드로 업로드했습니다.`);
        }
      } else {
        // [경우 2] 클라우드에 데이터가 이미 존재하는 경우
        const cloudDoc = docSnap.data();
        const cloudTs = Number(cloudDoc.updatedAt || '0');

        if (localData === null) {
          // 로컬이 비어있는 새 기기(다른 PC/모바일)인 경우 -> 클라우드에서 바로 내려받음
          if (cloudDoc.payload !== undefined) {
            localStorage.setItem(key, JSON.stringify(cloudDoc.payload));
            localStorage.setItem(`pm_ts_${key}`, String(cloudTs));
            notifyListeners(key, cloudDoc.payload);
          }
        } else {
          // 양쪽에 모두 데이터가 있는 경우 타임스탬프 또는 항목 수 비교
          if (cloudTs > localTs) {
            // 클라우드가 더 최신이면 로컬 갱신
            localStorage.setItem(key, JSON.stringify(cloudDoc.payload));
            localStorage.setItem(`pm_ts_${key}`, String(cloudTs));
            notifyListeners(key, cloudDoc.payload);
          } else if (localTs > cloudTs) {
            // 로컬이 더 최신이면 클라우드에 푸시
            await docRef.set({
              payload: localData,
              updatedAt: localTs,
              updatedBy: 'local_update'
            });
          }
        }
      }
    } catch (e) {
      console.error(`키 [${key}] 동기화 오류:`, e);
    }
  }

  // ── 데이터 저장 메서드 (로컬 + 클라우드 동시 기록) ────
  function save(key, data) {
    // 1. 로컬스토리지 즉시 저장 (UI 지연 방지)
    try {
      localStorage.setItem(key, JSON.stringify(data));
      const now = Date.now();
      localStorage.setItem(`pm_ts_${key}`, String(now));
    } catch (e) {
      console.error('로컬스토리지 저장 실패:', e);
    }

    // 2. Firestore 클라우드 비동기 저장
    if (db) {
      updateStatusUI('syncing', '클라우드 저장 중...');
      const docRef = db.collection('system_data').doc(key);
      docRef.set({
        payload: data,
        updatedAt: Date.now(),
        updatedBy: 'active_client'
      }).then(() => {
        updateStatusUI('online', '클라우드 동기화 완료');
      }).catch((err) => {
        console.error(`클라우드 [${key}] 저장 오류:`, err);
        updateStatusUI('error', '클라우드 저장 오류');
      });
    }
  }

  // ── 수동 전체 동기화 (사용자가 버튼 클릭 시) ──────────
  async function manualSync() {
    if (!db) {
      init();
      if (!db) {
        alert('Firebase 데이터베이스에 연결할 수 없습니다. 인터넷 상태를 확인해 주세요.');
        return;
      }
    }

    updateStatusUI('syncing', '전체 데이터 동기화 중...');
    try {
      for (const key of SYNC_KEYS) {
        await syncKey(key);
      }
      updateStatusUI('online', '클라우드 동기화 완료');
      showToast('☁️ 클라우드 최신 데이터와 동기화되었습니다!');
      
      // 대시보드 화면 새로고침
      if (typeof window.updateGlobalDashboardStats === 'function') {
        window.updateGlobalDashboardStats(false);
      }
      if (window.ClientManager && typeof window.ClientManager.renderTable === 'function') {
        window.ClientManager.renderTable();
      }
    } catch (e) {
      console.error('수동 동기화 실패:', e);
      updateStatusUI('error', '동기화 실패');
      showToast('동기화 중 오류가 발생했습니다.');
    }
  }

  // ── 현재 PC의 로컬 데이터를 클라우드로 강제 업로드 ───
  async function forceUploadLocal() {
    if (!db) return;
    if (!confirm('현재 브라우저에 있는 업체정보 및 데이터를 클라우드로 즉시 업로드하시겠습니까?')) return;

    updateStatusUI('syncing', '클라우드로 업로드 중...');
    try {
      for (const key of SYNC_KEYS) {
        const localRaw = localStorage.getItem(key);
        if (localRaw) {
          const localData = JSON.parse(localRaw);
          const now = Date.now();
          await db.collection('system_data').doc(key).set({
            payload: localData,
            updatedAt: now,
            updatedBy: 'force_upload'
          });
          localStorage.setItem(`pm_ts_${key}`, String(now));
        }
      }
      updateStatusUI('online', '클라우드 동기화 완료');
      showToast('✅ 모든 로컬 데이터가 클라우드에 성공적으로 업로드되었습니다!');
    } catch (e) {
      console.error('강제 업로드 실패:', e);
      showToast('업로드 중 오류가 발생했습니다.');
    }
  }

  // ── 클라우드 데이터를 현재 PC로 강제 다운로드 ─────────
  async function forceDownloadCloud() {
    if (!db) return;
    if (!confirm('클라우드에 저장된 최신 데이터를 받아와 현재 브라우저 데이터를 덮어쓰시겠습니까?')) return;

    updateStatusUI('syncing', '클라우드에서 다운로드 중...');
    try {
      for (const key of SYNC_KEYS) {
        const docSnap = await db.collection('system_data').doc(key).get();
        if (docSnap.exists) {
          const cloudDoc = docSnap.data();
          if (cloudDoc.payload !== undefined) {
            localStorage.setItem(key, JSON.stringify(cloudDoc.payload));
            localStorage.setItem(`pm_ts_${key}`, String(cloudDoc.updatedAt || Date.now()));
            notifyListeners(key, cloudDoc.payload);
          }
        }
      }
      updateStatusUI('online', '클라우드 동기화 완료');
      showToast('✅ 클라우드 데이터를 성공적으로 내려받았습니다!');
      location.reload();
    } catch (e) {
      console.error('강제 다운로드 실패:', e);
      showToast('다운로드 중 오류가 발생했습니다.');
    }
  }

  // ── 데이터 변경 이벤트 구독 ──────────────────────────
  function onUpdate(callback) {
    if (typeof callback === 'function') {
      changeListeners.push(callback);
    }
  }

  function notifyListeners(key, data) {
    changeListeners.forEach(cb => {
      try {
        cb(key, data);
      } catch (err) {
        console.error('동기화 콜백 실행 오류:', err);
      }
    });

    // 전역 대시보드 함수들 자동 갱신 트리거
    if (typeof window.updateGlobalDashboardStats === 'function') {
      window.updateGlobalDashboardStats(false);
    }
    if (window.ClientManager && typeof window.ClientManager.renderTable === 'function') {
      window.ClientManager.renderTable();
    }
    if (window.ActivityLogger && typeof window.ActivityLogger.render === 'function') {
      window.ActivityLogger.render();
    }
  }

  // ── UI 상태 표시기 업데이트 ──────────────────────────
  function updateStatusUI(status, message) {
    const icon = document.getElementById('cloudSyncIcon');
    const text = document.getElementById('cloudSyncText');
    const badge = document.getElementById('cloudSyncStatus');

    if (!badge) return;

    if (status === 'online') {
      if (icon) {
        icon.className = 'fa fa-cloud';
        icon.style.color = '#059669'; // 초록색
      }
      if (text) text.textContent = message || '동기화 완료';
      badge.title = '클라우드와 연결되어 실시간 동기화 중입니다. (클릭하여 즉시 동기화)';
      badge.style.background = '#ecfdf5';
      badge.style.color = '#065f46';
      badge.style.border = '1px solid #a7f3d0';
    } else if (status === 'syncing') {
      if (icon) {
        icon.className = 'fa fa-sync-alt fa-spin';
        icon.style.color = '#0284c7'; // 파란색 회전
      }
      if (text) text.textContent = message || '동기화 중...';
      badge.style.background = '#f0f9ff';
      badge.style.color = '#0369a1';
      badge.style.border = '1px solid #bae6fd';
    } else if (status === 'error') {
      if (icon) {
        icon.className = 'fa fa-exclamation-triangle';
        icon.style.color = '#dc2626'; // 빨간색
      }
      if (text) text.textContent = message || '동기화 오류';
      badge.style.background = '#fef2f2';
      badge.style.color = '#991b1b';
      badge.style.border = '1px solid #fecaca';
    } else {
      if (icon) {
        icon.className = 'fa fa-cloud';
        icon.style.color = '#94a3b8';
      }
      if (text) text.textContent = message || '오프라인';
      badge.style.background = '#f8fafc';
      badge.style.color = '#64748b';
      badge.style.border = '1px solid #e2e8f0';
    }
  }

  // ── 토스트 팝업 알림 ──────────────────────────────────
  function showToast(msg) {
    let toast = document.getElementById('pmCloudToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pmCloudToast';
      toast.style.position = 'fixed';
      toast.style.bottom = '24px';
      toast.style.right = '24px';
      toast.style.backgroundColor = '#1e293b';
      toast.style.color = '#ffffff';
      toast.style.padding = '12px 20px';
      toast.style.borderRadius = '8px';
      toast.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.3)';
      toast.style.fontSize = '14px';
      toast.style.fontWeight = '600';
      toast.style.zIndex = '99999';
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
    }, 3000);
  }

  // DOM 로드 시 자동 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 50);
  }

  return {
    init,
    save,
    syncKey,
    manualSync,
    forceUploadLocal,
    forceDownloadCloud,
    onUpdate,
    showToast
  };
})();

window.FirebaseDB = FirebaseDB;
