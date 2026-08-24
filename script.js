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
});

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

  // 슬라이드 이동 함수
  function goToSlide(index) {
    // 범위 초과 시 순환 처리
    if (index < 0) index = totalSlides - 1;
    if (index >= totalSlides) index = 0;

    currentSlide = index;
    track.style.transform = `translateX(-${currentSlide * 100}%)`;

    // 닷 인디케이터 업데이트
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlide);
    });
  }

  // 자동재생 시작 (4초 간격)
  function startAutoplay() {
    autoplayTimer = setInterval(() => {
      goToSlide(currentSlide + 1);
    }, 4000);
  }

  // 자동재생 정지
  function stopAutoplay() {
    clearInterval(autoplayTimer);
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

  // 초기 자동재생 시작
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
function initStickyForm() {
  const submitBtn = document.getElementById('stickySubmitBtn');
  const nameInput = document.getElementById('stickyName');
  const phoneInput = document.getElementById('stickyPhone');
  const captchaInput = document.getElementById('captchaInput');
  const agreeCheck = document.getElementById('agreeCheck');

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
    const captcha = captchaInput.value.trim();
    const agreed = agreeCheck.checked;

    // 유효성 검사
    if (!name) {
      showAlert('이름을 입력해주세요.', nameInput);
      return;
    }

    if (!phone || phone.length < 12) {
      showAlert('올바른 연락처를 입력해주세요.', phoneInput);
      return;
    }

    if (!agreed) {
      showAlert('개인정보 수집·이용에 동의해주세요.');
      return;
    }

    // 제출 성공 처리 (실제 서버 연동 전 임시 메시지)
    showSuccess();

    // 폼 초기화
    nameInput.value = '';
    phoneInput.value = '';
    captchaInput.value = '';
    agreeCheck.checked = false;
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
