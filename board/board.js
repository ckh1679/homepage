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

  // ── 게시글 작성 ──────────────────────────────────────
  function createPost({ boardType, title, content, author, userId }) {
    if (!title || !title.trim()) return { success: false, message: '제목을 입력해주세요.' };
    if (!content || !content.trim()) return { success: false, message: '내용을 입력해주세요.' };

    const all = getAllPosts();
    const newPost = {
      id: `${boardType}-${Date.now()}`,
      boardType,
      title: title.trim(),
      content: content.trim(),
      author,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      views: 0,
      isPinned: false
    };

    all.unshift(newPost);  // 최신글을 맨 앞에
    localStorage.setItem(BOARD_KEY, JSON.stringify(all));
    return { success: true, post: newPost };
  }

  // ── 게시글 수정 ──────────────────────────────────────
  function updatePost(id, { title, content }, currentUser) {
    const all = getAllPosts();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return { success: false, message: '게시글을 찾을 수 없습니다.' };

    const post = all[idx];

    // 권한 확인: 본인 또는 관리자만 수정 가능
    if (post.userId !== currentUser.id && currentUser.role !== 'admin') {
      return { success: false, message: '수정 권한이 없습니다.' };
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

  // ── 게시글 삭제 ──────────────────────────────────────
  function deletePost(id, currentUser) {
    const all = getAllPosts();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return { success: false, message: '게시글을 찾을 수 없습니다.' };

    const post = all[idx];

    // 권한 확인
    if (post.userId !== currentUser.id && currentUser.role !== 'admin') {
      return { success: false, message: '삭제 권한이 없습니다.' };
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
    const names = { notice: '공지사항', consult: '상담게시판', review: '사용후기' };
    return names[boardType] || '게시판';
  }

  return {
    getAllPosts,
    getPostsByType,
    getPost,
    createPost,
    updatePost,
    deletePost,
    formatDate,
    getBoardName
  };
})();
