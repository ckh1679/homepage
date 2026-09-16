/**
 * board.js - 프린터모아 게시판 CRUD 모듈
 *
 * 세 가지 게시판을 localStorage로 관리합니다.
 *   notice   = 공지사항 (관리자 전용 작성)
 *   consult  = 상담게시판 (로그인 회원 작성)
 *   review   = 사용후기 (로그인 회원 작성)
 */

const Board = (() => {
  const BOARD_KEY = 'pm_board_posts';

  // ── 초기 샘플 데이터 ────────────────────────────────
  const SAMPLE_POSTS = [
    {
      id: 'notice-1',
      boardType: 'notice',
      title: '프린터모아 서비스 안내',
      content: `안녕하세요, 프린터모아입니다.\n\n저희 프린터모아는 전국 어디든 복합기·프린터 렌탈 서비스를 제공합니다.\n\n✅ 무상 AS 포함\n✅ 토너/잉크 무료 제공\n✅ 전국 설치비 무료\n✅ 이전 설치 무료\n\n궁금하신 사항은 상담게시판을 이용해 주세요.`,
      author: '관리자',
      userId: 'admin',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: null,
      views: 128,
      isPinned: true
    },
    {
      id: 'notice-2',
      boardType: 'notice',
      title: '2026년 7월 이벤트 안내 - 신규 가입 시 첫달 무료!',
      content: `🎉 7월 한정 특별 이벤트\n\n신규 계약 고객님께 첫 달 렌탈료 무료 혜택을 드립니다.\n\n대상: 2026년 7월 31일까지 신규 계약 고객\n조건: 3년 이상 약정\n\n지금 바로 상담 문의하세요! 📞 010-5922-3650`,
      author: '관리자',
      userId: 'admin',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: null,
      views: 87,
      isPinned: true
    },
    {
      id: 'notice-3',
      boardType: 'notice',
      title: '고객센터 운영시간 안내',
      content: `고객센터 운영시간을 안내드립니다.\n\n📞 전화: 010-5922-3650\n⏰ 평일 AM 09:00 ~ PM 17:00\n🚫 토·일요일, 공휴일 휴무\n\n긴급 문의는 카카오톡 채널 '프린터모아'로 연락 주세요.`,
      author: '관리자',
      userId: 'admin',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: null,
      views: 203,
      isPinned: false
    },
    {
      id: 'consult-1',
      boardType: 'consult',
      title: '소규모 사무실에 적합한 복합기 추천 부탁드립니다',
      content: `직원 5명짜리 소규모 사무실입니다.\n흑백 위주로 사용하는데 월 렌탈료가 얼마 정도 될까요?\nA4 사이즈면 충분할 것 같습니다.`,
      author: '홍길동',
      userId: 'user001',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: null,
      views: 34,
      isPinned: false
    },
    {
      id: 'review-1',
      boardType: 'review',
      title: '신도리코 N620 사용 한 달 후기입니다',
      content: `한 달 전에 신도리코 A3 흑백복합기 N620을 렌탈했는데 정말 만족스럽습니다.\n\n속도도 빠르고 토너도 무료로 제공해주셔서 좋았어요.\n설치도 당일에 바로 와주셔서 업무에 지장이 없었습니다. 👍\n\n다음에도 프린터모아 이용할 예정입니다!`,
      author: '김철수',
      userId: 'user002',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: null,
      views: 56,
      isPinned: false
    }
  ];

  // ── 게시글 전체 목록 조회 ────────────────────────────
  function getAllPosts() {
    try {
      const raw = localStorage.getItem(BOARD_KEY);
      if (!raw) {
        // 첫 실행: 샘플 데이터 저장
        localStorage.setItem(BOARD_KEY, JSON.stringify(SAMPLE_POSTS));
        return SAMPLE_POSTS;
      }
      return JSON.parse(raw);
    } catch {
      return SAMPLE_POSTS;
    }
  }

  // ── 게시판 타입별 목록 조회 ─────────────────────────
  function getPostsByType(boardType) {
    const all = getAllPosts();
    return all
      .filter(p => p.boardType === boardType)
      .sort((a, b) => {
        // 고정글 우선, 이후 최신순
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }

  // ── 단일 게시글 조회 (조회수 증가 포함) ─────────────
  function getPost(id, increaseView = false) {
    const all = getAllPosts();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return null;

    if (increaseView) {
      all[idx].views = (all[idx].views || 0) + 1;
      localStorage.setItem(BOARD_KEY, JSON.stringify(all));
    }
    return all[idx];
  }

  // ── 게시글 작성 ────────────────────────────────────
  // authorEmail, contactPhone, status 등을 함께 저장
  function createPost({ boardType, title, content, author, userId, authorEmail, contactPhone, status }) {
    if (!title || !title.trim()) return { success: false, message: '제목을 입력해주세요.' };
    if (!content || !content.trim()) return { success: false, message: '내용을 입력해주세요.' };

    const all = getAllPosts();
    const newPost = {
      id: `${boardType}-${Date.now()}`,
      boardType,
      title: title.trim(),
      content: content.trim(),
      author: author || '익명',
      userId: userId || 'guest',
      authorEmail: authorEmail || '',  // 구글 이메일 저장
      contactPhone: contactPhone || '', // 전화상담 연락처
      status: status || (boardType === 'request' ? '접수대기' : ''), // 상담 처리 상태
      createdAt: new Date().toISOString(),
      updatedAt: null,
      views: 0,
      isPinned: false
    };

    all.unshift(newPost);  // 최신글을 맨 앞에
    localStorage.setItem(BOARD_KEY, JSON.stringify(all));
    return { success: true, post: newPost };
  }

  // ── 게시글 수정 ────────────────────────────────────
  function updatePost(id, { title, content }, currentUser) {
    const all = getAllPosts();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return { success: false, message: '게시글을 찾을 수 없습니다.' };

    const post = all[idx];

    // 관리자 확인 (Auth.isAdmin 또는 3개 관리자 이메일)
    const isAdmin = (typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin()) ||
                    currentUser.role === 'admin' ||
                    (typeof Auth !== 'undefined' && Auth.DASHBOARD_ADMIN_EMAILS && Auth.DASHBOARD_ADMIN_EMAILS.includes(currentUser.email));

    // 공지사항 및 전화상담신청은 오직 관리자만 수정 가능
    if (post.boardType === 'notice' || post.boardType === 'request') {
      if (!isAdmin) {
        return { success: false, message: '관리자만 수정할 수 있습니다.' };
      }
    } else {
      // 상담/사용후기: 작성자 본인 또는 관리자
      const isOwner = post.userId === currentUser.id ||
                      (post.authorEmail && currentUser.email && post.authorEmail === currentUser.email);
      if (!isOwner && !isAdmin) {
        return { success: false, message: '수정 권한이 없습니다.' };
      }
    }

    if (!title || !title.trim()) return { success: false, message: '제목을 입력해주세요.' };
    if (!content || !content.trim()) return { success: false, message: '내용을 입력해주세요.' };

    all[idx] = {
      ...post,
      title: title.trim(),
      content: content.trim(),
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(BOARD_KEY, JSON.stringify(all));
    return { success: true, post: all[idx] };
  }

  // ── 게시글 삭제 ────────────────────────────────────
  function deletePost(id, currentUser) {
    const all = getAllPosts();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return { success: false, message: '게시글을 찾을 수 없습니다.' };

    const post = all[idx];

    // 관리자 확인
    const isAdmin = (typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin()) ||
                    currentUser.role === 'admin' ||
                    (typeof Auth !== 'undefined' && Auth.DASHBOARD_ADMIN_EMAILS && Auth.DASHBOARD_ADMIN_EMAILS.includes(currentUser.email));

    // 공지사항 및 전화상담신청은 오직 관리자만 삭제 가능
    if (post.boardType === 'notice' || post.boardType === 'request') {
      if (!isAdmin) {
        return { success: false, message: '관리자만 삭제할 수 있습니다.' };
      }
    } else {
      // 상담/사용후기: 작성자 본인 또는 관리자
      const isOwner = post.userId === currentUser.id ||
                      (post.authorEmail && currentUser.email && post.authorEmail === currentUser.email);
      if (!isOwner && !isAdmin) {
        return { success: false, message: '삭제 권한이 없습니다.' };
      }
    }

    all.splice(idx, 1);
    localStorage.setItem(BOARD_KEY, JSON.stringify(all));
    return { success: true };
  }

  // ── 날짜 포매팅 헬퍼 ────────────────────────────────
  function formatDate(isoString) {
    if (!isoString) return '-';
    const d = new Date(isoString);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  }

  // ── 게시판 이름 반환 헬퍼 ───────────────────────────
  function getBoardName(boardType) {
    const names = {
      notice: '공지사항',
      consult: '상담게시판',
      review: '사용후기',
      request: '전화상담신청'
    };
    return names[boardType] || '게시판';
  }

  // =======================================================
  // ── 전화상담신청 관리자 읽음 추적 및 알림 팝업 모듈 ───
  // =======================================================
  const READ_REQUESTS_KEY = 'pm_admin_read_requests';

  // 관리자가 확인한 전화상담 ID 목록 조회
  function getReadRequestIds() {
    try {
      return JSON.parse(localStorage.getItem(READ_REQUESTS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  // 관리자 미확인(새 글) 전화상담 신청 목록 조회
  function getUnreadRequests() {
    const all = getAllPosts();
    const readIds = getReadRequestIds();
    return all
      .filter(p => p.boardType === 'request' && !readIds.includes(p.id))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // 전화상담 신청 읽음 처리 (단일 ID 지정 또는 전체)
  function markRequestsAsRead(postIds) {
    const readIds = new Set(getReadRequestIds());
    if (postIds) {
      const ids = Array.isArray(postIds) ? postIds : [postIds];
      ids.forEach(id => readIds.add(id));
    } else {
      // 인자 생략 시 현재 등록된 모든 전화상담신청 글을 일괄 읽음 처리
      const all = getAllPosts();
      all.filter(p => p.boardType === 'request').forEach(p => readIds.add(p.id));
    }
    localStorage.setItem(READ_REQUESTS_KEY, JSON.stringify(Array.from(readIds)));
  }

  // 특정 글 읽음 여부 확인
  function isRequestRead(postId) {
    const readIds = getReadRequestIds();
    return readIds.includes(postId);
  }

  // 게시판 경로 헬퍼
  function getBoardRequestUrl() {
    const path = window.location.pathname.replace(/\\/g, '/');
    if (path.includes('/dashboard/') || path.includes('/shop/')) {
      return '../board/board.html?type=request';
    } else if (path.includes('/board/')) {
      return 'board.html?type=request';
    } else {
      return 'board/board.html?type=request';
    }
  }

  function getBoardViewUrl(postId) {
    const path = window.location.pathname.replace(/\\/g, '/');
    if (path.includes('/dashboard/') || path.includes('/shop/')) {
      return `../board/board-view.html?id=${encodeURIComponent(postId)}`;
    } else if (path.includes('/board/')) {
      return `board-view.html?id=${encodeURIComponent(postId)}`;
    } else {
      return `board/board-view.html?id=${encodeURIComponent(postId)}`;
    }
  }

  // 알림창 스타일 자동 주입
  function injectAdminAlertStyles() {
    if (document.getElementById('pmAdminAlertStyles')) return;
    const style = document.createElement('style');
    style.id = 'pmAdminAlertStyles';
    style.textContent = `
      .admin-req-modal {
        position: fixed;
        inset: 0;
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
      }
      .admin-req-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(15, 23, 42, 0.72);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
      }
      .admin-req-box {
        position: relative;
        width: 100%;
        max-width: 520px;
        background: #ffffff;
        border-radius: 20px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
        overflow: hidden;
        animation: adminReqPop 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        flex-direction: column;
        z-index: 1;
        font-family: -apple-system, BlinkMacSystemFont, "Noto Sans KR", sans-serif;
      }
      @keyframes adminReqPop {
        from { opacity: 0; transform: scale(0.92) translateY(16px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      .admin-req-header {
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        padding: 22px 24px;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      .admin-req-header-left {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .admin-req-icon-wrap {
        position: relative;
        width: 44px;
        height: 44px;
        background: rgba(249, 115, 22, 0.18);
        border: 2px solid rgba(249, 115, 22, 0.45);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fb923c;
        font-size: 20px;
        flex-shrink: 0;
      }
      .admin-req-icon-wrap .req-pulse-dot {
        position: absolute;
        top: -1px;
        right: -1px;
        width: 12px;
        height: 12px;
        background: #ef4444;
        border: 2px solid #ffffff;
        border-radius: 50%;
        animation: reqPulse 1.8s infinite;
      }
      @keyframes reqPulse {
        0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
        70% { transform: scale(1.15); box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
        100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
      }
      .admin-req-title {
        font-size: 17px;
        font-weight: 700;
        margin: 0 0 4px 0;
        color: #ffffff;
        letter-spacing: -0.3px;
      }
      .admin-req-subtitle {
        font-size: 13px;
        margin: 0;
        color: #cbd5e1;
        line-height: 1.4;
      }
      .admin-req-subtitle strong {
        color: #fbbf24;
        font-weight: 700;
      }
      .admin-req-close-btn {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: #94a3b8;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 16px;
        flex-shrink: 0;
      }
      .admin-req-close-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        color: #ffffff;
      }
      .admin-req-body {
        padding: 18px 22px;
        max-height: 330px;
        overflow-y: auto;
        background: #f8fafc;
      }
      .admin-req-body::-webkit-scrollbar {
        width: 6px;
      }
      .admin-req-body::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;
      }
      .admin-req-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .admin-req-item {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 13px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        transition: all 0.2s;
      }
      .admin-req-item:hover {
        border-color: #0284c7;
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(2, 132, 199, 0.12);
        background: #f0f9ff;
      }
      .req-item-left {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .req-item-top {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .req-badge-wait {
        background: #ffedd5;
        color: #c2410c;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 10px;
        border: 1px solid #fed7aa;
      }
      .req-badge-done {
        background: #dcfce7;
        color: #15803d;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 10px;
        border: 1px solid #bbf7d0;
      }
      .req-item-name {
        font-size: 14.5px;
        font-weight: 700;
        color: #0f172a;
      }
      .req-item-phone {
        font-size: 13px;
        color: #475569;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .req-item-phone i {
        color: #0284c7;
        font-size: 12px;
      }
      .req-item-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .req-item-time {
        font-size: 12px;
        color: #94a3b8;
      }
      .req-item-arrow {
        color: #cbd5e1;
        font-size: 13px;
        transition: transform 0.2s;
      }
      .admin-req-item:hover .req-item-arrow {
        color: #0284c7;
        transform: translateX(3px);
      }
      .req-more-notice {
        text-align: center;
        font-size: 12.5px;
        color: #64748b;
        margin: 12px 0 2px 0;
      }
      .admin-req-footer {
        padding: 14px 20px;
        background: #ffffff;
        border-top: 1px solid #e2e8f0;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
      }
      .admin-req-btn-dismiss {
        background: #f1f5f9;
        color: #475569;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        padding: 9px 16px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .admin-req-btn-dismiss:hover {
        background: #e2e8f0;
        color: #1e293b;
      }
      .admin-req-btn-action {
        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
        color: #ffffff;
        border: none;
        border-radius: 10px;
        padding: 9px 18px;
        font-size: 13.5px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 4px 10px rgba(2, 132, 199, 0.28);
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .admin-req-btn-action:hover {
        background: linear-gradient(135deg, #0369a1 0%, #075985 100%);
        box-shadow: 0 6px 14px rgba(2, 132, 199, 0.38);
        transform: translateY(-1px);
      }
      @media (max-width: 480px) {
        .admin-req-footer {
          flex-direction: column-reverse;
          gap: 8px;
        }
        .admin-req-btn-dismiss,
        .admin-req-btn-action {
          width: 100%;
          justify-content: center;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // 알림창 닫기 (markAsRead가 true면 읽음 처리)
  function closeAdminRequestAlert(markAsRead = true) {
    if (markAsRead) {
      markRequestsAsRead();
    }
    const modal = document.getElementById('adminRequestAlertModal');
    if (modal) {
      modal.style.display = 'none';
      modal.remove();
    }
    document.body.style.overflow = '';
  }

  // 알림창 모달 생성 및 표출
  function showAdminRequestAlertModal(unreadList) {
    if (!unreadList || unreadList.length === 0) return;
    if (document.getElementById('adminRequestAlertModal')) return;

    injectAdminAlertStyles();

    const displayList = unreadList.slice(0, 5);
    const count = unreadList.length;

    const listHtml = displayList.map(post => {
      const isWait = (post.status || '접수대기') === '접수대기';
      const badgeHtml = isWait
        ? `<span class="req-badge-wait">접수대기</span>`
        : `<span class="req-badge-done">상담완료</span>`;

      let timeText = '-';
      if (post.createdAt) {
        const d = new Date(post.createdAt);
        const pad = n => String(n).padStart(2, '0');
        timeText = `${d.getMonth() + 1}.${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }

      const viewUrl = getBoardViewUrl(post.id);

      return `
        <div class="admin-req-item" onclick="Board.goToRequestPost('${post.id}', '${viewUrl}')">
          <div class="req-item-left">
            <div class="req-item-top">
              ${badgeHtml}
              <span class="req-item-name">${post.author || '고객'} 고객님</span>
            </div>
            <div class="req-item-phone">
              <i class="fa fa-phone-alt"></i>
              <span>${post.contactPhone || '연락처 없음'}</span>
            </div>
          </div>
          <div class="req-item-right">
            <span class="req-item-time">${timeText}</span>
            <i class="fa fa-chevron-right req-item-arrow"></i>
          </div>
        </div>
      `;
    }).join('');

    const moreHtml = count > 5 ? `<p class="req-more-notice">외 <strong>${count - 5}건</strong>의 신규 전화상담 신청이 더 있습니다.</p>` : '';
    const boardUrl = getBoardRequestUrl();

    const modalHtml = `
      <div id="adminRequestAlertModal" class="admin-req-modal" role="dialog" aria-modal="true" aria-labelledby="adminReqTitle">
        <div class="admin-req-backdrop" onclick="Board.closeAdminRequestAlert(true)"></div>
        <div class="admin-req-box">
          <div class="admin-req-header">
            <div class="admin-req-header-left">
              <div class="admin-req-icon-wrap">
                <i class="fa fa-bell"></i>
                <span class="req-pulse-dot"></span>
              </div>
              <div>
                <h3 class="admin-req-title" id="adminReqTitle">새로운 전화상담 신청 알림</h3>
                <p class="admin-req-subtitle">미확인 전화상담 신청이 <strong>${count}건</strong> 접수되었습니다.</p>
              </div>
            </div>
            <button type="button" class="admin-req-close-btn" onclick="Board.closeAdminRequestAlert(true)" aria-label="닫기">
              <i class="fa fa-times"></i>
            </button>
          </div>
          <div class="admin-req-body">
            <div class="admin-req-list">
              ${listHtml}
            </div>
            ${moreHtml}
          </div>
          <div class="admin-req-footer">
            <button type="button" class="admin-req-btn-dismiss" onclick="Board.closeAdminRequestAlert(true)">
              <i class="fa fa-check"></i> 확인 완료 (창 닫기)
            </button>
            <button type="button" class="admin-req-btn-action" onclick="Board.goToRequestBoard('${boardUrl}')">
              전화상담 게시판으로 이동 <i class="fa fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div.firstElementChild);
    document.body.style.overflow = 'hidden';

    // ESC 키로 닫기
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        Board.closeAdminRequestAlert(true);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // 개별 글 이동
  function goToRequestPost(postId, viewUrl) {
    markRequestsAsRead(postId);
    closeAdminRequestAlert(false);
    window.location.href = viewUrl;
  }

  // 전화상담 게시판으로 이동
  function goToRequestBoard(boardUrl) {
    markRequestsAsRead();
    closeAdminRequestAlert(false);
    window.location.href = boardUrl;
  }

  // 관리자 신규 글 확인 및 알림 트리거
  function checkAndNotifyAdmin() {
    // 관리자가 아니면 무시
    if (typeof Auth === 'undefined' || !Auth.isAdmin || !Auth.isAdmin()) {
      return;
    }

    // 현재 페이지가 이미 전화상담 게시판 화면이면 자동 읽음 처리하고 팝업 띄우지 않음
    const isRequestBoard = window.location.pathname.includes('board.html') &&
      new URLSearchParams(window.location.search).get('type') === 'request';
    if (isRequestBoard) {
      markRequestsAsRead();
      return;
    }

    // 미확인 전화상담 신청 목록 조회
    const unread = getUnreadRequests();
    if (unread.length > 0) {
      setTimeout(() => {
        showAdminRequestAlertModal(unread);
      }, 350);
    }
  }

  return {
    getAllPosts,
    getPostsByType,
    getPost,
    createPost,
    updatePost,
    deletePost,
    formatDate,
    getBoardName,
    getReadRequestIds,
    getUnreadRequests,
    markRequestsAsRead,
    isRequestRead,
    checkAndNotifyAdmin,
    showAdminRequestAlertModal,
    closeAdminRequestAlert,
    goToRequestPost,
    goToRequestBoard
  };
})();

