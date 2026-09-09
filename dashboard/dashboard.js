document.addEventListener('DOMContentLoaded', () => {

  // ── 1. SPA 라우팅: 메뉴 클릭 시 해당 섹션 표시 ──
  // data-page 속성을 기반으로 대응하는 #page-{name} 섹션을 활성화한다.
  const menuItems = document.querySelectorAll('.menu-item[data-page]');
  const pageSections = document.querySelectorAll('.page-section');

  function showPage(pageId) {
    // 모든 섹션 숨김
    pageSections.forEach(s => s.classList.remove('active'));
    // 해당 섹션 표시
    const target = document.getElementById(`page-${pageId}`);
    if (target) target.classList.add('active');

    // 메뉴 활성 표시 업데이트
    menuItems.forEach(item => {
      item.classList.toggle('active', item.dataset.page === pageId);
    });

    // 모바일에서 클릭 시 사이드바 닫기
    if (window.innerWidth <= 768) {
      document.getElementById('sidebar').classList.remove('active');
    }
  }

  // window에 showPage를 노출 (HTML onclick 속성에서 직접 호출 가능하도록)
  window.showPage = showPage;

  menuItems.forEach(item => {
    item.addEventListener('click', () => showPage(item.dataset.page));
  });

  // ── 2. 사이드바 토글 (모바일 환경) ──
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');

  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });
  }

  // ── 3. 대시보드 홈 통계 카드 더미 데이터 ──
  const stats = {
    'stat-clients':  24,   // 총 거래처 수
    'stat-rentals':  38,   // 임대 진행 중
    'stat-consult':  7,    // 미처리 상담
    'stat-members':  142   // 가입 회원 수
  };

  // 숫자를 0부터 목표값까지 카운트업 애니메이션으로 표시
  function countUp(el, target, duration = 1200) {
    let start = 0;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      el.textContent = Math.floor(progress * target).toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  Object.entries(stats).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) countUp(el, val);
  });

  // ── 4. 대시보드 홈 최근 내역 테이블 더미 데이터 ──
  const recentData = [
    { type: '렌탈 상담', name: '(주)미래소프트',   detail: '캐논 C3922 컬러복합기',    date: '2024.09.09', status: 'pending',   label: '처리 중' },
    { type: '견적 문의', name: '강동구 A학원',     detail: '렌탈 맞춤 견적 요청',       date: '2024.09.08', status: 'pending',   label: '대기 중' },
    { type: '임대 계약', name: '홍○○',           detail: 'HP OfficeJet Pro 9010',    date: '2024.09.07', status: 'completed', label: '완료' },
    { type: '상담 문의', name: '이○○',           detail: '잉크젯 vs 레이저 비교 상담', date: '2024.09.06', status: 'completed', label: '완료' },
    { type: '임대 계약', name: '(주)ABC상사',      detail: '현대오피스 PK-612X',       date: '2024.09.05', status: 'cancelled', label: '취소' },
  ];

  const tbody = document.getElementById('homeRecentBody');
  if (tbody) {
    tbody.innerHTML = recentData.map(item => `
      <tr>
        <td><span class="status-badge" style="background:rgba(139,92,246,0.12);color:var(--accent-secondary);">${item.type}</span></td>
        <td><strong>${item.name}</strong></td>
        <td>${item.detail}</td>
        <td>${item.date}</td>
        <td><span class="status-badge status-${item.status}">${item.label}</span></td>
      </tr>
    `).join('');
  }
});
