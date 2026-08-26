/**
 * shop.js - 프린터모아 상품 데이터 및 필터링 로직
 *
 * 모든 카테고리의 상품 데이터를 여기서 관리합니다.
 * 백엔드 없이 순수 JS로 상품 목록을 렌더링합니다.
 */

const ShopData = {

  // ── 카테고리 정의 ──────────────────────────────────
  categories: [
    {
      id: 'inkjet',
      label: '잉크젯복합기',
      icon: 'fa-print',
      emoji: '🖨️',
      subCategories: [
        { id: 'inkjet-a4', label: 'A4 잉크젯복합기' },
        { id: 'inkjet-a3', label: 'A3 잉크젯복합기' },
      ]
    },
    {
      id: 'laser',
      label: '레이저복합기',
      icon: 'fa-copy',
      emoji: '📠',
      subCategories: [
        { id: 'laser-color-a3', label: '컬러복합기 A3' },
        { id: 'laser-color-a4', label: '컬러복합기 A4' },
        { id: 'laser-mono-a3', label: '흑백복합기 A3' },
        { id: 'laser-mono-a4', label: '흑백복합기 A4' },
        { id: 'laser-mono-printer', label: '흑백프린터 A4' },
      ]
    },
    {
      id: 'doc',
      label: '문서세단기',
      icon: 'fa-scissors',
      emoji: '✂️',
      subCategories: [
        { id: 'doc-shredder', label: '문서세단기' }
      ]
    },
    {
      id: 'pc',
      label: '컴퓨터·노트북',
      icon: 'fa-laptop',
      emoji: '💻',
      subCategories: [
        { id: 'pc-notebook', label: '노트북' },
        { id: 'pc-desktop', label: '데스크톱' }
      ]
    }
  ],

  // ── 상품 데이터 ───────────────────────────────────
  products: [

    // === 잉크젯복합기 A4 ===
    {
      id: 'p001',
      category: 'inkjet',
      subCategory: 'inkjet-a4',
      name: 'HP OfficeJet Pro 9010 A4 컬러 잉크젯복합기',
      price: 40000,
      originalPrice: 50000,  // 정상가 50,000원 → 20% 할인
      badges: ['새상품', '컬러', '무상AS', '잉크무료'],
      badgeTypes: ['new', 'color', 'free-as', 'free-toner'],
      description: '소규모 사무실·가정용에 최적화된 HP 비즈니스 잉크젯 복합기. 자동 양면 인쇄 및 ADF 지원. (3년 약정 / VAT 별도)',
      spec: 'A4 컬러 / 흑백 22ppm·컬러 18ppm / ADF 35매 / USB·WiFi·유선LAN / 양면인쇄',

      // 상세 스펙 테이블 — group: 있으면 섹션 헤더, label+value면 일반 행
      specDetail: [

        // ─ 상품 상세 정보 ─
        { group: '상품 상세 정보 제공' },
        { label: '제품구분',  value: '복합기' },
        { label: '인쇄 방식', value: '잉크젯' },
        { label: '제품분류',  value: '복합기 (잉크젯)' },
        { label: '출력 색상', value: '컬러 출력' },

        // ─ 복합기 기능 ─
        { group: '복합기 기능' },
        { label: '복사', value: '○' },
        { label: '스캔', value: '○' },
        { label: '팩스', value: '○' },

        // ─ 출력 ─
        { group: '출력' },
        { label: '컬러출력속도', value: '32ppm (18ipm)' },
        { label: '흑백출력속도', value: '32ppm (22ipm)' },
        { label: '첫 장 인쇄',  value: '9초 (컬러 10초)' },
        { label: '인쇄 해상도', value: '4800 × 1200 dpi' },

        // ─ 스캔 성능 ─
        { group: '스캔 성능' },
        { label: '광학 스캔 해상도', value: '1200 dpi' },

        // ─ 복사 성능 ─
        { group: '복사 성능' },
        { label: '컬러 복사속도', value: '32ppm' },
        { label: '흑백 복사속도', value: '32ppm' },
        { label: '연속복사',      value: '99매' },

        // ─ 팩스 성능 ─
        { group: '팩스 성능' },
        { label: 'PC 팩스',   value: '○' },
        { label: '팩스모뎀',  value: '33.6 kbps' },

        // ─ 용지 사양 ─
        { group: '용지 사양' },
        { label: '용지투입 방향', value: '하단 용지함' },
        { label: '용지함 용량',  value: '250매' },
        { label: '최대 지원용지', value: 'A4 지원' },
        { label: '지원용지 무게', value: '60 ~ 280 g/m²' },

        // ─ 소모품 사양 ─
        { group: '소모품 사양' },
        { label: '잉크구분', value: '안료잉크' },
        { label: '잉크탱크', value: '외장형' },
        { label: '잉크 구분', value: '무한 잉크' },

        // ─ 인쇄 기능 ─
        { group: '인쇄 기능' },
        { label: '자동양면인쇄', value: '○' },
        { label: '자동급지장치', value: '○' },

        // ─ 부가 기능 ─
        { group: '부가 기능' },
        { label: '다이렉트USB', value: '○' },

        // ─ 스마트 기능 ─
        { group: '스마트 기능' },
        { label: '모바일 프린팅', value: '○' },
        { label: '에어 프린팅',  value: '○' },

        // ─ 연결방식 ─
        { group: '연결방식' },
        { label: 'USB',          value: '○' },
        { label: 'Wi-Fi',        value: '○' },
        { label: '유선랜 (RJ-45)', value: '○' },

        // ─ 제품 사양 ─
        { group: '제품 사양' },
        { label: 'RAM',       value: '512 MB' },
        { label: '디스플레이', value: '터치스크린 LCD' },
      ],


      // 주요 특징 (아이콘 + 텍스트)
      features: [
        { icon: '⚡', title: '고속 출력',      desc: '흑백 22ppm·컬러 18ppm 빠른 인쇄' },
        { icon: '📱', title: '스마트 앱 지원', desc: 'HP Smart 앱으로 어디서나 인쇄·스캔' },
        { icon: '🔄', title: '자동 양면 인쇄', desc: '용지 절약, 자동 양면 인쇄·스캔 지원' },
        { icon: '🌐', title: '다중 연결',      desc: 'WiFi·유선LAN·USB 모든 연결 지원' },
        { icon: '🖥️', title: '터치스크린',    desc: '4.3인치 컬러 터치 LCD 탑재' },
        { icon: '📋', title: 'ADF 스캐너',    desc: '35매 자동 공급기로 대량 스캔 가능' },
      ],

      // 추천 대상
      recommend: ['가정·소호', '1~4인 소규모 사무실', '학원·학교', '재택근무'],

      // images 배열: [대표이미지, 서브이미지, 상세스펙이미지]
      images: [
        './images/hp9010_main.jpg',  // 대표 이미지
        './images/hp9010_sub.jpg',   // 서브 이미지
        './images/hp9010_spec.jpg',  // 상세 스펙 인포그래픽
      ],
      imageText: 'HP 9010',
      popular: true
    },

    {
      id: 'p002',
      category: 'inkjet',
      subCategory: 'inkjet-a4',
      name: 'HP OfficeJet Pro 9020 A4 컬러 잉크젯복합기',
      price: 45000,
      originalPrice: 60000,  // 정상가 60,000원 → 25% 할인
      badges: ['새상품', '컬러', '무상AS', '잉크무료'],
      badgeTypes: ['new', 'color', 'free-as', 'free-toner'],
      description: '9010 상위 모델. 500매 대용량 2단 급지, 빠른 출력속도(39ppm)와 모바일 연결로 중규모 사무실에 최적.',
      spec: 'A4 컬러 / 흑백·컬러 39ppm / 500매 2단 급지 / USB·WiFi·유선LAN / 양면인쇄',

      // 상세 스펙 테이블 — group: 섹션 헤더, label+value: 일반 행
      specDetail: [

        // ─ 상품 상세 정보 ─
        { group: '상품 상세 정보 제공' },
        { label: '제품구분',  value: '복합기' },
        { label: '인쇄 방식', value: '잉크젯' },
        { label: '제품분류',  value: '복합기 (잉크젯)' },
        { label: '출력 색상', value: '컬러 출력' },

        // ─ 복합기 기능 ─
        { group: '복합기 기능' },
        { label: '복사', value: '○' },
        { label: '스캔', value: '○' },
        { label: '팩스', value: '○' },

        // ─ 출력 ─
        { group: '출력' },
        { label: '컬러출력속도', value: '39ppm' },
        { label: '흑백출력속도', value: '39ppm' },
        { label: '첫 장 인쇄',  value: '9초 (컬러 10초)' },
        { label: '인쇄 해상도', value: '4800 × 1200 dpi' },

        // ─ 스캔 성능 ─
        { group: '스캔 성능' },
        { label: '광학 스캔 해상도', value: '1200 dpi' },

        // ─ 복사 성능 ─
        { group: '복사 성능' },
        { label: '컬러 복사속도',   value: '39ppm' },
        { label: '흑백 복사속도',   value: '39ppm' },
        { label: '연속복사',        value: '99매' },
        { label: '최대 복사 해상도', value: '600 × 600 dpi' },

        // ─ 팩스 성능 ─
        { group: '팩스 성능' },
        { label: 'PC 팩스',  value: '○' },
        { label: '팩스모뎀', value: '33.6 kbps' },

        // ─ 용지 사양 ─
        { group: '용지 사양' },
        { label: '용지투입 방향', value: '하단 용지함' },
        { label: '용지함 용량',  value: '500매' },
        { label: '최대 지원용지', value: 'A4 지원' },
        { label: '지원용지 무게', value: '60 ~ 280 g/m²' },

        // ─ 소모품 사양 ─
        { group: '소모품 사양' },
        { label: '잉크구분', value: '안료잉크' },
        { label: '잉크탱크', value: '외장형' },
        { label: '잉크 구분', value: '무한 잉크' },

        // ─ 인쇄 기능 ─
        { group: '인쇄 기능' },
        { label: '자동양면인쇄', value: '○' },
        { label: '자동급지장치', value: '○' },

        // ─ 스마트 기능 ─
        { group: '스마트 기능' },
        { label: '모바일 프린팅', value: '○' },
        { label: '에어 프린팅',  value: '○' },

        // ─ 연결방식 ─
        { group: '연결방식' },
        { label: 'USB',            value: '○' },
        { label: 'Wi-Fi',          value: '○' },
        { label: '유선랜 (RJ-45)', value: '○' },

        // ─ 제품 사양 ─
        { group: '제품 사양' },
        { label: 'RAM',         value: '512 MB' },
        { label: '디스플레이',  value: '터치스크린 LCD' },
        { label: '월 최대 인쇄량', value: '30,000매' },
      ],

      // 주요 특징
      features: [
        { icon: '⚡', title: '초고속 출력',    desc: '흑백·컬러 모두 39ppm 빠른 인쇄' },
        { icon: '📦', title: '대용량 급지',    desc: '500매 대용량 2단 용지함 탑재' },
        { icon: '📱', title: '스마트 모바일',  desc: 'HP Smart 앱으로 인쇄·스캔 원격 제어' },
        { icon: '🔄', title: '자동 양면 인쇄', desc: '용지 절약, 자동 양면 인쇄·복사 지원' },
        { icon: '🌐', title: '다중 연결',      desc: 'WiFi·유선LAN·USB 모든 연결 지원' },
        { icon: '🖥️', title: '터치스크린',    desc: '직관적인 터치스크린 LCD 탑재' },
      ],

      // 추천 대상
      recommend: ['중소규모 사무실', '4~10인 팀', '학원·교육기관', '인쇄량이 많은 업무'],

      // images 배열: [대표이미지, 서브이미지, 상세스펙인포그래픽]
      images: [
        './images/hp9020_main.jpg',  // 대표 이미지
        './images/hp9020_sub.jpg',   // 서브 이미지
        './images/hp9020_spec.jpg',  // 상세 스펙 인포그래픽
      ],
      imageText: 'HP 9020',
      popular: false
    },


    // === 잉크젯복합기 A3 ===
    {
      id: 'p003',
      category: 'inkjet',
      subCategory: 'inkjet-a3',
      name: 'HP OfficeJet Pro 7740 A3 와이드포맷 복합기',
      price: 50000,
      originalPrice: 70000,  // 정상가 70,000원 → 28% 할인
      badges: ['새상품', '컬러', '무상AS', '잉크무료'],
      badgeTypes: ['new', 'color', 'free-as', 'free-toner'],
      description: 'A3 와이드포맷 올인원 복합기. 도면·디자인·학원·대형 출력에 최적. 500매 대용량 급지 탑재. (3년 약정 / VAT 별도)',
      spec: 'A3 컬러 / 흑백 34ppm·컬러 34ppm / 500매 급지 / USB·WiFi·유선LAN / 양면인쇄',

      // 상세 스펙 테이블 — group: 섹션 헤더, label+value: 일반 행
      specDetail: [

        // ─ 상품 상세 정보 ─
        { group: '상품 상세 정보 제공' },
        { label: '제품구분',  value: '복합기' },
        { label: '인쇄 방식', value: '잉크젯' },
        { label: '제품분류',  value: '복합기 (잉크젯)' },
        { label: '출력 색상', value: '컬러 출력' },

        // ─ 복합기 기능 ─
        { group: '복합기 기능' },
        { label: '복사', value: '○' },
        { label: '스캔', value: '○' },
        { label: '팩스', value: '○' },

        // ─ 출력 ─
        { group: '출력' },
        { label: '컬러출력속도', value: '34ppm (17ipm)' },
        { label: '흑백출력속도', value: '34ppm (21ipm)' },
        { label: '첫 장 인쇄',  value: '9초 (컬러 10초)' },
        { label: '인쇄 해상도', value: '4800 × 1200 dpi' },

        // ─ 스캔 성능 ─
        { group: '스캔 성능' },
        { label: '광학 스캔 해상도', value: '1200 dpi' },

        // ─ 팩스 성능 ─
        { group: '팩스 성능' },
        { label: '컬러 팩스', value: '○' },
        { label: '흑백 팩스', value: '○' },

        // ─ 용지 / 소모품 ─
        { group: '용지 / 소모품' },
        { label: '용지투입 방향', value: '하단 용지함 투입' },
        { label: '용지함 용량',  value: '500매' },
        { label: '최대 지원용지', value: 'A3 지원' },
        { label: '카트리지 구성', value: '흑백 1 + 컬러 3' },

        // ─ 인쇄 기능 ─
        { group: '인쇄 기능' },
        { label: '자동양면인쇄', value: '○' },
        { label: '자동급지장치', value: '○' },

        // ─ 부가 기능 ─
        { group: '부가 기능' },
        { label: 'Mac 지원', value: '○' },

        // ─ 스마트 기능 ─
        { group: '스마트 기능' },
        { label: '에어 프린팅',   value: '○' },
        { label: '클라우드 프린팅', value: '○' },

        // ─ 연결방식 ─
        { group: '연결방식' },
        { label: 'USB',            value: '○' },
        { label: 'Wi-Fi',          value: '○' },
        { label: '유선랜 (RJ-45)', value: '○' },

        // ─ 제품 사양 ─
        { group: '제품 사양' },
        { label: 'RAM',         value: '512 MB' },
        { label: '디스플레이',  value: '터치스크린 LCD' },
        { label: '월 최대 인쇄량', value: '30,000매' },
        { label: '제품 크기',   value: '가로 584.2 × 세로 466.9 × 높이 383.5 mm' },
        { label: '무게',        value: '19.5 kg' },
      ],

      // 주요 특징
      features: [
        { icon: '📐', title: 'A3 와이드 출력',  desc: '최대 A3 용지 지원, 도면·포스터 인쇄' },
        { icon: '⚡', title: '고속 출력',        desc: '흑백·컬러 모두 34ppm 빠른 속도' },
        { icon: '📦', title: '대용량 급지',      desc: '500매 하단 용지함 탑재' },
        { icon: '🔄', title: '자동 양면 인쇄',  desc: '용지 절약, 자동 양면 인쇄·스캔 지원' },
        { icon: '☁️', title: '클라우드 연결',   desc: '에어프린팅·클라우드 프린팅 지원' },
        { icon: '💻', title: 'Mac 완벽 지원',   desc: 'Mac·iOS·Android 모두 지원' },
      ],

      // 추천 대상
      recommend: ['도면·설계 사무소', 'A3 출력이 필요한 학원', '디자인·인쇄 업체', '대형 서류 처리 팀'],

      // images 배열: [대표이미지, 추가이미지, 상세스펙인포그래픽]
      images: [
        './images/hp7740_main.jpg',  // 대표 이미지
        './images/hp7740_sub.jpg',   // 서브 이미지
        './images/hp7740_spec.jpg',  // 상세 스펙 인포그래픽
      ],
      imageText: 'HP 7740',
      popular: true
    },



    // === 레이저복합기 ===

    // ─ 캐논 C3922 ─
    {
      id: 'p004',
      category: 'laser',
      subCategory: 'laser-color-a3',
      name: '캐논 imageRUNNER ADVANCE DX C3922 컬러 레이저복합기',
      price: 70000,        // 기본형 시작가 (VAT 별도 / 3년 약정)
      originalPrice: 100000, // 기본형 정상가
      badges: ['새상품', '컬러', '무상AS', '토너무료'],
      badgeTypes: ['new', 'color', 'free-as', 'free-toner'],
      description: '출력 카운터 기반 요금제. 분당 22매 A3 컬러 레이저복합기. 70,000원~130,000원 / VAT 별도 / 3년 약정.',
      spec: 'A3 컬러 / 흑백 22ppm·컬러 22ppm / 스캔 70ipm / 터치패널',

      // 플랜별 요금 (동적 UI 렌더링에 사용)
      plans: [
        { label: '기본형', emoji: '🔹', origPrice: 100000, price: 70000,  bw: 1000, color: 100 },
        { label: '중형',   emoji: '🔶', origPrice: 130000, price: 95000,  bw: 3000, color: 300 },
        { label: '대형',   emoji: '🔴', origPrice: 170000, price: 130000, bw: 5000, color: 500 },
      ],

      specDetail: [
        { group: '📋 렌탈 요금 안내 (3년 약정 / VAT 별도)' },
        { label: '기본형 · 월 70,000원',  value: '흑백 1,000장 포함 (초과 장당 10원) / 컬러 100장 포함 (초과 장당 100원)' },
        { label: '중형   · 월 95,000원',  value: '흑백 3,000장 포함 (초과 장당 10원) / 컬러 300장 포함 (초과 장당 100원)' },
        { label: '대형   · 월 130,000원', value: '흑백 5,000장 포함 (초과 장당 10원) / 컬러 500장 포함 (초과 장당 100원)' },
        { group: '상품 상세 정보' },
        { label: '인쇄 방식', value: '레이저' },
        { label: '출력 색상', value: '컬러 출력' },
        { label: '지원 용지', value: '최대 A3' },
        { group: '출력 성능' },
        { label: '컬러출력속도', value: '22ppm (A4 기준)' },
        { label: '흑백출력속도', value: '22ppm (A4 기준)' },
        { label: '인쇄 해상도',  value: '1,200 × 1,200 dpi' },
        { group: '스캔 / 복사 성능' },
        { label: '스캔 속도', value: '최대 70ipm' },
        { label: '복사 속도', value: '22ppm' },
      ],

      features: [
        { icon: '🚀', title: '생산성',       desc: '분당 22매 고속 컬러 출력' },
        { icon: '✨', title: '고화질',       desc: '1,200×1,200dpi 고품질 인쇄' },
        { icon: '📱', title: '스마트 연결',  desc: '모바일 프린팅 및 클라우드 연동' },
        { icon: '📐', title: '최대 A3 지원', desc: '다양한 용지 사이즈 수용' },
      ],

      recommend: ['기업용 사무실', '중소 인쇄량 부서', '디자인·기획팀'],

      images: [
        './images/c3922_main.jpg',
        './images/c3922_sub.jpg',
        './images/c3922_spec.jpg',
      ],
      imageText: '캐논 C3922',
      popular: false
    },

    // ─ 캐논 C3926 ─
    {
      id: 'p006',
      category: 'laser',
      subCategory: 'laser-color-a3',
      name: '캐논 imageRUNNER ADVANCE DX C3926 컬러 레이저복합기',
      price: 75000,        // 기본형 시작가 (VAT 별도 / 3년 약정)
      originalPrice: 110000, // 기본형 정상가 → 약 32% 할인
      badges: ['새상품', '컬러', '무상AS', '토너무료'],
      badgeTypes: ['new', 'color', 'free-as', 'free-toner'],
      description: '출력 카운터 기반 요금제. 75,000원~140,000원 / VAT 별도 / 3년 약정. 10.1인치 터치패널·클라우드 연동.',
      spec: 'A3 컬러 / 흑백 26ppm·컬러 26ppm / 스캔 70ipm / 10.1인치 터치패널',

      // 플랜별 요금 (동적 UI 렌더링에 사용)
      plans: [
        { label: '기본형', emoji: '🔹', origPrice: 110000, price: 75000,  bw: 1000, color: 100 },
        { label: '중형',   emoji: '🔶', origPrice: 140000, price: 100000, bw: 3000, color: 300 },
        { label: '대형',   emoji: '🔴', origPrice: 180000, price: 140000, bw: 5000, color: 500 },
      ],

      // 상세 스펙 테이블
      specDetail: [

        // ─ 렌탈 요금 안내 ─
        { group: '📋 렌탈 요금 안내 (3년 약정 / VAT 별도)' },
        { label: '기본형 · 월 75,000원',  value: '흑백 1,000장 포함 (초과 시 장당 10원) / 컬러 100장 포함 (초과 시 장당 100원)' },
        { label: '중형   · 월 100,000원', value: '흑백 3,000장 포함 (초과 시 장당 10원) / 컬러 300장 포함 (초과 시 장당 100원)' },
        { label: '대형   · 월 140,000원', value: '흑백 5,000장 포함 (초과 시 장당 10원) / 컬러 500장 포함 (초과 시 장당 100원)' },

        // ─ 상품 상세 정보 ─
        { group: '상품 상세 정보 제공' },
        { label: '제품구분',  value: '복합기' },
        { label: '인쇄 방식', value: '레이저' },
        { label: '제품분류',  value: '복합기 (레이저)' },
        { label: '출력 색상', value: '컬러 출력' },
        { label: '지원 용지', value: '최대 A3 지원' },

        // ─ 복합기 기본 기능 ─
        { group: '복합기 기본 기능' },
        { label: '프린트', value: '○' },
        { label: '복사',   value: '○' },
        { label: '스캔',   value: '○' },
        { label: '송신',   value: '○' },

        // ─ 출력 성능 ─
        { group: '출력 성능' },
        { label: '컬러출력속도', value: '26ppm (A4 기준)' },
        { label: '흑백출력속도', value: '26ppm (A4 기준)' },
        { label: '인쇄 해상도',  value: '1,200 × 1,200 dpi' },

        // ─ 스캔/복사 성능 ─
        { group: '스캔 / 복사 성능' },
        { label: '스캔 속도',    value: '최대 70ipm (흑백/컬러 동일)' },
        { label: '복사 속도',    value: '26ppm' },
        { label: '복사 해상도',  value: '600 × 600 dpi' },

        // ─ 스마트 및 부가 기능 ─
        { group: '스마트 기능' },
        { label: '모바일 프린팅', value: '○' },
        { label: '클라우드 연동', value: '○' },

        // ─ 제품 사양 ─
        { group: '제품 사양' },
        { label: 'RAM',         value: '3.5 GB' },
        { label: '스토리지',    value: '256GB SSD (최대 1TB)' },
        { label: '디스플레이',  value: '10.1인치 TFT LCD 컬러 터치 패널' },
        { label: '예열 시간',   value: '10초 이하' },
        { label: '제품 크기',   value: '가로 565 × 세로 722 × 높이 897 mm' },
      ],

      // 주요 특징
      features: [
        { icon: '🚀', title: '생산성 향상',    desc: '분당 26매 출력 및 단면 최대 70매 스캔' },
        { icon: '✨', title: '고품질 해상도',  desc: '최대 1200x1200dpi 고화질 출력' },
        { icon: '📱', title: '스마트 연결',    desc: '모바일 프린팅 및 클라우드 서비스 연동' },
        { icon: '🖥️', title: '10.1인치 패널', desc: '스마트폰처럼 직관적인 대화면 터치 패널' },
        { icon: '📐', title: '폭넓은 용지 지원',desc: '다양한 사이즈(최대 A3) 및 용지 수용 가능' },
      ],

      // 추천 대상
      recommend: ['기업용 사무실', '대량 문서 출력 부서', '디자인 에이전시', '보안이 중요한 환경'],

      // images 배열: [대표이미지, 추가이미지, 상세스펙인포그래픽]
      images: [
        './images/c3926_main.jpg',
        './images/c3926_sub.jpg',
        './images/c3926_spec.jpg'
      ],
      imageText: '캐논 C3926',
      popular: true
    },

    // ─ 캐논 C3935i ─
    {
      id: 'p005',
      category: 'laser',
      subCategory: 'laser-color-a3',
      name: '캐논 imageRUNNER ADVANCE DX C3935i 컬러 레이저복합기',
      price: 90000,        // 기본형 시작가 (VAT 별도 / 3년 약정)
      originalPrice: 130000, // 기본형 정상가
      badges: ['새상품', '컬러', '무상AS', '토너무료'],
      badgeTypes: ['new', 'color', 'free-as', 'free-toner'],
      description: '출력 카운터 기반 요금제. 분당 35매 고속 A3 컬러 레이저복합기. 90,000원~150,000원 / VAT 별도 / 3년 약정.',
      spec: 'A3 컬러 / 흑백 35ppm·컬러 35ppm / 스캔 80ipm / 10.1인치 터치패널',

      // 플랜별 요금 (동적 UI 렌더링에 사용)
      plans: [
        { label: '기본형', emoji: '🔹', origPrice: 130000, price: 90000,  bw: 1000, color: 100 },
        { label: '중형',   emoji: '🔶', origPrice: 160000, price: 120000, bw: 3000, color: 300 },
        { label: '대형',   emoji: '🔴', origPrice: 200000, price: 150000, bw: 5000, color: 500 },
      ],

      specDetail: [
        { group: '📋 렌탈 요금 안내 (3년 약정 / VAT 별도)' },
        { label: '기본형 · 월 90,000원',  value: '흑백 1,000장 포함 (초과 장당 10원) / 컬러 100장 포함 (초과 장당 100원)' },
        { label: '중형   · 월 120,000원', value: '흑백 3,000장 포함 (초과 장당 10원) / 컬러 300장 포함 (초과 장당 100원)' },
        { label: '대형   · 월 150,000원', value: '흑백 5,000장 포함 (초과 장당 10원) / 컬러 500장 포함 (초과 장당 100원)' },
        { group: '상품 상세 정보' },
        { label: '인쇄 방식', value: '레이저' },
        { label: '출력 색상', value: '컬러 출력' },
        { label: '지원 용지', value: '최대 A3' },
        { group: '출력 성능' },
        { label: '컬러출력속도', value: '35ppm (A4 기준)' },
        { label: '흑백출력속도', value: '35ppm (A4 기준)' },
        { label: '인쇄 해상도',  value: '1,200 × 1,200 dpi' },
        { group: '스캔 / 복사 성능' },
        { label: '스캔 속도', value: '최대 80ipm' },
        { label: '복사 속도', value: '35ppm' },
        { group: '제품 사양' },
        { label: 'RAM',        value: '3.5 GB' },
        { label: '스토리지',   value: '256GB SSD' },
        { label: '디스플레이', value: '10.1인치 TFT LCD 컬러 터치 패널' },
      ],

      features: [
        { icon: '🚀', title: '고속 출력',       desc: '분당 35매 A3 컬러 고속 인쇄' },
        { icon: '✨', title: '고화질',          desc: '1,200×1,200dpi 선명한 출력' },
        { icon: '📱', title: '스마트 연결',     desc: '모바일 프린팅 및 클라우드 연동' },
        { icon: '🖥️', title: '10.1인치 패널',  desc: '직관적인 대화면 터치 패널' },
        { icon: '📐', title: '최대 A3 지원',    desc: '대형 용지까지 폭넓게 지원' },
      ],

      recommend: ['대용량 출력 기업', '법무·회계·컨설팅', '디자인 에이전시', '의료·금융 기관'],

      images: [
        './images/c3935i_main.jpeg',
        './images/c3935i_sub.jpeg',
        './images/c3935_spec.jpg',
      ],
      imageText: '캐논 C3935i',
      popular: false
    },

    // === 문서세단기 ===
    // === 문서세단기 ===
    {
      id: 'p012',
      category: 'doc',
      subCategory: 'doc-shredder',
      name: '현대오피스 페이퍼프랜드 PK-612X 소형 문서세단기',
      price: 15000,
      originalPrice: 20000,
      badges: ['새상품', '소형', '꽃가루형'],
      badgeTypes: ['new', 'color', 'free-as'],
      description: '가정 및 소형 사무실에 적합한 컴팩트 전동 문서세단기. 카드 및 CD 파쇄 지원.',
      spec: '1회 6매 / 꽃가루형(4x35mm) / 12.5L 파지함 / 카드·CD 파쇄',

      // 상세 스펙 테이블
      specDetail: [
        { group: '기본 사양' },
        { label: '제품 분류', value: '전동식 문서세단기' },
        { label: '사용 용도', value: '소형 / 가정용' },
        { label: '세단 방식', value: '꽃가루형 (크로스컷)' },
        { label: '세단 크기', value: '4 × 35 mm' },

        { group: '세단 성능' },
        { label: '1회 최대 세단', value: '6매 (A4 기준)' },
        { label: '투입 폭',       value: '220mm (A4 규격)' },
        { label: '파지함 용량',   value: '12.5L' },
        { label: '세단 가능 품목',value: '종이, CD, 신용카드, 스테이플러 심' },

        { group: '기타 기능 및 규격' },
        { label: '안전 기능',     value: '모터 과열 방지, 파지량 감지' },
        { label: '부가 기능',     value: '역회전 기능' },
        { label: '제품 크기',     value: '가로 30.8 × 세로 16.4 × 높이 34.1 cm' },
        { label: '무게',          value: '약 2.93 kg' },
      ],

      features: [
        { icon: '🔒', title: '강력한 보안', desc: '4x35mm 꽃가루형 세단으로 정보 유출 방지' },
        { icon: '💳', title: '다양한 매체 파쇄', desc: '종이뿐만 아니라 CD, 신용카드까지 세단 가능' },
        { icon: '🔥', title: '과열 방지 시스템', desc: '모터 과열 시 자동 정지하여 안전성 확보' },
        { icon: '🏠', title: '컴팩트 사이즈', desc: '공간을 많이 차지하지 않는 12.5L 소형 디자인' },
      ],
      recommend: ['가정용', '1~3인 소형 사무실', '개인 정보 보호가 필요한 곳'],

      images: [
        './images/pk612x_main.jpg',
        './images/pk612x_sub.jpg',
        './images/pk612x_spec.jpg'
      ],
      imageText: '현대오피스 PK-612X',
      popular: true
    },
    {
      id: 'p013',
      category: 'doc',
      subCategory: 'doc-shredder',
      name: '현대오피스 페이퍼프랜드 PK-7100CD 중형 문서세단기',
      price: 25000,
      originalPrice: 35000,
      badges: ['새상품', '중형', '저소음'],
      badgeTypes: ['new', 'color', 'free-toner'],
      description: '중형 사무실에 최적화된 저소음 고성능 문서세단기. 1회 15매 강력 세단.',
      spec: '1회 15매 / 꽃가루형(4x40mm) / 21L 파지함 / 저소음(52dB)',

      specDetail: [
        { group: '기본 사양' },
        { label: '제품 분류', value: '전동식 문서세단기' },
        { label: '사용 용도', value: '중형 / 사무용' },
        { label: '세단 방식', value: '꽃가루형 (크로스컷)' },
        { label: '세단 크기', value: '4 × 40 mm' },

        { group: '세단 성능' },
        { label: '1회 최대 세단', value: '15매 (A4 기준)' },
        { label: '투입 폭',       value: '220mm (A4 규격)' },
        { label: '파지함 용량',   value: '21L' },
        { label: '소음',          value: '52dB (저소음 설계)' },
        { label: '세단 가능 품목',value: '종이, CD, 신용카드, 스테이플러 심' },

        { group: '기타 기능 및 규격' },
        { label: '부가 기능',     value: '파지량 감지, 역회전 기능, 이동식 바퀴' },
        { label: '제품 크기',     value: '가로 36.0 × 세로 23.8 × 높이 51.4 cm' },
        { label: '무게',          value: '8.6 kg' },
      ],

      features: [
        { icon: '💪', title: '강력한 세단력', desc: '1회 최대 15매 동시 세단으로 업무 효율 극대화' },
        { icon: '🔇', title: '저소음 설계', desc: '52dB의 쾌적한 저소음으로 사무실 내 사용 적합' },
        { icon: '📦', title: '대용량 파지함', desc: '21L의 넉넉한 용량으로 자주 비울 필요 없음' },
        { icon: '🛞', title: '이동의 편리함', desc: '바퀴가 장착되어 원하는 곳으로 손쉽게 이동 가능' },
      ],
      recommend: ['중소규모 사무실', '문서 폐기량이 많은 부서', '조용한 환경이 필요한 곳'],

      images: [
        './images/pk7100cd_main.jpg',
        './images/pk7100cd_sub.jpg',
        './images/pk7100cd_spec.jpg'
      ],
      imageText: '현대오피스 PK-7100CD',
      popular: true
    },

    // === 컴퓨터·노트북 ===
    {
      id: 'p014',
      category: 'pc',
      subCategory: 'pc-notebook',
      name: '삼성 갤럭시북3 Pro 360 노트북',
      price: 65000,
      originalPrice: 85000,
      badges: ['새상품', '무상AS'],
      badgeTypes: ['new', 'free-as'],
      description: '2-in-1 터치스크린 프리미엄 비즈니스 노트북.',
      spec: 'i7-1360P / 16GB / SSD 512GB / 16인치 AMOLED',
      imageText: '갤럭시북3+Pro',
      popular: true
    },
    {
      id: 'p015',
      category: 'pc',
      subCategory: 'pc-notebook',
      name: 'LG 그램 17인치 노트북',
      price: 68000,
      originalPrice: 90000,
      badges: ['새상품', '무상AS'],
      badgeTypes: ['new', 'free-as'],
      description: '초경량 대화면 비즈니스 노트북.',
      spec: 'i5-1340P / 16GB / SSD 512GB / 17인치 IPS',
      imageText: 'LG+그램+17',
      popular: true
    },
    {
      id: 'p016',
      category: 'pc',
      subCategory: 'pc-desktop',
      name: '삼성 데스크탑 DM700A4J 올인원 PC',
      price: 42000,
      originalPrice: 58000,
      badges: ['새상품', '무상AS'],
      badgeTypes: ['new', 'free-as'],
      description: '슬림 올인원 사무용 데스크탑.',
      spec: 'i5-1235U / 16GB / SSD 256GB / 23.8인치',
      imageText: '삼성+DM700A4J',
      popular: false
    }
  ],

  // ── 카테고리 ID로 카테고리 정보 조회 ───────────────
  getCategoryById(id) {
    return this.categories.find(c => c.id === id) || this.categories[0];
  },

  // ── 카테고리로 상품 필터링 ──────────────────────────
  getProductsByCategory(categoryId) {
    if (!categoryId || categoryId === 'all') return this.products;
    return this.products.filter(p => p.category === categoryId);
  },

  // ── 서브카테고리로 필터링 ───────────────────────────
  getProductsBySubCategory(subCategoryId) {
    if (!subCategoryId) return this.products;
    return this.products.filter(p => p.subCategory === subCategoryId);
  },

  // ── 카테고리 이모지 헬퍼 ────────────────────────────
  getCatEmoji(catId) {
    const map = {
      inkjet: '🖨️', laser: '📠', doc: '✂️',
      pc: '💻'
    };
    return map[catId] || '🖨️';
  },

  // ── 뱃지 색상 매핑 ──────────────────────────────────
  getBadgeClass(type) {
    const map = {
      'new': 'badge-new',
      'color': 'badge-color',
      'mono': 'badge-mono',
      'free-as': 'badge-free-as',
      'free-toner': 'badge-free-toner',
    };
    return map[type] || 'badge-new';
  },

  // ── 가격 포매팅 ─────────────────────────────────────
  formatPrice(price) {
    return price.toLocaleString('ko-KR');
  }
};
