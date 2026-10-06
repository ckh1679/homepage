/**
 * PrintPro 홈페이지 - JavaScript 기능 모음
 * - 히어로 슬라이더 (자동재생)
 * - 스크롤 reveal 애니메이션
 * - GNB 스크롤 시 스타일 변경
 * - 견적 폼 제출 처리
 */

// =============================================
// DOM 로드 완료 후 실행
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  initHeroSlider();
  initScrollReveal();
  initStickyForm();
  initGNBScroll();
  initProductHover();
  initMobileMenu(); // 모바일 햄버거 메뉴
});

// =============================================
// 0. 모바일 햄버거 메뉴
// =============================================
/**
 * 모바일(768px 이하)에서 GNB 메뉴를 햄버거 버튼으로 열고닫는 기능
 * - 버튼 클릭: 메뉴 열기/닫기 토글
 * - 오버레이 클릭: 메뉴 닫기
 * - 메뉴 항목 클릭: 페이지 이동 후 자동 닫기
 */
function initMobileMenu() {
  const menuBtn  = document.getElementById('mobileMenuBtn');
  const menuList = document.getElementById('gnbMenuList');
  const overlay  = document.getElementById('gnbOverlay');

  if (!menuBtn || !menuList) return;

  // 메뉴 열기/닫기 토글
  function toggleMenu(open) {
    const isOpen = open !== undefined ? open : !menuList.classList.contains('open');
    menuList.classList.toggle('open', isOpen);
    if (overlay) overlay.classList.toggle('active', isOpen);
    menuBtn.setAttribute('aria-label', isOpen ? '메뉴 닫기' : '메뉴 열기');
    // 아이콘 전환 (bars ↔ times)
    const icon = menuBtn.querySelector('i');
    if (icon) {
      icon.className = isOpen ? 'fa fa-times' : 'fa fa-bars';
    }
  }

  menuBtn.addEventListener('click', () => toggleMenu());

  // 오버레이 클릭 시 닫기
  if (overlay) {
    overlay.addEventListener('click', () => toggleMenu(false));
  }

  // 메뉴 항목 클릭 시 자동 닫기 (페이지 이동 포함)
  menuList.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  // ESC 키로 닫기
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') toggleMenu(false);
  });
}

// =============================================
// 1. 히어로 슬라이더
// =============================================
function initHeroSlider() {
  const track = document.getElementById('heroSlidesTrack');
  const dots = document.querySelectorAll('#sliderDots .dot');
  const prevBtn = document.getElementById('heroPrevBtn');
  const nextBtn = document.getElementById('heroNextBtn');

  // 슬라이드 개수
  const totalSlides = document.querySelectorAll('.hero-slide').length;
  let currentSlide = 0;
  let autoplayTimer = null;

  /**
   * CSS transition 시간 (style.css .hero-slides transition: 0.6s)
   * 슬라이드 이동 애니메이션이 끝난 뒤부터 4초를 카운트해야
   * 모든 제품이 동일하게 4초씩 보임
   */
  const TRANSITION_MS = 600; // CSS transition 0.6s와 반드시 일치
  const DISPLAY_MS    = 4000; // 슬라이드 완전히 정착 후 표시 시간

  // 슬라이드 이동 함수
  function goToSlide(index) {
    if (index < 0) index = totalSlides - 1;
    if (index >= totalSlides) index = 0;

    currentSlide = index;
    track.style.transform = `translateX(-${currentSlide * 100}%)`;

    // 닷 인디케이터 업데이트
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlide);
    });

    // 현재 슬라이드 콘텐츠 fade-in-up 애니메이션 리셋
    // — CSS transition 완료(0.6s) 후 재생해 모든 슬라이드가 동일하게 보이도록 함
    const activeSlide = track.querySelectorAll('.hero-slide')[currentSlide];
    if (activeSlide) {
      const content = activeSlide.querySelector('.hero-content');
      if (content) {
        content.classList.remove('fade-in-up');
        void content.offsetWidth; // 리플로우 강제 → 애니메이션 재시작 보장
        content.classList.add('fade-in-up');
      }
    }
  }

  // ── 타이밍 핵심 로직 ──────────────────────────────────────
  // setInterval은 transition 시간을 무시하고 주기마다 발동해
  // 실제 가시 시간이 슬라이드마다 달라지는 문제가 있음.
  // setTimeout 체인을 사용해:
  //   [슬라이드 전환 시작] → TRANSITION_MS 대기 → [슬라이드 완전 표시]
  //   → DISPLAY_MS 대기 → [다음 슬라이드 전환 시작] → 반복
  // 이 방식으로 모든 슬라이드가 정확히 DISPLAY_MS(4초) 동안 보임
  let isPlaying = false;

  function scheduleNext() {
    if (!isPlaying) return;
    // transition 완료 후 표시 시간 대기, 그 다음 다음 슬라이드로 이동
    autoplayTimer = setTimeout(() => {
      goToSlide(currentSlide + 1);
      // 전환 애니메이션이 끝난 뒤 다시 scheduleNext 호출
      autoplayTimer = setTimeout(scheduleNext, TRANSITION_MS);
    }, DISPLAY_MS);
  }

  function startAutoplay() {
    isPlaying = true;
    clearTimeout(autoplayTimer);
    scheduleNext();
  }

  function stopAutoplay() {
    isPlaying = false;
    clearTimeout(autoplayTimer);
  }

  // 화살표 버튼 이벤트
  prevBtn.addEventListener('click', () => {
    stopAutoplay();
    goToSlide(currentSlide - 1);
    startAutoplay();
  });

  nextBtn.addEventListener('click', () => {
    stopAutoplay();
    goToSlide(currentSlide + 1);
    startAutoplay();
  });

  // 닷 클릭 이벤트
  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const index = parseInt(dot.getAttribute('data-slide'));
      stopAutoplay();
      goToSlide(index);
      startAutoplay();
    });
  });

  // 터치/스와이프 지원
  let touchStartX = 0;
  const sliderEl = document.getElementById('heroSlider');

  sliderEl.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });

  sliderEl.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      stopAutoplay();
      goToSlide(diff > 0 ? currentSlide + 1 : currentSlide - 1);
      startAutoplay();
    }
  });

  // 마우스오버 시 자동재생 일시 정지
  sliderEl.addEventListener('mouseenter', stopAutoplay);
  sliderEl.addEventListener('mouseleave', startAutoplay);

  // 첫 슬라이드 콘텐츠 애니메이션 실행 후 자동재생 시작
  goToSlide(0);
  startAutoplay();

}

// =============================================
// 2. 스크롤 Reveal 애니메이션
// =============================================
function initScrollReveal() {
  // IntersectionObserver로 뷰포트 진입 시 애니메이션 적용
  const revealEls = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, idx) => {
      if (entry.isIntersecting) {
        // 순차적 지연 적용 (같은 그룹 내 카드들)
        const delay = (idx % 8) * 80;
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, delay);
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,   // 10% 이상 보이면 트리거
    rootMargin: '0px 0px -50px 0px'
  });

  revealEls.forEach((el) => {
    observer.observe(el);
  });
}

// =============================================
// 3. GNB 스크롤 감지 (스크롤 시 그림자 강화)
// =============================================
function initGNBScroll() {
  const gnb = document.getElementById('gnbNav');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
      gnb.style.boxShadow = '0 4px 20px rgba(0, 153, 204, 0.4)';
    } else {
      gnb.style.boxShadow = '0 2px 8px rgba(0, 153, 204, 0.3)';
    }
  }, { passive: true });
}

// =============================================
// 4. 하단 스티키 폼 - 간편견적신청
// =============================================
// =============================================
function initStickyForm() {
  const submitBtn = document.getElementById('stickySubmitBtn');
  const nameInput = document.getElementById('stickyName');
  const phoneInput = document.getElementById('stickyPhone');
  const captchaInput = document.getElementById('captchaInput');
  const captchaArea = document.getElementById('captchaArea');
  const captchaTextEl = document.getElementById('captchaText');
  const captchaRefreshBtn = document.getElementById('captchaRefreshBtn');
  const agreeCheck = document.getElementById('agreeCheck');

  let currentCaptcha = '';

  // ── 랜덤 5자리 보안 문자 생성 (알파벳 대문자 + 숫자) ──
  function generateCaptcha() {
    // 헷갈리기 쉬운 0, O, 1, I를 제외한 가독성 높은 영문+숫자 5자리
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    currentCaptcha = code;
    if (captchaTextEl) {
      captchaTextEl.textContent = code;
    }
  }

  // 캡차 초기 생성
  generateCaptcha();

  // 캡차 영역 또는 새로고침 아이콘 클릭 시 재발급
  if (captchaArea) {
    captchaArea.addEventListener('click', () => {
      generateCaptcha();
    });
  }

  // 전화번호 자동 포매팅 (000-0000-0000)
  phoneInput.addEventListener('input', () => {
    let val = phoneInput.value.replace(/\D/g, '');
    if (val.length <= 3) {
      phoneInput.value = val;
    } else if (val.length <= 7) {
      phoneInput.value = `${val.slice(0, 3)}-${val.slice(3)}`;
    } else {
      phoneInput.value = `${val.slice(0, 3)}-${val.slice(3, 7)}-${val.slice(7, 11)}`;
    }
  });

  // 폼 제출
  submitBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const inputCaptcha = captchaInput.value.trim();
    const agreed = agreeCheck.checked;

    // 1. 이름 검사
    if (!name) {
      showAlert('이름을 입력해주세요.', nameInput);
      return;
    }

    // 2. 연락처 검사
    if (!phone || phone.length < 12) {
      showAlert('올바른 연락처를 입력해주세요.', phoneInput);
      return;
    }

    // 3. 자동입력방지 5자리 문자 검사
    if (!inputCaptcha || inputCaptcha.toUpperCase() !== currentCaptcha.toUpperCase()) {
      showAlert('자동입력방지 문자를 확인해주세요.', captchaInput);
      generateCaptcha(); // 불일치 시 보안을 위해 새로운 5자리 생성
      captchaInput.value = '';
      captchaInput.focus();
      return;
    }

    // 4. 개인정보 수집 동의 검사
    if (!agreed) {
      showAlert('개인정보 수집·이용에 동의해주세요.');
      return;
    }

    // 5. 전화상담신청 게시판에 데이터 저장
    const requestTitle = `[전화상담신청] ${name} 고객님 (${phone})`;
    const requestContent = `■ 고객명: ${name}\n■ 연락처: ${phone}\n■ 접수일시: ${new Date().toLocaleString('ko-KR')}\n■ 상담상태: 접수대기\n\n위 고객님께서 메인페이지 하단 간편견적신청을 통해 상담을 요청하셨습니다.`;

    if (typeof Board !== 'undefined' && Board.createPost) {
      Board.createPost({
        boardType: 'request',
        title: requestTitle,
        content: requestContent,
        author: name,
        userId: 'guest',
        contactPhone: phone,
        status: '접수대기'
      });
    } else {
      try {
        const raw = localStorage.getItem('pm_board_posts') || '[]';
        const posts = JSON.parse(raw);
        posts.unshift({
          id: `request-${Date.now()}`,
          boardType: 'request',
          title: requestTitle,
          content: requestContent,
          author: name,
          userId: 'guest',
          authorEmail: '',
          contactPhone: phone,
          status: '접수대기',
          createdAt: new Date().toISOString(),
          updatedAt: null,
          views: 0,
          isPinned: false
        });
        localStorage.setItem('pm_board_posts', JSON.stringify(posts));
        if (window.FirebaseDB && typeof window.FirebaseDB.save === 'function') {
          window.FirebaseDB.save('pm_board_posts', posts);
        }
      } catch (err) {
        console.error('전화상담신청 데이터 저장 실패:', err);
      }
    }

    // 제출 성공 알림 처리
    showSuccess();

    // 폼 초기화 및 새 캡차 발급
    nameInput.value = '';
    phoneInput.value = '';
    captchaInput.value = '';
    agreeCheck.checked = false;
    generateCaptcha();
  });
}

// 에러 알림 표시
function showAlert(msg, inputEl = null) {
  // 기존 알림 제거
  const existing = document.getElementById('formAlert');
  if (existing) existing.remove();

  const alert = document.createElement('div');
  alert.id = 'formAlert';
  alert.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #e53935;
    color: white;
    padding: 14px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    z-index: 9999;
    box-shadow: 0 4px 20px rgba(229,57,53,0.4);
    animation: slideInRight 0.3s ease;
  `;
  alert.textContent = msg;
  document.body.appendChild(alert);

  if (inputEl) {
    inputEl.focus();
    inputEl.style.border = '2px solid #e53935';
    setTimeout(() => { inputEl.style.border = ''; }, 2000);
  }

  setTimeout(() => { alert.remove(); }, 3000);
}

// 성공 알림 표시
function showSuccess() {
  const success = document.createElement('div');
  success.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #00b04f;
    color: white;
    padding: 14px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    z-index: 9999;
    box-shadow: 0 4px 20px rgba(0,176,79,0.4);
    animation: slideInRight 0.3s ease;
  `;
  success.textContent = '✅ 견적 신청이 완료되었습니다! 빠른 시간 내 연락드리겠습니다.';
  document.body.appendChild(success);
  setTimeout(() => { success.remove(); }, 4000);
}

// =============================================
// 5. 상품 카드 호버 효과 강화
// =============================================
function initProductHover() {
  // 모든 상품 카드에 부드러운 그림자 강화 적용
  const cards = document.querySelectorAll('.product-card');
  cards.forEach((card) => {
    card.addEventListener('mouseenter', () => {
      card.style.boxShadow = '0 12px 40px rgba(0, 153, 204, 0.2)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.boxShadow = '';
    });
  });
}

// =============================================
// CSS 애니메이션 키프레임 추가 (JS로 동적 삽입)
// =============================================
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(30px); }
    to { opacity: 1; transform: translateX(0); }
  }

  /* ── 히어로 슬라이드 콘텐츠 진입 애니메이션 ──
     JS에서 슬라이드 전환마다 클래스를 리셋하므로
     모든 제품이 항상 동일한 0.55s 속도로 등장함 */
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .fade-in-up {
    animation: fadeInUp 0.55s ease forwards;
  }

  /* 히어로 슬라이드 배경 효과 강화 */
  .hero-slide {
    background-size: cover;
    background-position: center;
  }

  /* 히어로 슬라이드 장식 프린터 이모지 */
  .hero-slide-decorator {
    position: absolute;
    right: 8%;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1;
  }

  .hero-printer-icon {
    font-size: 180px;
    opacity: 0.3;
    animation: floatPrinter 3s ease-in-out infinite;
    filter: drop-shadow(0 20px 40px rgba(0,0,0,0.3));
  }

  @keyframes floatPrinter {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
  }
`;
document.head.appendChild(styleSheet);

