document.addEventListener('DOMContentLoaded', () => {

  // ──────────────────────────────────────────────────────
  // 1. SPA 라우팅: 메뉴 클릭 시 해당 섹션 표시
  // ──────────────────────────────────────────────────────
  const menuItems     = document.querySelectorAll('.menu-item[data-page]');
  const pageSections  = document.querySelectorAll('.page-section');

  function showPage(pageId) {
    pageSections.forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`page-${pageId}`);
    if (target) target.classList.add('active');

    menuItems.forEach(item => {
      item.classList.toggle('active', item.dataset.page === pageId);
    });

    if (window.innerWidth <= 768) {
      document.getElementById('sidebar').classList.remove('active');
    }
  }
  window.showPage = showPage;

  menuItems.forEach(item => {
    item.addEventListener('click', () => showPage(item.dataset.page));
  });

  // ──────────────────────────────────────────────────────
  // 2. 사이드바 토글 (모바일)
  // ──────────────────────────────────────────────────────
  const menuToggle = document.getElementById('menuToggle');
  const sidebar    = document.getElementById('sidebar');
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('active'));
  }

  // ──────────────────────────────────────────────────────
  // 3. 대시보드 홈 통계 카운트업 애니메이션
  // ──────────────────────────────────────────────────────
  const stats = {
    'stat-clients':  24,
    'stat-rentals':  38,
    'stat-consult':   7,
    'stat-members':  142
  };

  function countUp(el, target, duration = 1200) {
    let start = 0;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      el.textContent = Math.floor(progress * target).toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  Object.entries(stats).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) countUp(el, val);
  });

  // ──────────────────────────────────────────────────────
  // 4. 홈 최근 내역 테이블 더미 데이터
  // ──────────────────────────────────────────────────────
  const recentData = [
    { type:'렌탈 상담', name:'(주)미래소프트',  detail:'캐논 C3922 컬러복합기',     date:'2024.09.09', status:'pending',   label:'처리 중' },
    { type:'견적 문의', name:'강동구 A학원',    detail:'렌탈 맞춤 견적 요청',        date:'2024.09.08', status:'pending',   label:'대기 중' },
    { type:'임대 계약', name:'홍○○',          detail:'HP OfficeJet Pro 9010',    date:'2024.09.07', status:'completed', label:'완료'   },
    { type:'상담 문의', name:'이○○',          detail:'잉크젯 vs 레이저 비교 상담', date:'2024.09.06', status:'completed', label:'완료'   },
    { type:'임대 계약', name:'(주)ABC상사',     detail:'현대오피스 PK-612X',       date:'2024.09.05', status:'cancelled', label:'취소'   },
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


  // ══════════════════════════════════════════════════════
  //   렌탈 견적서 작성 모듈
  // ══════════════════════════════════════════════════════

  // 기기 목록 (각 기기별 데이터 배열)
  let devices = [];

  // 오늘 날짜 기본값 설정
  const today    = new Date().toISOString().split('T')[0];
  const expiryDt = new Date();
  expiryDt.setDate(expiryDt.getDate() + 30);
  const expiry   = expiryDt.toISOString().split('T')[0];
  document.getElementById('qDate')  && (document.getElementById('qDate').value   = today);
  document.getElementById('qExpiry') && (document.getElementById('qExpiry').value = expiry);

  // 기기 추가 (초기 기기 1개 포함)
  function addDevice() {
    const idx = devices.length;
    devices.push({
      name: '',       // 기기명
      model: '',      // 모델명
      spec: '',       // 사양/특징
      qty: 1,         // 수량
      billingType: 'meter',   // meter: 출력량 과금형 / flat: 월정액형
      monthlyRent: 0, // 월 임대료 (1대)
      deposit: 0,     // 보증금 (대당)
      bwLimit: 0,     // 흑백 기본사용량
      colorLimit: 0,  // 컬러 기본사용량
      bwOver: 0,      // 흑백 초과 단가
      colorOver: 0,   // 컬러 초과 단가
      note: ''        // 비고
    });
    renderDeviceForms();
    updatePreview();
  }
  window.addDevice = addDevice;

  // 기기 삭제
  function removeDevice(idx) {
    devices.splice(idx, 1);
    renderDeviceForms();
    updatePreview();
  }
  window.removeDevice = removeDevice;

  // 과금 유형 전환
  function setBillingType(idx, type) {
    devices[idx].billingType = type;
    renderDeviceForms();
    updatePreview();
  }
  window.setBillingType = setBillingType;

  // 기기 필드값 동기화
  function syncDevice(idx, field, value) {
    devices[idx][field] = value;
    updatePreview();
  }
  window.syncDevice = syncDevice;

  // 기기 입력 폼 렌더링
  function renderDeviceForms() {
    const container = document.getElementById('deviceFormList');
    if (!container) return;

    container.innerHTML = devices.map((d, i) => `
      <div class="device-form-card">
        <div class="device-form-card-header">
          <span class="device-form-card-title">기기 ${i + 1}</span>
          <button class="btn-remove-device" onclick="removeDevice(${i})"><i class="fa fa-times"></i> 삭제</button>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>기기명</label>
            <input type="text" value="${d.name}" placeholder="예) 신도 D420" oninput="syncDevice(${i},'name',this.value)">
          </div>
          <div class="form-group">
            <label>모델명</label>
            <input type="text" value="${d.model}" placeholder="예) A3 컬러 레이저" oninput="syncDevice(${i},'model',this.value)">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>사양/특징</label>
            <input type="text" value="${d.spec}" placeholder="예) 출력량 과금형" oninput="syncDevice(${i},'spec',this.value)">
          </div>
          <div class="form-group">
            <label>수량 (대)</label>
            <input type="number" value="${d.qty}" min="1" oninput="syncDevice(${i},'qty',+this.value)">
          </div>
        </div>

        <!-- 과금 유형 -->
        <label style="font-size:12px;color:var(--text-muted);font-weight:500;">과금 유형</label>
        <div class="billing-type-wrap" style="margin-top:4px;">
          <button class="billing-type-btn ${d.billingType==='meter'?'active':''}" onclick="setBillingType(${i},'meter')">출력량 과금형</button>
          <button class="billing-type-btn ${d.billingType==='flat'?'active':''}"  onclick="setBillingType(${i},'flat')">월정액형</button>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>월 임대료 (1대, 원)</label>
            <input type="number" value="${d.monthlyRent}" oninput="syncDevice(${i},'monthlyRent',+this.value)">
          </div>
          <div class="form-group">
            <label>보증금 (대당, 원)</label>
            <input type="number" value="${d.deposit}" oninput="syncDevice(${i},'deposit',+this.value)">
          </div>
        </div>

        ${d.billingType === 'meter' ? `
        <div class="form-row">
          <div class="form-group">
            <label>흑백 기본사용량 (매/월)</label>
            <input type="number" value="${d.bwLimit}" oninput="syncDevice(${i},'bwLimit',+this.value)">
          </div>
          <div class="form-group">
            <label>흑백 초과 단가 (원/매)</label>
            <input type="number" value="${d.bwOver}" oninput="syncDevice(${i},'bwOver',+this.value)">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>컬러 기본사용량 (매/월)</label>
            <input type="number" value="${d.colorLimit}" oninput="syncDevice(${i},'colorLimit',+this.value)">
          </div>
          <div class="form-group">
            <label>컬러 초과 단가 (원/매)</label>
            <input type="number" value="${d.colorOver}" oninput="syncDevice(${i},'colorOver',+this.value)">
          </div>
        </div>
        ` : ''}

        <div class="form-group">
          <label>비고</label>
          <input type="text" value="${d.note}" placeholder="예) 팩스 옵션 필요" oninput="syncDevice(${i},'note',this.value)">
        </div>
      </div>
    `).join('');
  }

  // 숫자 → 원화 포맷
  function fmt(n) {
    return Number(n || 0).toLocaleString('ko-KR');
  }

  // 월 납부액 계산 (부가세 10% 포함)
  function calcTotal() {
    const supply = devices.reduce((sum, d) => sum + (d.monthlyRent * d.qty), 0);
    const vat    = Math.round(supply * 0.1);
    const total  = supply + vat;
    return { supply, vat, total };
  }

  // 견적서 미리보기 HTML 생성 (이미지와 동일한 레이아웃)
  function renderPreviewHTML() {
    const qNo    = document.getElementById('qNo')?.value    || '';
    const qDate  = document.getElementById('qDate')?.value  || '';
    const qRecv  = document.getElementById('qReceiver')?.value || '';
    const qExp   = document.getElementById('qExpiry')?.value || '';
    const qPer   = document.getElementById('qPeriod')?.value  || '36';
    const qVat   = document.getElementById('qVat')?.value    || '별도';
    const qInst  = document.getElementById('qInstallPlace')?.value || '거래처 지정 장소';
    const qSName = document.getElementById('qSupName')?.value  || '';
    const qSCeo  = document.getElementById('qSupCeo')?.value   || '';
    const qSAddr = document.getElementById('qSupAddr')?.value  || '';
    const qSTel  = document.getElementById('qSupTel')?.value   || '';
    const qSFax  = document.getElementById('qSupFax')?.value   || '';
    const qDepo  = document.getElementById('qDeposit')?.value  || '0';
    const qMaint = document.getElementById('qMaintenance')?.value || '';
    const { supply, vat, total } = calcTotal();

    // 기기 블록 HTML
    const deviceBlocksHtml = devices.map((d, i) => {
      const totalRent  = d.monthlyRent * d.qty;
      const depositAmt = d.deposit    * d.qty;

      return `
        <div style="margin-bottom:14px;">
          <div style="background:#e8f4fc;padding:6px 10px;border-left:3px solid #1a8fc1;">
            <span style="font-size:10px;color:#555;">기기 ${i + 1}</span><br>
            <strong style="font-size:13px;">${d.name || '-'}</strong>
            <span style="float:right;font-size:11px;font-weight:700;">수량 ${d.qty}대</span>
            <div style="clear:both;"></div>
            ${d.model ? `<div style="font-size:10px;color:#555;">${d.model}</div>` : ''}
            ${d.spec  ? `<div style="font-size:10px;color:#555;">${d.spec}</div>`  : ''}
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:4px;">
            <tr>
              <td style="border:1px solid #cce0ec;padding:5px 8px;background:#f0f9ff;width:50%;">
                월 임대료(1대) <strong>${fmt(d.monthlyRent)}원</strong>
              </td>
              <td style="border:1px solid #cce0ec;padding:5px 8px;background:#f0f9ff;width:50%;">
                ${d.billingType === 'meter'
                  ? `월 기본요금 ${qPer}개월분 <strong>${fmt(d.monthlyRent * Number(qPer))}원/대</strong>`
                  : `보증금 <strong>${d.deposit > 0 ? fmt(d.deposit) + '원' : '없음'}</strong>`
                }
              </td>
            </tr>
          </table>
          ${d.billingType === 'meter' ? `
          <table style="width:100%;border-collapse:collapse;font-size:10px;">
            <tr style="background:#dceefa;">
              <td style="border:1px solid #cce0ec;padding:4px 8px;"><strong>출력 구분</strong></td>
              <td style="border:1px solid #cce0ec;padding:4px 8px;"><strong>월 기본사용량</strong></td>
              <td style="border:1px solid #cce0ec;padding:4px 8px;"><strong>초과 1매당 요금</strong></td>
            </tr>
            ${d.colorLimit > 0 ? `
            <tr>
              <td style="border:1px solid #cce0ec;padding:4px 8px;">컬러(A4)</td>
              <td style="border:1px solid #cce0ec;padding:4px 8px;">${fmt(d.colorLimit)}매</td>
              <td style="border:1px solid #cce0ec;padding:4px 8px;">${fmt(d.colorOver)}원</td>
            </tr>` : ''}
            ${d.bwLimit > 0 ? `
            <tr>
              <td style="border:1px solid #cce0ec;padding:4px 8px;">흑백(A4)</td>
              <td style="border:1px solid #cce0ec;padding:4px 8px;">${fmt(d.bwLimit)}매</td>
              <td style="border:1px solid #cce0ec;padding:4px 8px;">${fmt(d.bwOver)}원</td>
            </tr>` : ''}
          </table>
          ` : ''}
          ${d.note ? `<div style="font-size:10px;color:#777;padding:4px 8px;border:1px solid #cce0ec;border-top:0;">비고: ${d.note}</div>` : ''}
        </div>
      `;
    }).join('');

    return `
      <div style="font-family:'맑은 고딕','Malgun Gothic',sans-serif;font-size:11px;color:#222;line-height:1.5;">
        
        <!-- 상단: 왼쪽 견적 정보 + 오른쪽 제목+공급자 -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
          <tr>
            <!-- 왼쪽 -->
            <td style="width:40%;vertical-align:top;padding-right:12px;">
              <table style="width:100%;border-collapse:collapse;font-size:10px;">
                <tr>
                  <td style="border:1px solid #aadce8;padding:4px 8px;background:#e8f4fc;width:35%;"><strong>Page</strong></td>
                  <td style="border:1px solid #aadce8;padding:4px 8px;">1 / 1</td>
                </tr>
                <tr>
                  <td style="border:1px solid #aadce8;padding:4px 8px;background:#e8f4fc;"><strong>견적번호</strong></td>
                  <td style="border:1px solid #aadce8;padding:4px 8px;color:#1a8fc1;">${qNo}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #aadce8;padding:4px 8px;background:#e8f4fc;"><strong>견적일자</strong></td>
                  <td style="border:1px solid #aadce8;padding:4px 8px;">${qDate}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #aadce8;padding:4px 8px;background:#e8f4fc;"><strong>수신</strong></td>
                  <td style="border:1px solid #aadce8;padding:4px 8px;"><strong>${qRecv}</strong></td>
                </tr>
              </table>
              <div style="margin-top:10px;padding:8px;border:2px solid #1a8fc1;border-radius:4px;text-align:center;">
                <div style="font-size:10px;color:#555;">월 납부액</div>
                <div style="font-size:18px;font-weight:900;color:#222;">${fmt(total)}원</div>
              </div>
            </td>
            <!-- 오른쪽 -->
            <td style="width:60%;vertical-align:top;">
              <div style="text-align:center;margin-bottom:8px;">
                <div style="font-size:22px;font-weight:900;letter-spacing:-0.5px;">렌탈 견적서</div>
                <div style="font-size:10px;color:#555;">사무기기 임대조건</div>
              </div>
              <table style="width:100%;border-collapse:collapse;font-size:10px;">
                <tr>
                  <td style="border:1px solid #aadce8;padding:4px 6px;background:#e8f4fc;width:20%;"><strong>상호</strong></td>
                  <td style="border:1px solid #aadce8;padding:4px 6px;width:30%;">${qSName}</td>
                  <td style="border:1px solid #aadce8;padding:4px 6px;background:#e8f4fc;width:20%;"><strong>성명</strong></td>
                  <td style="border:1px solid #aadce8;padding:4px 6px;">${qSCeo} (인)</td>
                </tr>
                <tr>
                  <td style="border:1px solid #aadce8;padding:4px 6px;background:#e8f4fc;"><strong>주소</strong></td>
                  <td colspan="3" style="border:1px solid #aadce8;padding:4px 6px;">${qSAddr}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #aadce8;padding:4px 6px;background:#e8f4fc;"><strong>전화</strong></td>
                  <td style="border:1px solid #aadce8;padding:4px 6px;">${qSTel}</td>
                  <td style="border:1px solid #aadce8;padding:4px 6px;background:#e8f4fc;"><strong>팩스</strong></td>
                  <td style="border:1px solid #aadce8;padding:4px 6px;">${qSFax}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- 계약 조건 행 -->
        <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:14px;">
          <tr style="background:#dceefa;text-align:center;">
            <td style="border:1px solid #aadce8;padding:5px;"><strong>월 계약기간</strong></td>
            <td style="border:1px solid #aadce8;padding:5px;"><strong>부가세</strong></td>
            <td style="border:1px solid #aadce8;padding:5px;"><strong>견적 유효일</strong></td>
            <td style="border:1px solid #aadce8;padding:5px;"><strong>설치장소</strong></td>
          </tr>
          <tr style="text-align:center;">
            <td style="border:1px solid #aadce8;padding:5px;">${qPer}개월</td>
            <td style="border:1px solid #aadce8;padding:5px;">부가세 ${qVat}</td>
            <td style="border:1px solid #aadce8;padding:5px;">${qExp}</td>
            <td style="border:1px solid #aadce8;padding:5px;">${qInst}</td>
          </tr>
        </table>

        <!-- 기기 블록들 -->
        ${deviceBlocksHtml || `
          <div style="text-align:center;padding:30px;color:#aaa;border:1px dashed #ccc;border-radius:4px;margin-bottom:14px;">
            좌측에서 기기를 추가해 주세요
          </div>
        `}

        <!-- 합계 -->
        <table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:10px;">
          <tr>
            <td style="width:55%;vertical-align:top;padding-right:10px;">
              <div style="border:1px solid #aadce8;padding:8px;background:#f0f9ff;border-radius:4px;">
                <div style="font-size:10px;font-weight:700;color:#1a8fc1;margin-bottom:6px;">유지보수 조건</div>
                <div style="font-size:10px;color:#555;white-space:pre-wrap;">${qMaint}</div>
                <div style="font-size:9px;color:#888;margin-top:6px;">출력량 과금형 기기의 추가 사용료는 월 기본사용량 초과분에 따라 별도 정산됩니다.</div>
              </div>
            </td>
            <td style="width:45%;vertical-align:top;">
              <table style="width:100%;border-collapse:collapse;font-size:10px;">
                <tr>
                  <td style="border:1px solid #aadce8;padding:5px 8px;background:#e8f4fc;"><strong>임대보증금</strong></td>
                  <td style="border:1px solid #aadce8;padding:5px 8px;text-align:right;">${fmt(qDepo)}원</td>
                </tr>
                <tr>
                  <td style="border:1px solid #aadce8;padding:5px 8px;background:#e8f4fc;"><strong>월 공급가액</strong></td>
                  <td style="border:1px solid #aadce8;padding:5px 8px;text-align:right;">${fmt(supply)}원</td>
                </tr>
                <tr>
                  <td style="border:1px solid #aadce8;padding:5px 8px;background:#e8f4fc;"><strong>월 부가세</strong></td>
                  <td style="border:1px solid #aadce8;padding:5px 8px;text-align:right;">${fmt(vat)}원</td>
                </tr>
                <tr style="background:#dceefa;">
                  <td style="border:1px solid #aadce8;padding:7px 8px;"><strong>월 납부액</strong></td>
                  <td style="border:1px solid #aadce8;padding:7px 8px;text-align:right;font-size:13px;font-weight:900;">${fmt(total)}원</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <div style="margin-top:12px;font-size:9px;color:#aaa;text-align:center;">
          본 견적서는 ${qExp}까지 유효하며, 실제 계약 시 세부 조건이 변경될 수 있습니다.
        </div>
      </div>
    `;
  }

  // 미리보기 업데이트
  function updatePreview() {
    const preview = document.getElementById('quotePreview');
    if (preview) preview.innerHTML = renderPreviewHTML();
  }
  window.updatePreview = updatePreview;

  // 인쇄 / PDF 출력
  function printQuote() {
    const html = renderPreviewHTML();
    // 새 창에서 견적서만 인쇄
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>렌탈 견적서</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: '맑은 고딕','Malgun Gothic',sans-serif; font-size:11px; color:#222; background:#fff; }
        </style>
      </head>
      <body onload="window.print();">
        ${html}
      </body>
      </html>
    `);
    win.document.close();
  }
  window.printQuote = printQuote;

  // 초기화
  function resetQuote() {
    if (!confirm('견적서를 초기화하시겠습니까?')) return;
    devices = [];
    renderDeviceForms();
    updatePreview();
  }
  window.resetQuote = resetQuote;

  // 페이지 로드 시 기본 기기 1개 추가 및 초기 미리보기 렌더링
  addDevice();
  updatePreview();


  // ══════════════════════════════════════════════════════
  //   거래명세서 작성 모듈
  // ══════════════════════════════════════════════════════

  // 총 20행(빈 행 포함) 고정 표시
  const ST_TOTAL_ROWS = 20;

  // 품목 행 데이터 배열
  let stItems = [];

  // 오늘 날짜 기본값
  const stDateEl = document.getElementById('stDate');
  if (stDateEl) stDateEl.value = new Date().toISOString().split('T')[0];

  // 품목 행 추가
  function stAddRow() {
    stItems.push({ date: '', code: '', name: '', spec: '', qty: '', price: '' });
    stRenderItems();
    stUpdatePreview();
  }
  window.stAddRow = stAddRow;

  // 품목 행 삭제
  function stRemoveRow(idx) {
    stItems.splice(idx, 1);
    stRenderItems();
    stUpdatePreview();
  }
  window.stRemoveRow = stRemoveRow;

  // 품목 필드값 동기화
  function stSyncItem(idx, field, value) {
    stItems[idx][field] = value;
    stUpdatePreview();
  }
  window.stSyncItem = stSyncItem;

  // 폼 내 품목 행 렌더링
  function stRenderItems() {
    const container = document.getElementById('stItemList');
    if (!container) return;

    container.innerHTML = stItems.map((item, i) => `
      <div class="device-form-card" style="padding:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span class="device-form-card-title">품목 ${i + 1}</span>
          <button class="btn-remove-device" onclick="stRemoveRow(${i})"><i class="fa fa-times"></i></button>
        </div>
        <div class="form-row">
          <div class="form-group" style="max-width:80px;">
            <label>월일</label>
            <input type="text" value="${item.date}" placeholder="08-07" oninput="stSyncItem(${i},'date',this.value)">
          </div>
          <div class="form-group" style="max-width:90px;">
            <label>품목코드</label>
            <input type="text" value="${item.code}" placeholder="0001" oninput="stSyncItem(${i},'code',this.value)">
          </div>
          <div class="form-group">
            <label>품목명</label>
            <input type="text" value="${item.name}" placeholder="품목명 입력" oninput="stSyncItem(${i},'name',this.value)">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>규격</label>
            <input type="text" value="${item.spec}" placeholder="규격" oninput="stSyncItem(${i},'spec',this.value)">
          </div>
          <div class="form-group" style="max-width:80px;">
            <label>수량</label>
            <input type="number" value="${item.qty}" placeholder="0" oninput="stSyncItem(${i},'qty',this.value)">
          </div>
          <div class="form-group">
            <label>단가 (원)</label>
            <input type="number" value="${item.price}" placeholder="0" oninput="stSyncItem(${i},'price',this.value)">
          </div>
        </div>
      </div>
    `).join('');
  }

  // 숫자 포맷
  function stFmt(n) {
    return Number(n || 0).toLocaleString('ko-KR');
  }

  // 거래명세서 미리보기 HTML 생성 (이미지 양식과 동일한 레이아웃)
  function stRenderPreviewHTML() {
    const stDate    = document.getElementById('stDate')?.value       || '';
    const stClient  = document.getElementById('stClient')?.value     || '';
    const stSName   = document.getElementById('stSupName')?.value    || '';
    const stSCeo    = document.getElementById('stSupCeo')?.value     || '';
    const stSAddr   = document.getElementById('stSupAddr')?.value    || '';
    const stSBiz    = document.getElementById('stSupBiz')?.value     || '';
    const stSType   = document.getElementById('stSupType')?.value    || '';
    const stSTel    = document.getElementById('stSupTel')?.value     || '';
    const stSFax    = document.getElementById('stSupFax')?.value     || '';
    const prevBal   = Number(document.getElementById('stPrevBalance')?.value || 0);
    const payment   = Number(document.getElementById('stPayment')?.value    || 0);
    const bankInfo  = document.getElementById('stBankInfo')?.value   || '';

    // 계산
    let totalQty    = 0;
    let totalSupply = 0;
    stItems.forEach(item => {
      const q = Number(item.qty   || 0);
      const p = Number(item.price || 0);
      totalQty    += q;
      totalSupply += q * p;
    });
    const totalVat   = Math.round(totalSupply * 0.1);
    const totalAmt   = totalSupply + totalVat;
    const totalBal   = prevBal + totalAmt - payment;

    // 행 목록 (데이터 행 + 빈 행으로 총 ST_TOTAL_ROWS 행 채움)
    const dataRows = stItems.map(item => {
      const q = Number(item.qty   || 0);
      const p = Number(item.price || 0);
      const supply = q * p;
      const vat    = Math.round(supply * 0.1);
      return `
        <tr>
          <td style="border:1px solid #9ed8e8;padding:3px 4px;text-align:center;">${item.date}</td>
          <td style="border:1px solid #9ed8e8;padding:3px 4px;text-align:center;">${item.code}</td>
          <td style="border:1px solid #9ed8e8;padding:3px 4px;">${item.name}</td>
          <td style="border:1px solid #9ed8e8;padding:3px 4px;text-align:center;">${item.spec}</td>
          <td style="border:1px solid #9ed8e8;padding:3px 4px;text-align:right;">${q > 0 ? stFmt(q) : ''}</td>
          <td style="border:1px solid #9ed8e8;padding:3px 4px;text-align:right;">${p > 0 ? stFmt(p) : ''}</td>
          <td style="border:1px solid #9ed8e8;padding:3px 4px;text-align:right;">${supply > 0 ? stFmt(supply) : ''}</td>
          <td style="border:1px solid #9ed8e8;padding:3px 4px;text-align:right;">${vat > 0 ? stFmt(vat) : ''}</td>
        </tr>
      `;
    });

    // 빈 행 채우기 (최소 ST_TOTAL_ROWS 행)
    const emptyRowCount = Math.max(ST_TOTAL_ROWS - stItems.length, 0);
    const emptyRows = Array.from({ length: emptyRowCount }, () => `
      <tr style="height:20px;">
        <td style="border:1px solid #9ed8e8;"></td>
        <td style="border:1px solid #9ed8e8;"></td>
        <td style="border:1px solid #9ed8e8;"></td>
        <td style="border:1px solid #9ed8e8;"></td>
        <td style="border:1px solid #9ed8e8;"></td>
        <td style="border:1px solid #9ed8e8;"></td>
        <td style="border:1px solid #9ed8e8;"></td>
        <td style="border:1px solid #9ed8e8;"></td>
      </tr>
    `).join('');

    return `
      <div style="font-family:'맑은 고딕','Malgun Gothic',sans-serif;font-size:10px;color:#222;line-height:1.5;padding:4px;">

        <!-- ── 상단 헤더 ── -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
          <tr>
            <!-- 왼쪽: 발행정보 -->
            <td style="width:38%;vertical-align:top;padding-right:10px;">
              <table style="width:100%;border-collapse:collapse;font-size:9px;">
                <tr>
                  <td style="border:1px solid #9ed8e8;padding:3px 6px;background:#e0f5fb;width:35%;"><strong>Page</strong></td>
                  <td style="border:1px solid #9ed8e8;padding:3px 6px;">1 / 1</td>
                </tr>
                <tr>
                  <td style="border:1px solid #9ed8e8;padding:3px 6px;background:#e0f5fb;"><strong>발행일자</strong></td>
                  <td style="border:1px solid #9ed8e8;padding:3px 6px;">${stDate}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #9ed8e8;padding:16px 6px 3px;background:#e0f5fb;vertical-align:top;"><strong>거래처명</strong></td>
                  <td style="border:1px solid #9ed8e8;padding:16px 6px 3px;vertical-align:top;"><strong>${stClient}</strong></td>
                </tr>
              </table>
              <div style="margin-top:8px;padding:6px 8px;border:2px solid #1a8fc1;border-radius:3px;text-align:center;">
                <div style="font-size:9px;color:#555;">합계금액</div>
                <div style="font-size:16px;font-weight:900;">${stFmt(totalAmt)}원</div>
              </div>
            </td>

            <!-- 오른쪽: 제목 + 공급자 -->
            <td style="width:62%;vertical-align:top;">
              <div style="text-align:center;margin-bottom:6px;">
                <div style="font-size:20px;font-weight:900;letter-spacing:-0.5px;">거래명세서</div>
                <div style="font-size:9px;color:#555;">(공급받는 자 보관용)</div>
              </div>
              <table style="width:100%;border-collapse:collapse;font-size:9px;">
                <tr>
                  <td style="border:1px solid #9ed8e8;padding:3px 5px;background:#e0f5fb;width:18%;"><strong>상호</strong></td>
                  <td style="border:1px solid #9ed8e8;padding:3px 5px;width:28%;">${stSName}</td>
                  <td style="border:1px solid #9ed8e8;padding:3px 5px;background:#e0f5fb;width:15%;"><strong>성명</strong></td>
                  <td style="border:1px solid #9ed8e8;padding:3px 5px;">${stSCeo} (인)</td>
                </tr>
                <tr>
                  <td style="border:1px solid #9ed8e8;padding:3px 5px;background:#e0f5fb;"><strong>주소</strong></td>
                  <td colspan="3" style="border:1px solid #9ed8e8;padding:3px 5px;">${stSAddr}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #9ed8e8;padding:3px 5px;background:#e0f5fb;"><strong>업태</strong></td>
                  <td style="border:1px solid #9ed8e8;padding:3px 5px;">${stSBiz}</td>
                  <td style="border:1px solid #9ed8e8;padding:3px 5px;background:#e0f5fb;"><strong>종목</strong></td>
                  <td style="border:1px solid #9ed8e8;padding:3px 5px;">${stSType}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #9ed8e8;padding:3px 5px;background:#e0f5fb;"><strong>전화</strong></td>
                  <td style="border:1px solid #9ed8e8;padding:3px 5px;">${stSTel}</td>
                  <td style="border:1px solid #9ed8e8;padding:3px 5px;background:#e0f5fb;"><strong>팩스</strong></td>
                  <td style="border:1px solid #9ed8e8;padding:3px 5px;">${stSFax}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- ── 품목 테이블 ── -->
        <table style="width:100%;border-collapse:collapse;font-size:9px;margin-bottom:6px;">
          <thead>
            <tr style="background:#c5eef8;text-align:center;">
              <th style="border:1px solid #9ed8e8;padding:5px 3px;width:7%;">월일</th>
              <th style="border:1px solid #9ed8e8;padding:5px 3px;width:9%;">품목코드</th>
              <th style="border:1px solid #9ed8e8;padding:5px 3px;">품목명</th>
              <th style="border:1px solid #9ed8e8;padding:5px 3px;width:12%;">규격</th>
              <th style="border:1px solid #9ed8e8;padding:5px 3px;width:7%;">수량</th>
              <th style="border:1px solid #9ed8e8;padding:5px 3px;width:12%;">단가</th>
              <th style="border:1px solid #9ed8e8;padding:5px 3px;width:13%;">공급가액</th>
              <th style="border:1px solid #9ed8e8;padding:5px 3px;width:10%;">세액</th>
            </tr>
          </thead>
          <tbody>
            ${dataRows.join('')}
            ${emptyRows}
          </tbody>
        </table>

        <!-- ── 하단 합계 ── -->
        <table style="width:100%;border-collapse:collapse;font-size:9px;">
          <tr>
            <td style="border:1px solid #9ed8e8;padding:4px 6px;background:#e0f5fb;width:13%;"><strong>전잔금</strong></td>
            <td style="border:1px solid #9ed8e8;padding:4px 6px;text-align:right;width:16%;">${stFmt(prevBal)}원</td>
            <td style="border:1px solid #9ed8e8;padding:4px 6px;background:#e0f5fb;width:13%;"><strong>수량 합계</strong></td>
            <td style="border:1px solid #9ed8e8;padding:4px 6px;text-align:right;width:16%;">${stFmt(totalQty)}</td>
            <td colspan="4" style="border:1px solid #9ed8e8;padding:4px 6px;"></td>
          </tr>
          <tr>
            <td style="border:1px solid #9ed8e8;padding:4px 6px;background:#e0f5fb;"><strong>공급가액</strong></td>
            <td style="border:1px solid #9ed8e8;padding:4px 6px;text-align:right;">${stFmt(totalSupply)}원</td>
            <td style="border:1px solid #9ed8e8;padding:4px 6px;background:#e0f5fb;"><strong>세액</strong></td>
            <td style="border:1px solid #9ed8e8;padding:4px 6px;text-align:right;">${stFmt(totalVat)}원</td>
            <td colspan="4" style="border:1px solid #9ed8e8;padding:4px 6px;font-size:9px;color:#333;">${bankInfo}</td>
          </tr>
          <tr>
            <td style="border:1px solid #9ed8e8;padding:4px 6px;background:#e0f5fb;"><strong>입금</strong></td>
            <td style="border:1px solid #9ed8e8;padding:4px 6px;text-align:right;">${stFmt(payment)}원</td>
            <td style="border:1px solid #9ed8e8;padding:4px 6px;background:#e0f5fb;"><strong>총잔액</strong></td>
            <td style="border:1px solid #9ed8e8;padding:4px 6px;text-align:right;font-weight:700;">${stFmt(totalBal)}원</td>
            <td colspan="4" style="border:1px solid #9ed8e8;padding:4px 6px;"></td>
          </tr>
        </table>

      </div>
    `;
  }

  // 미리보기 업데이트
  function stUpdatePreview() {
    const preview = document.getElementById('stPreview');
    if (preview) preview.innerHTML = stRenderPreviewHTML();
  }
  window.stUpdatePreview = stUpdatePreview;

  // 인쇄 / PDF 출력
  function stPrint() {
    const html = stRenderPreviewHTML();
    const win  = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>거래명세서</title>
        <style>
          @page { size: A4; margin: 12mm; }
          body { font-family:'맑은 고딕','Malgun Gothic',sans-serif; font-size:10px; color:#222; background:#fff; }
        </style>
      </head>
      <body onload="window.print();">${html}</body>
      </html>
    `);
    win.document.close();
  }
  window.stPrint = stPrint;

  // 초기화
  function stReset() {
    if (!confirm('거래명세서를 초기화하시겠습니까?')) return;
    stItems = [];
    stRenderItems();
    stUpdatePreview();
  }
  window.stReset = stReset;

  // 초기 품목 1행 + 미리보기 렌더링
  stAddRow();
  stUpdatePreview();

  // ══════════════════════════════════════════════════════
  //   거래처 관리 모듈 (ClientManager)
  // ══════════════════════════════════════════════════════
  const ClientManager = {
    STORAGE_KEY: 'pm_clients',

    // 초기 샘플 데이터
    defaultClients: [
      {
        id: 'cli_1700000001',
        name: '(주)미래소프트',
        bizNum: '123-45-67890',
        ceo: '김미래',
        phone: '02-555-1234',
        email: 'mirae@miraesoft.com',
        contractDate: '2023-03-01',
        address: '서울시 강남구 테헤란로 152 7층',
        totalPaid: 4200000,
        memo: '매월 25일 전자세금계산서 발행',
        devices: [
          {
            id: 'dev_101',
            name: '캐논 iR-ADV C3922 컬러복합기',
            serial: 'CN-3922-8812 / 7층 본사실',
            baseRent: 85000,
            bwBase: 1000,
            bwUnit: 10,
            bwUsed: 1450,
            colorBase: 300,
            colorUnit: 100,
            colorUsed: 420
          }
        ]
      },
      {
        id: 'cli_1700000002',
        name: '강동탑학원',
        bizNum: '214-82-99123',
        ceo: '이원장',
        phone: '02-488-9000',
        email: 'gangdong_top@edu.co.kr',
        contractDate: '2023-07-15',
        address: '서울시 강동구 고덕로 262 3층',
        totalPaid: 2850000,
        memo: '시험기간(4월, 9월) 흑백 사용량 급증',
        devices: [
          {
            id: 'dev_201',
            name: '신도리코 D420 고속컬러복합기',
            serial: 'SND-420-1092 / 교무실',
            baseRent: 110000,
            bwBase: 2500,
            bwUnit: 8,
            bwUsed: 3800,
            colorBase: 500,
            colorUnit: 80,
            colorUsed: 650
          },
          {
            id: 'dev_202',
            name: 'HP OfficeJet Pro 9010 잉크젯',
            serial: 'HP-9010-4491 / 상담데스크',
            baseRent: 35000,
            bwBase: 800,
            bwUnit: 12,
            bwUsed: 750,
            colorBase: 200,
            colorUnit: 90,
            colorUsed: 230
          }
        ]
      },
      {
        id: 'cli_1700000003',
        name: '성우법률사무소',
        bizNum: '107-19-54321',
        ceo: '박성우 변호사',
        phone: '02-532-7788',
        email: 'contact@sungwoorange.com',
        contractDate: '2022-11-10',
        address: '서울시 서초구 서초대로 240 502호',
        totalPaid: 6100000,
        memo: '보안용 토너 및 문서세단기 함께 렌탈 중',
        devices: [
          {
            id: 'dev_301',
            name: '후지제록스 ApeosPort C3060',
            serial: 'FX-3060-771 / 메인 사무실',
            baseRent: 95000,
            bwBase: 1500,
            bwUnit: 10,
            bwUsed: 2100,
            colorBase: 400,
            colorUnit: 100,
            colorUsed: 380
          }
        ]
      }
    ],

    // 데이터 가져오기
    getClients() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (!raw) {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.defaultClients));
          return JSON.parse(JSON.stringify(this.defaultClients));
        }
        return JSON.parse(raw);
      } catch (e) {
        console.error('거래처 데이터 로드 실패:', e);
        return [];
      }
    },

    // 데이터 저장
    saveClients(clients) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(clients));
        this.renderTable();
        this.updateGlobalDashboardStats();
      } catch (e) {
        console.error('거래처 데이터 저장 실패:', e);
        alert('저장 용량 또는 브라우저 오류로 저장에 실패했습니다.');
      }
    },

    // 장비별 계산 (초과금액, 공급가, VAT, 월임대료)
    calcDevice(dev) {
      const bwBase    = Number(dev.bwBase) || 0;
      const bwUnit    = Number(dev.bwUnit) || 0;
      const bwUsed    = Number(dev.bwUsed) || 0;
      const colorBase = Number(dev.colorBase) || 0;
      const colorUnit = Number(dev.colorUnit) || 0;
      const colorUsed = Number(dev.colorUsed) || 0;
      const baseRent  = Number(dev.baseRent) || 0;

      const bwOver    = Math.max(0, bwUsed - bwBase);
      const bwExtra   = bwOver * bwUnit;

      const colorOver  = Math.max(0, colorUsed - colorBase);
      const colorExtra = colorOver * colorUnit;

      const extraTotal = bwExtra + colorExtra;
      const supply     = baseRent + extraTotal;
      const vat        = Math.round(supply * 0.1);
      const total      = supply + vat;

      return {
        baseRent,
        bwBase, bwUnit, bwUsed, bwOver, bwExtra,
        colorBase, colorUnit, colorUsed, colorOver, colorExtra,
        extraTotal,
        supply,
        vat,
        total
      };
    },

    // 거래처 전체 합산 계산
    calcClientTotals(client) {
      const devices = client.devices || [];
      let totalBaseRent   = 0;
      let totalBwExtra    = 0;
      let totalColorExtra = 0;
      let totalExtra      = 0;
      let totalSupply     = 0;
      let totalVat        = 0;
      let totalMonthBill  = 0;

      devices.forEach(dev => {
        const c = this.calcDevice(dev);
        totalBaseRent   += c.baseRent;
        totalBwExtra    += c.bwExtra;
        totalColorExtra += c.colorExtra;
        totalExtra      += c.extraTotal;
        totalSupply     += c.supply;
        totalVat        += c.vat;
        totalMonthBill  += c.total;
      });

      return {
        deviceCount: devices.length,
        totalBaseRent,
        totalBwExtra,
        totalColorExtra,
        totalExtra,
        totalSupply,
        totalVat,
        totalMonthBill,
        totalPaid: Number(client.totalPaid) || 0
      };
    },

    // 정규화 (중복 비교용: 공백, 특수문자, 하이픈 제거)
    normalizeStr(val) {
      return (val || '').toString().trim().replace(/[-\s]/g, '').toLowerCase();
    },

    // 중복 검사 (이름, 사업자번호, 전화번호 중 하나라도 일치 여부)
    findDuplicate(candidate, excludeId = null) {
      const clients = this.getClients();
      const candName  = this.normalizeStr(candidate.name);
      const candBiz   = this.normalizeStr(candidate.bizNum);
      const candPhone = this.normalizeStr(candidate.phone);

      return clients.find(c => {
        if (excludeId && c.id === excludeId) return false;
        const cName  = this.normalizeStr(c.name);
        const cBiz   = this.normalizeStr(c.bizNum);
        const cPhone = this.normalizeStr(c.phone);

        const matchName  = candName && cName && (candName === cName);
        const matchBiz   = candBiz && cBiz && (candBiz === cBiz);
        const matchPhone = candPhone && cPhone && (candPhone === cPhone);

        return matchName || matchBiz || matchPhone;
      });
    },

    // 테이블 렌더링
    renderTable(filterKeyword = '') {
      const clients = this.getClients();
      const tbody = document.getElementById('clientTbody');
      const emptyState = document.getElementById('clientEmpty');
      const tableWrapper = document.getElementById('clientTableWrapper');

      if (!tbody) return;

      const kw = filterKeyword.trim().toLowerCase();
      const filtered = clients.filter(c => {
        if (!kw) return true;
        const searchTarget = [
          c.name, c.bizNum, c.ceo, c.phone, c.email, c.address,
          (c.devices || []).map(d => d.name + ' ' + d.serial).join(' ')
        ].join(' ').toLowerCase();
        return searchTarget.includes(kw);
      });

      // 통계 계산
      let statTotalClients = clients.length;
      let statTotalDevices = 0;
      let statTotalMonthBill = 0;
      let statTotalPaid = 0;

      clients.forEach(c => {
        const t = this.calcClientTotals(c);
        statTotalDevices   += t.deviceCount;
        statTotalMonthBill += t.totalMonthBill;
        statTotalPaid      += t.totalPaid;
      });

      // 상단 4대 카드 UI 갱신
      const elTotal      = document.getElementById('clientStatTotal');
      const elDevices    = document.getElementById('clientStatDevices');
      const elMonthBill  = document.getElementById('clientStatMonthBill');
      const elTotalPaid  = document.getElementById('clientStatTotalPaid');
      const elBadge      = document.getElementById('clientCountBadge');

      if (elTotal)     elTotal.textContent     = statTotalClients.toLocaleString();
      if (elDevices)   elDevices.textContent   = statTotalDevices.toLocaleString() + '대';
      if (elMonthBill) elMonthBill.textContent = statTotalMonthBill.toLocaleString() + '원';
      if (elTotalPaid) elTotalPaid.textContent = statTotalPaid.toLocaleString() + '원';
      if (elBadge)     elBadge.textContent     = `${filtered.length}개사`;

      if (filtered.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        if (tableWrapper) tableWrapper.style.display = 'none';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';
      if (tableWrapper) tableWrapper.style.display = 'block';

      let html = '';
      filtered.forEach((client, idx) => {
        const totals = this.calcClientTotals(client);
        const devices = client.devices || [];

        // 주 행 (Parent Row)
        html += `
          <tr class="accordion-parent" id="row-${client.id}" onclick="ClientManager.toggleAccordion('${client.id}', event)">
            <td style="text-align:center;">
              <span class="toggle-icon"><i class="fa fa-chevron-right"></i></span>
            </td>
            <td>${idx + 1}</td>
            <td>
              <strong style="font-size:14px;color:#fff;">${this.escapeHtml(client.name)}</strong>
              ${client.memo ? `<div style="font-size:11px;color:var(--text-muted);">${this.escapeHtml(client.memo)}</div>` : ''}
            </td>
            <td><code style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;color:#cbd5e1;">${this.escapeHtml(client.bizNum || '-')}</code></td>
            <td>
              <div>${this.escapeHtml(client.ceo || '-')}</div>
              <div style="font-size:12px;color:var(--text-muted);">${this.escapeHtml(client.phone || '-')}</div>
            </td>
            <td>${client.contractDate || '-'}</td>
            <td>
              <span class="status-badge" style="background:rgba(59,130,246,0.15);color:var(--accent-primary);font-weight:700;">
                <i class="fa fa-print"></i> ${totals.deviceCount}대
              </span>
            </td>
            <td>${totals.totalBaseRent.toLocaleString()}원</td>
            <td style="color:${totals.totalExtra > 0 ? '#f59e0b' : 'inherit'};font-weight:${totals.totalExtra > 0 ? '600' : 'normal'};">
              ${totals.totalExtra > 0 ? '+' : ''}${totals.totalExtra.toLocaleString()}원
            </td>
            <td><strong>${totals.totalSupply.toLocaleString()}원</strong></td>
            <td style="color:var(--text-muted);">${totals.totalVat.toLocaleString()}원</td>
            <td style="color:#60a5fa;font-weight:700;font-size:15px;">
              ${totals.totalMonthBill.toLocaleString()}원
            </td>
            <td>${totals.totalPaid.toLocaleString()}원</td>
            <td onclick="event.stopPropagation();">
              <div style="display:flex;gap:6px;">
                <button class="btn-action-icon edit" title="수정" onclick="ClientManager.openEditModal('${client.id}')">
                  <i class="fa fa-edit"></i>
                </button>
                <button class="btn-action-icon delete" title="삭제" onclick="ClientManager.deleteClient('${client.id}')">
                  <i class="fa fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>

          <!-- 아코디언 하위 행 (Subtable Row) -->
          <tr class="device-subtable-row" id="sub-${client.id}" style="display:none;">
            <td colspan="14">
              <div class="device-subtable-wrap">
                <div class="device-subtable-title">
                  <i class="fa fa-layer-group"></i> [${this.escapeHtml(client.name)}] 임대 장비 상세 내역 (${devices.length}대)
                  <span style="margin-left:auto;color:var(--text-muted);font-weight:normal;font-size:11px;">
                    설치주소: ${this.escapeHtml(client.address || '미기재')} | 이메일: ${this.escapeHtml(client.email || '미기재')}
                  </span>
                </div>
                <table class="device-subtable">
                  <thead>
                    <tr>
                      <th style="width:30px;">#</th>
                      <th>장비명 (모델)</th>
                      <th>시리얼 / 설치위치</th>
                      <th>기본임대료</th>
                      <th>흑백 기준/초과단가</th>
                      <th>흑백 사용량(초과)</th>
                      <th>흑백 추가금</th>
                      <th>컬러 기준/초과단가</th>
                      <th>컬러 사용량(초과)</th>
                      <th>컬러 추가금</th>
                      <th>장비별 월합계</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${devices.map((d, dIdx) => {
                      const dc = this.calcDevice(d);
                      return `
                        <tr>
                          <td>${dIdx + 1}</td>
                          <td><strong style="color:#e2e8f0;">${this.escapeHtml(d.name || '-')}</strong></td>
                          <td><span style="color:#94a3b8;">${this.escapeHtml(d.serial || '-')}</span></td>
                          <td>${dc.baseRent.toLocaleString()}원</td>
                          <td>${dc.bwBase.toLocaleString()}장 / ${dc.bwUnit}원</td>
                          <td>${dc.bwUsed.toLocaleString()}장 <span style="color:#f59e0b;">(${dc.bwOver > 0 ? '+' + dc.bwOver.toLocaleString() : '0'})</span></td>
                          <td style="color:${dc.bwExtra > 0 ? '#f59e0b' : 'inherit'};">${dc.bwExtra.toLocaleString()}원</td>
                          <td>${dc.colorBase.toLocaleString()}장 / ${dc.colorUnit}원</td>
                          <td>${dc.colorUsed.toLocaleString()}장 <span style="color:#f59e0b;">(${dc.colorOver > 0 ? '+' + dc.colorOver.toLocaleString() : '0'})</span></td>
                          <td style="color:${dc.colorExtra > 0 ? '#f59e0b' : 'inherit'};">${dc.colorExtra.toLocaleString()}원</td>
                          <td><strong style="color:#60a5fa;">${dc.total.toLocaleString()}원</strong> <span style="font-size:10px;color:var(--text-muted);">(VAT포함)</span></td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    },

    // 아코디언 토글
    toggleAccordion(clientId, event) {
      if (event) event.stopPropagation();
      const parentRow = document.getElementById(`row-${clientId}`);
      const subRow    = document.getElementById(`sub-${clientId}`);
      if (!parentRow || !subRow) return;

      const isExpanded = parentRow.classList.contains('expanded');
      if (isExpanded) {
        parentRow.classList.remove('expanded');
        subRow.style.display = 'none';
      } else {
        parentRow.classList.add('expanded');
        subRow.style.display = 'table-row';
      }
    },

    // 실시간 검색 필터
    searchClients() {
      const input = document.getElementById('clientSearchInput');
      const kw = input ? input.value : '';
      this.renderTable(kw);
    },

    // 모달 열기: 신규 등록
    openAddModal() {
      const modal = document.getElementById('clientModal');
      const title = document.getElementById('clientModalTitle');
      const form  = document.getElementById('clientForm');
      if (!modal) return;

      if (form) form.reset();
      const idInput = document.getElementById('clientId') || document.getElementById('editClientId');
      if (idInput) idInput.value = '';
      if (title) title.innerHTML = '<i class="fa fa-building"></i> 거래처 신규 등록';

      // 계약 시작일 기본값 오늘
      const today = new Date().toISOString().split('T')[0];
      const dtInput = document.getElementById('clContractDate');
      if (dtInput) dtInput.value = today;

      // 장비 목록 초기화 및 1개 기본 추가
      const devList = document.getElementById('deviceFormList');
      if (devList) devList.innerHTML = '';
      this.addDeviceRow();

      modal.style.display = 'flex';
      this.updateCalcPreview();
    },

    // 모달 열기: 수정
    openEditModal(clientId) {
      const modal = document.getElementById('clientModal');
      const title = document.getElementById('clientModalTitle');
      const form  = document.getElementById('clientForm');
      if (!modal) return;

      const clients = this.getClients();
      const client = clients.find(c => c.id === clientId);
      if (!client) {
        alert('해당 거래처 정보를 찾을 수 없습니다.');
        return;
      }

      if (form) form.reset();
      const idInput = document.getElementById('clientId') || document.getElementById('editClientId');
      if (idInput) idInput.value = client.id;
      
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val !== undefined ? val : '';
      };

      setVal('clName', client.name);
      setVal('clBizNum', client.bizNum);
      setVal('clCeo', client.ceo);
      setVal('clPhone', client.phone);
      setVal('clEmail', client.email);
      setVal('clContractDate', client.contractDate);
      setVal('clAddress', client.address);
      setVal('clTotalPaid', client.totalPaid || 0);
      setVal('clMemo', client.memo);

      if (title) title.innerHTML = `<i class="fa fa-edit"></i> 거래처 정보 수정 - [${this.escapeHtml(client.name)}]`;

      const devList = document.getElementById('deviceFormList');
      if (devList) devList.innerHTML = '';

      const devices = client.devices && client.devices.length > 0 ? client.devices : [{}];
      devices.forEach(dev => this.addDeviceRow(dev));

      modal.style.display = 'flex';
      this.updateCalcPreview();
    },

    // 모달 닫기
    closeModal() {
      const modal = document.getElementById('clientModal');
      if (modal) modal.style.display = 'none';
    },

    // 장비 폼 행 추가
    addDeviceRow(dev = {}) {
      const devList = document.getElementById('deviceFormList');
      if (!devList) return;

      const idx = devList.querySelectorAll('.device-form-card').length + 1;
      const card = document.createElement('div');
      card.className = 'device-form-card';
      card.dataset.deviceId = dev.id || ('dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));

      card.innerHTML = `
        <div class="device-card-header">
          <div class="device-badge-index"><i class="fa fa-print"></i> 장비 #${idx}</div>
          <button type="button" class="btn-remove-device" onclick="ClientManager.removeDeviceRow(this)">
            <i class="fa fa-trash"></i> 장비 삭제
          </button>
        </div>
        <div class="form-grid-3">
          <div class="form-group">
            <label>장비명 (모델명) <span class="req">*</span></label>
            <input type="text" class="dev-name" value="${this.escapeHtml(dev.name || '')}" placeholder="예: 캐논 iR-ADV C3922" required oninput="ClientManager.updateCalcPreview()">
          </div>
          <div class="form-group">
            <label>시리얼 번호 / 설치위치</label>
            <input type="text" class="dev-serial" value="${this.escapeHtml(dev.serial || '')}" placeholder="예: SN12345 / 2층 디자인실">
          </div>
          <div class="form-group">
            <label>기본 임대료 (원) <span class="req">*</span></label>
            <input type="number" class="dev-baseRent" value="${dev.baseRent !== undefined ? dev.baseRent : 80000}" min="0" step="1000" required oninput="ClientManager.updateCalcPreview()">
          </div>
        </div>

        <!-- 흑백 설정 & 이번달 사용량 -->
        <div class="form-grid-3" style="margin-top:10px;background:rgba(255,255,255,0.02);padding:10px;border-radius:8px;">
          <div class="form-group">
            <label>흑백 기준 매수 (기본제공)</label>
            <input type="number" class="dev-bwBase" value="${dev.bwBase !== undefined ? dev.bwBase : 1000}" min="0" oninput="ClientManager.updateCalcPreview()">
          </div>
          <div class="form-group">
            <label>흑백 추가 장당 단가 (원)</label>
            <input type="number" class="dev-bwUnit" value="${dev.bwUnit !== undefined ? dev.bwUnit : 10}" min="0" oninput="ClientManager.updateCalcPreview()">
          </div>
          <div class="form-group">
            <label style="color:#60a5fa;font-weight:600;">이번달 흑백 사용량 (장)</label>
            <input type="number" class="dev-bwUsed" value="${dev.bwUsed !== undefined ? dev.bwUsed : 1000}" min="0" oninput="ClientManager.updateCalcPreview()">
          </div>
        </div>

        <!-- 컬러 설정 & 이번달 사용량 -->
        <div class="form-grid-3" style="margin-top:10px;background:rgba(255,255,255,0.02);padding:10px;border-radius:8px;">
          <div class="form-group">
            <label>컬러 기준 매수 (기본제공)</label>
            <input type="number" class="dev-colorBase" value="${dev.colorBase !== undefined ? dev.colorBase : 300}" min="0" oninput="ClientManager.updateCalcPreview()">
          </div>
          <div class="form-group">
            <label>컬러 추가 장당 단가 (원)</label>
            <input type="number" class="dev-colorUnit" value="${dev.colorUnit !== undefined ? dev.colorUnit : 100}" min="0" oninput="ClientManager.updateCalcPreview()">
          </div>
          <div class="form-group">
            <label style="color:#60a5fa;font-weight:600;">이번달 컬러 사용량 (장)</label>
            <input type="number" class="dev-colorUsed" value="${dev.colorUsed !== undefined ? dev.colorUsed : 300}" min="0" oninput="ClientManager.updateCalcPreview()">
          </div>
        </div>
      `;

      devList.appendChild(card);
      this.renumberDeviceCards();
      this.updateCalcPreview();
    },

    // 장비 폼 행 삭제
    removeDeviceRow(btn) {
      const devList = document.getElementById('deviceFormList');
      const cards = devList.querySelectorAll('.device-form-card');
      if (cards.length <= 1) {
        alert('최소 1대 이상의 임대 장비 정보가 등록되어야 합니다.');
        return;
      }
      const card = btn.closest('.device-form-card');
      if (card) {
        card.remove();
        this.renumberDeviceCards();
        this.updateCalcPreview();
      }
    },

    // 장비 카드 번호 재부여
    renumberDeviceCards() {
      const devList = document.getElementById('deviceFormList');
      if (!devList) return;
      const cards = devList.querySelectorAll('.device-form-card');
      cards.forEach((c, i) => {
        const badge = c.querySelector('.device-badge-index');
        if (badge) badge.innerHTML = `<i class="fa fa-print"></i> 장비 #${i + 1}`;
      });
    },

    // 모달 내 실시간 정산 미리보기 업데이트
    updateCalcPreview() {
      const devList = document.getElementById('deviceFormList');
      if (!devList) return;

      const cards = devList.querySelectorAll('.device-form-card');
      let sumBaseRent   = 0;
      let sumBwExtra    = 0;
      let sumColorExtra = 0;

      cards.forEach(card => {
        const baseRent  = Number(card.querySelector('.dev-baseRent')?.value) || 0;
        const bwBase    = Number(card.querySelector('.dev-bwBase')?.value) || 0;
        const bwUnit    = Number(card.querySelector('.dev-bwUnit')?.value) || 0;
        const bwUsed    = Number(card.querySelector('.dev-bwUsed')?.value) || 0;
        const colorBase = Number(card.querySelector('.dev-colorBase')?.value) || 0;
        const colorUnit = Number(card.querySelector('.dev-colorUnit')?.value) || 0;
        const colorUsed = Number(card.querySelector('.dev-colorUsed')?.value) || 0;

        const bwOver = Math.max(0, bwUsed - bwBase);
        const colorOver = Math.max(0, colorUsed - colorBase);

        sumBaseRent   += baseRent;
        sumBwExtra    += bwOver * bwUnit;
        sumColorExtra += colorOver * colorUnit;
      });

      const sumSupply = sumBaseRent + sumBwExtra + sumColorExtra;
      const sumVat    = Math.round(sumSupply * 0.1);
      const sumTotal  = sumSupply + sumVat;

      const elBase  = document.getElementById('prevBaseRent');
      const elBw    = document.getElementById('prevBwExtra');
      const elColor = document.getElementById('prevColorExtra');
      const elSup   = document.getElementById('prevSupply');
      const elVat   = document.getElementById('prevVat');
      const elTotal = document.getElementById('prevTotalBill');

      if (elBase)  elBase.textContent  = sumBaseRent.toLocaleString() + '원';
      if (elBw)    elBw.textContent    = sumBwExtra.toLocaleString() + '원';
      if (elColor) elColor.textContent = sumColorExtra.toLocaleString() + '원';
      if (elSup)   elSup.textContent   = sumSupply.toLocaleString() + '원';
      if (elVat)   elVat.textContent   = sumVat.toLocaleString() + '원';
      if (elTotal) elTotal.textContent = sumTotal.toLocaleString() + '원';
    },

    // 거래처 저장 (신규 등록 및 수정, 중복 체크 후 업데이트 확인)
    saveClient(e) {
      if (e) e.preventDefault();

      const id           = document.getElementById('clientId').value.trim();
      const name         = document.getElementById('clName').value.trim();
      const bizNum       = document.getElementById('clBizNum').value.trim();
      const ceo          = document.getElementById('clCeo').value.trim();
      const phone        = document.getElementById('clPhone').value.trim();
      const email        = document.getElementById('clEmail').value.trim();
      const contractDate = document.getElementById('clContractDate').value;
      const address      = document.getElementById('clAddress').value.trim();
      const totalPaid    = Number(document.getElementById('clTotalPaid').value) || 0;
      const memo         = document.getElementById('clMemo').value.trim();

      if (!name) {
        alert('거래처명을 입력해주세요.');
        document.getElementById('clName').focus();
        return;
      }
      if (!phone) {
        alert('연락처(전화번호)를 입력해주세요.');
        document.getElementById('clPhone').focus();
        return;
      }

      // 장비 목록 수집
      const devList = document.getElementById('deviceFormList');
      const cards = devList.querySelectorAll('.device-form-card');
      if (cards.length === 0) {
        alert('최소 1대 이상의 임대 장비를 추가해주세요.');
        return;
      }

      const devices = [];
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const devName = card.querySelector('.dev-name')?.value.trim();
        if (!devName) {
          alert(`장비 #${i + 1}의 장비명(모델명)을 입력해주세요.`);
          card.querySelector('.dev-name')?.focus();
          return;
        }

        devices.push({
          id: card.dataset.deviceId || ('dev_' + Date.now() + '_' + i),
          name: devName,
          serial: card.querySelector('.dev-serial')?.value.trim() || '',
          baseRent: Number(card.querySelector('.dev-baseRent')?.value) || 0,
          bwBase: Number(card.querySelector('.dev-bwBase')?.value) || 0,
          bwUnit: Number(card.querySelector('.dev-bwUnit')?.value) || 0,
          bwUsed: Number(card.querySelector('.dev-bwUsed')?.value) || 0,
          colorBase: Number(card.querySelector('.dev-colorBase')?.value) || 0,
          colorUnit: Number(card.querySelector('.dev-colorUnit')?.value) || 0,
          colorUsed: Number(card.querySelector('.dev-colorUsed')?.value) || 0
        });
      }

      const candidateData = {
        name, bizNum, ceo, phone, email, contractDate, address, totalPaid, memo, devices
      };

      const clients = this.getClients();

      // 중복 체크: 이름, 사업자번호, 전화번호 중 하나라도 일치하는 거래처 확인
      const duplicate = this.findDuplicate(candidateData, id || null);

      if (duplicate) {
        const msg = `[중복 거래처 안내]\n이미 동일한 정보가 등록된 거래처가 존재합니다.\n\n` +
          `• 기존 거래처명: ${duplicate.name}\n` +
          `• 사업자등록번호: ${duplicate.bizNum || '없음'}\n` +
          `• 대표 연락처: ${duplicate.phone || '없음'}\n\n` +
          `기존 거래처 [${duplicate.name}]의 정보를 현재 입력한 내용으로 업데이트(덮어쓰기)하시겠습니까?`;

        if (!confirm(msg)) {
          return; // 사용자가 취소를 누르면 중단
        }

        // 기존 거래처 업데이트
        const targetIdx = clients.findIndex(c => c.id === duplicate.id);
        if (targetIdx !== -1) {
          clients[targetIdx] = {
            ...duplicate,
            ...candidateData,
            id: duplicate.id // 기존 ID 유지
          };
          this.saveClients(clients);
          this.closeModal();
          alert(`[${name}] 거래처 정보가 기존 데이터에 성공적으로 업데이트되었습니다.`);
          return;
        }
      }

      // 신규 등록 또는 일반 수정 처리
      if (id) {
        // 기존 수정
        const targetIdx = clients.findIndex(c => c.id === id);
        if (targetIdx !== -1) {
          clients[targetIdx] = {
            id,
            ...candidateData
          };
        } else {
          clients.push({ id, ...candidateData });
        }
        alert(`[${name}] 거래처 정보가 수정되었습니다.`);
      } else {
        // 신규 추가
        const newClient = {
          id: 'cli_' + Date.now(),
          ...candidateData
        };
        clients.unshift(newClient);
        alert(`[${name}] 거래처가 신규 등록되었습니다.`);
      }

      this.saveClients(clients);
      this.closeModal();
    },

    // 거래처 삭제
    deleteClient(clientId) {
      const clients = this.getClients();
      const target = clients.find(c => c.id === clientId);
      if (!target) return;

      if (!confirm(`정말로 거래처 [${target.name}] 및 연결된 모든 임대 장비 내역을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`)) {
        return;
      }

      const updated = clients.filter(c => c.id !== clientId);
      this.saveClients(updated);
      alert(`[${target.name}] 거래처가 삭제되었습니다.`);
    },

    // 엑셀 내보내기 (SheetJS)
    exportToExcel() {
      if (typeof XLSX === 'undefined') {
        alert('엑셀 라이브러리(SheetJS)를 로딩 중입니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      const clients = this.getClients();
      if (clients.length === 0) {
        alert('내보낼 거래처 데이터가 없습니다.');
        return;
      }

      // 1행 1장비 단위로 펼쳐서 엑셀 행 구성
      const rows = [];
      clients.forEach(client => {
        const devices = client.devices && client.devices.length > 0 ? client.devices : [{}];
        devices.forEach((dev, dIdx) => {
          const dc = this.calcDevice(dev);
          rows.push({
            '거래처명': client.name || '',
            '사업자번호': client.bizNum || '',
            '대표자': client.ceo || '',
            '전화번호': client.phone || '',
            '이메일': client.email || '',
            '계약시작일': client.contractDate || '',
            '사업장주소': client.address || '',
            '누적총결제액': client.totalPaid || 0,
            '비고': client.memo || '',
            '장비순번': dIdx + 1,
            '장비명': dev.name || '',
            '시리얼_위치': dev.serial || '',
            '기본임대료': dc.baseRent,
            '흑백기준매수': dc.bwBase,
            '흑백초과단가': dc.bwUnit,
            '흑백이번달사용량': dc.bwUsed,
            '흑백추가금': dc.bwExtra,
            '컬러기준매수': dc.colorBase,
            '컬러초과단가': dc.colorUnit,
            '컬러이번달사용량': dc.colorUsed,
            '컬러추가금': dc.colorExtra,
            '합계금액(공급가)': dc.supply,
            'VAT': dc.vat,
            '이번달총임대료': dc.total
          });
        });
      });

      const ws = XLSX.utils.json_to_sheet(rows);

      // 열 너비 자동 설정
      ws['!cols'] = [
        { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 20 },
        { wch: 12 }, { wch: 30 }, { wch: 14 }, { wch: 20 }, { wch: 8 },
        { wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
        { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 14 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '거래처_임대관리현황');

      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `거래처_임대관리현황_${today}.xlsx`);
    },

    // 엑셀 일괄 등록용 표준 양식 다운로드
    downloadTemplate() {
      if (typeof XLSX === 'undefined') {
        alert('엑셀 라이브러리를 로딩 중입니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      const sampleRows = [
        {
          '거래처명': '(주)한국상사',
          '사업자번호': '110-81-12345',
          '대표자': '김철수',
          '전화번호': '02-123-4567',
          '이메일': 'korea@example.com',
          '계약시작일': '2024-01-01',
          '사업장주소': '서울시 강남구 테헤란로 100',
          '누적총결제액': 1200000,
          '비고': '매월 10일 세금계산서 청구',
          '장비명': '캐논 C3922 컬러복합기',
          '시리얼_위치': 'CN-3922-01 / 3층 본사',
          '기본임대료': 85000,
          '흑백기준매수': 1000,
          '흑백초과단가': 10,
          '흑백이번달사용량': 1200,
          '컬러기준매수': 300,
          '컬러초과단가': 100,
          '컬러이번달사용량': 350
        },
        {
          '거래처명': '(주)한국상사',
          '사업자번호': '110-81-12345',
          '대표자': '김철수',
          '전화번호': '02-123-4567',
          '이메일': 'korea@example.com',
          '계약시작일': '2024-01-01',
          '사업장주소': '서울시 강남구 테헤란로 100',
          '누적총결제액': 1200000,
          '비고': '2대째 장비 등록 예시',
          '장비명': 'HP OfficeJet Pro 9010',
          '시리얼_위치': 'HP-9010-02 / 3층 상담실',
          '기본임대료': 35000,
          '흑백기준매수': 500,
          '흑백초과단가': 12,
          '흑백이번달사용량': 480,
          '컬러기준매수': 200,
          '컬러초과단가': 90,
          '컬러이번달사용량': 220
        },
        {
          '거래처명': '새한학원',
          '사업자번호': '211-85-67890',
          '대표자': '박영희',
          '전화번호': '010-9876-5432',
          '이메일': 'aehan@edu.com',
          '계약시작일': '2024-03-15',
          '사업장주소': '서울시 송파구 위례성대로 50 2층',
          '누적총결제액': 600000,
          '비고': '단일 장비 등록 예시',
          '장비명': '신도리코 D420',
          '시리얼_위치': 'SND-420-99 / 교무실',
          '기본임대료': 110000,
          '흑백기준매수': 3000,
          '흑백초과단가': 8,
          '흑백이번달사용량': 3500,
          '컬러기준매수': 500,
          '컬러초과단가': 80,
          '컬러이번달사용량': 400
        }
      ];

      const ws = XLSX.utils.json_to_sheet(sampleRows);
      ws['!cols'] = [
        { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 20 },
        { wch: 12 }, { wch: 30 }, { wch: 14 }, { wch: 20 },
        { wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '거래처일괄등록양식');
      XLSX.writeFile(wb, '거래처_일괄등록_양식.xlsx');
    },

    // 엑셀 파일 업로드 및 일괄 등록 (중복 체크 포함)
    handleExcelUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      if (typeof XLSX === 'undefined') {
        alert('엑셀 파싱 라이브러리를 로딩 중입니다. 잠시 후 다시 시도해주세요.');
        event.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          const rawRows = XLSX.utils.sheet_to_json(sheet);

          if (!rawRows || rawRows.length === 0) {
            alert('엑셀 시트에 데이터가 없거나 형식이 올바르지 않습니다.');
            event.target.value = '';
            return;
          }

          // 거래처별로 행 그룹핑 (거래처명 또는 사업자번호/전화번호 기준)
          const groupedMap = new Map();

          rawRows.forEach((row, i) => {
            const name = (row['거래처명'] || row['상호'] || '').toString().trim();
            const phone = (row['전화번호'] || row['연락처'] || '').toString().trim();
            const bizNum = (row['사업자번호'] || row['사업자등록번호'] || '').toString().trim();

            if (!name) return; // 거래처명이 없으면 건너뜀

            // 그룹핑 키
            const groupKey = (bizNum ? this.normalizeStr(bizNum) : '') ||
                             (name ? this.normalizeStr(name) : '') ||
                             (phone ? this.normalizeStr(phone) : `row_${i}`);

            if (!groupedMap.has(groupKey)) {
              groupedMap.set(groupKey, {
                name,
                bizNum,
                ceo: (row['대표자'] || row['대표자명'] || '').toString().trim(),
                phone,
                email: (row['이메일'] || '').toString().trim(),
                contractDate: (row['계약시작일'] || row['계약일'] || '').toString().trim(),
                address: (row['사업장주소'] || row['주소'] || '').toString().trim(),
                totalPaid: Number(row['누적총결제액'] || row['총결제금액'] || 0),
                memo: (row['비고'] || '').toString().trim(),
                devices: []
              });
            }

            const clientGroup = groupedMap.get(groupKey);

            // 장비 정보 추출
            const devName = (row['장비명'] || row['기기명'] || row['모델명'] || '').toString().trim();
            if (devName) {
              clientGroup.devices.push({
                id: 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                name: devName,
                serial: (row['시리얼_위치'] || row['시리얼'] || row['설치위치'] || '').toString().trim(),
                baseRent: Number(row['기본임대료'] || row['기본료'] || 0),
                bwBase: Number(row['흑백기준매수'] || row['흑백기본'] || 0),
                bwUnit: Number(row['흑백초과단가'] || row['흑백단가'] || 0),
                bwUsed: Number(row['흑백이번달사용량'] || row['흑백사용량'] || 0),
                colorBase: Number(row['컬러기준매수'] || row['컬러기본'] || 0),
                colorUnit: Number(row['컬러초과단가'] || row['컬러단가'] || 0),
                colorUsed: Number(row['컬러이번달사용량'] || row['컬러사용량'] || 0)
              });
            }
          });

          const uploadClients = Array.from(groupedMap.values());
          if (uploadClients.length === 0) {
            alert('유효한 거래처 정보(거래처명 필수)가 엑셀에서 발견되지 않았습니다.');
            event.target.value = '';
            return;
          }

          const existingClients = this.getClients();
          let duplicateMatches = [];

          // 중복 분석
          uploadClients.forEach(newC => {
            const dup = this.findDuplicate(newC);
            if (dup) {
              duplicateMatches.push({ newC, existing: dup });
            }
          });

          let overwriteDuplicates = false;
          if (duplicateMatches.length > 0) {
            const dupNames = duplicateMatches.map(m => `• ${m.existing.name} (업로드: ${m.newC.name})`).slice(0, 5).join('\n');
            const moreText = duplicateMatches.length > 5 ? `\n외 ${duplicateMatches.length - 5}건...` : '';

            const confirmMsg = `[중복 거래처 ${duplicateMatches.length}건 발견]\n` +
              `업로드 파일에 기존 등록된 거래처(이름, 사업자번호, 전화번호 중 일치)와 중복되는 거래처가 있습니다:\n\n` +
              `${dupNames}${moreText}\n\n` +
              `[확인]: 중복 거래처 정보를 엑셀 내용으로 업데이트(덮어쓰기)\n` +
              `[취소]: 중복 거래처는 건너뛰고 신규 거래처만 등록`;

            overwriteDuplicates = confirm(confirmMsg);
          }

          let addedCount = 0;
          let updatedCount = 0;

          uploadClients.forEach(newC => {
            const dupIndex = existingClients.findIndex(c => {
              const candName  = this.normalizeStr(newC.name);
              const candBiz   = this.normalizeStr(newC.bizNum);
              const candPhone = this.normalizeStr(newC.phone);

              const cName  = this.normalizeStr(c.name);
              const cBiz   = this.normalizeStr(c.bizNum);
              const cPhone = this.normalizeStr(c.phone);

              return (candName && cName && candName === cName) ||
                     (candBiz && cBiz && candBiz === cBiz) ||
                     (candPhone && cPhone && candPhone === cPhone);
            });

            if (dupIndex !== -1) {
              if (overwriteDuplicates) {
                // 기존 거래처 업데이트
                existingClients[dupIndex] = {
                  ...existingClients[dupIndex],
                  ...newC,
                  id: existingClients[dupIndex].id,
                  devices: newC.devices.length > 0 ? newC.devices : existingClients[dupIndex].devices
                };
                updatedCount++;
              }
            } else {
              // 신규 등록
              existingClients.unshift({
                id: 'cli_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                ...newC,
                devices: newC.devices.length > 0 ? newC.devices : [{
                  id: 'dev_' + Date.now(),
                  name: '기본 등록 복합기',
                  serial: '',
                  baseRent: 80000,
                  bwBase: 1000, bwUnit: 10, bwUsed: 1000,
                  colorBase: 300, colorUnit: 100, colorUsed: 300
                }]
              });
              addedCount++;
            }
          });

          this.saveClients(existingClients);
          event.target.value = '';

          alert(`엑셀 일괄 등록이 완료되었습니다!\n- 신규 등록: ${addedCount}건\n- 기존 업데이트: ${updatedCount}건`);
        } catch (err) {
          console.error('엑셀 처리 오류:', err);
          alert('엑셀 파일을 읽는 도중 오류가 발생했습니다: ' + err.message);
          event.target.value = '';
        }
      };

      reader.readAsArrayBuffer(file);
    },

    // 대시보드 메인 홈 통계 수치 연동
    updateGlobalDashboardStats() {
      const clients = this.getClients();
      let totalDevices = 0;
      clients.forEach(c => totalDevices += (c.devices || []).length);

      const elHomeClients = document.getElementById('stat-clients');
      const elHomeRentals = document.getElementById('stat-rentals');
      if (elHomeClients) elHomeClients.textContent = clients.length.toLocaleString();
      if (elHomeRentals) elHomeRentals.textContent = totalDevices.toLocaleString();
    },

    // HTML 이스케이프 유틸
    escapeHtml(str) {
      if (!str) return '';
      return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    // 초기화
    init() {
      this.renderTable();
      this.updateGlobalDashboardStats();

      // 모달 바깥 클릭 시 닫기
      const modal = document.getElementById('clientModal');
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.closeModal();
        });
      }

      // 모달 ESC 키로 닫기
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
          this.closeModal();
        }
      });
    }
  };

  // 전역 노출
  window.ClientManager = ClientManager;

  // ClientManager 초기화 실행
  ClientManager.init();

}); // END DOMContentLoaded


