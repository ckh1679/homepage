// 범용 HTML 이스케이프 유틸리티 (전역 스코프)
function escapeHtml(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

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

    if (pageId === 'rental-analysis' && window.ProfitManager) {
      window.ProfitManager.render();
    }
    if (pageId === 'clients' && window.ClientManager) {
      window.ClientManager.renderTable();
    }
    if (pageId === 'items' && window.SuppliesManager) {
      window.SuppliesManager.render();
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
    escapeHtml: escapeHtml,

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
            location: '7층 본사 기획실',
            serial: 'CN-3922-8812',
            baseRent: 85000,
            bwBase: 1000,
            bwUnit: 10,
            bwPrev: 27050,
            bwTotal: 28500,
            bwUsed: 1450,
            colorBase: 300,
            colorUnit: 100,
            colorPrev: 8980,
            colorTotal: 9400,
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
            location: '본관 3층 교무실',
            serial: 'SND-420-1092',
            baseRent: 110000,
            bwBase: 2500,
            bwUnit: 8,
            bwPrev: 60400,
            bwTotal: 64200,
            bwUsed: 3800,
            colorBase: 500,
            colorUnit: 80,
            colorPrev: 14650,
            colorTotal: 15300,
            colorUsed: 650
          },
          {
            id: 'dev_202',
            name: 'HP OfficeJet Pro 9010 잉크젯',
            location: '1층 상담데스크',
            serial: 'HP-9010-4491',
            baseRent: 35000,
            bwBase: 800,
            bwUnit: 12,
            bwPrev: 11650,
            bwTotal: 12400,
            bwUsed: 750,
            colorBase: 200,
            colorUnit: 90,
            colorPrev: 4570,
            colorTotal: 4800,
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
            location: '5층 메인 사무실',
            serial: 'FX-3060-771',
            baseRent: 95000,
            bwBase: 1500,
            bwUnit: 10,
            bwPrev: 41400,
            bwTotal: 43500,
            bwUsed: 2100,
            colorBase: 400,
            colorUnit: 100,
            colorPrev: 10820,
            colorTotal: 11200,
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

    METER_STORAGE_KEY: 'pm_meter_history',

    // 검침 이력 로드
    getMeterHistory() {
      try {
        const raw = localStorage.getItem(this.METER_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.error('검침 이력 로드 실패:', e);
        return [];
      }
    },

    // 검침 이력 저장
    saveMeterHistory(history) {
      try {
        localStorage.setItem(this.METER_STORAGE_KEY, JSON.stringify(history));
      } catch (e) {
        console.error('검침 이력 저장 실패:', e);
      }
    },

    // 현재 연월 YYYY-MM
    getCurrentMonthStr() {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    },

    // 오늘 날짜 YYYY-MM-DD
    getTodayStr() {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    // 거래처 데이터로부터 당월(또는 지정월) 검침 스냅샷 생성 및 동기화
    syncMeterFromClient(client, targetMonth = null) {
      if (!client || !client.id) return null;
      const month = targetMonth || this.getCurrentMonthStr();
      const history = this.getMeterHistory();

      const devices = (client.devices || []).map(d => {
        const dc = this.calcDevice(d);
        const loc = d.location || (d.serial && d.serial.includes('/') ? d.serial.split('/')[1].trim() : '') || '메인 사무실';
        const sn = d.serial && d.serial.includes('/') ? d.serial.split('/')[0].trim() : (d.serial || '-');
        return {
          id: d.id,
          name: d.name,
          location: loc,
          serial: sn,
          baseRent: dc.baseRent,
          bwBase: dc.bwBase,
          bwUnit: dc.bwUnit,
          bwPrev: dc.bwPrev,
          bwTotal: dc.bwTotal,
          bwUsed: dc.bwUsed,
          bwOver: dc.bwOver,
          bwExtra: dc.bwExtra,
          colorBase: dc.colorBase,
          colorUnit: dc.colorUnit,
          colorPrev: dc.colorPrev,
          colorTotal: dc.colorTotal,
          colorUsed: dc.colorUsed,
          colorOver: dc.colorOver,
          colorExtra: dc.colorExtra,
          totalUsage: dc.totalUsage,
          discount: dc.discount, // 장비별 할인금액 포함
          supply: dc.supply,
          vat: dc.vat,
          total: dc.total
        };
      });

      const totals = this.calcClientTotals(client);
      const record = {
        id: `meter_${client.id}_${month}`,
        clientId: client.id,
        clientName: client.name,
        bizNum: client.bizNum || '',
        ceo: client.ceo || '',
        phone: client.phone || '',
        email: client.email || '',
        address: client.address || '',
        month: month,
        readingDate: this.getTodayStr(),
        devices: devices,
        summary: totals,
        updatedAt: new Date().toISOString()
      };

      const existingIdx = history.findIndex(h => h.clientId === client.id && h.month === month);
      if (existingIdx !== -1) {
        history[existingIdx] = { ...history[existingIdx], ...record };
      } else {
        history.push(record);
      }

      this.saveMeterHistory(history);
      return record;
    },

    // 특정 거래처의 특정 월 검침 레코드 가져오기 (없으면 현재 거래처 데이터로 초기화)
    getMeterRecord(clientId, targetMonth = null) {
      const month = targetMonth || this.getCurrentMonthStr();
      const history = this.getMeterHistory();
      let record = history.find(h => String(h.clientId) === String(clientId) && h.month === month);
      if (!record) {
        const clients = this.getClients();
        const client = clients.find(c => String(c.id) === String(clientId));
        if (client) {
          record = this.syncMeterFromClient(client, month);
        }
      }
      return record;
    },

    // 장비별 계산 (전월누적/당월누적 -> 이번달 사용량 자동 계산, 초과금액, 공급가, VAT, 월임대료)
    calcDevice(dev, vatType = 'tax') {
      const bwBase    = Number(dev.bwBase) || 0;
      const bwUnit    = Number(dev.bwUnit) || 0;
      const bwPrev    = Number(dev.bwPrev) || 0;
      const bwTotal   = Number(dev.bwTotal) || 0;

      // 당월 누적 - 전월 누적으로 이번달 흑백 사용량 자동 계산
      let bwUsed = Number(dev.bwUsed) || 0;
      if (bwTotal > 0 && bwPrev > 0 && bwTotal >= bwPrev) {
        bwUsed = bwTotal - bwPrev;
      }

      const colorBase = Number(dev.colorBase) || 0;
      const colorUnit = Number(dev.colorUnit) || 0;
      const colorPrev = Number(dev.colorPrev) || 0;
      const colorTotal= Number(dev.colorTotal) || 0;

      // 당월 누적 - 전월 누적으로 이번달 컬러 사용량 자동 계산
      let colorUsed = Number(dev.colorUsed) || 0;
      if (colorTotal > 0 && colorPrev > 0 && colorTotal >= colorPrev) {
        colorUsed = colorTotal - colorPrev;
      }

      const baseRent  = Number(dev.baseRent) || 0;

      const bwOver    = Math.max(0, bwUsed - bwBase);
      const bwExtra   = bwOver * bwUnit;

      const colorOver  = Math.max(0, colorUsed - colorBase);
      const colorExtra = colorOver * colorUnit;

      const totalUsage = bwTotal + colorTotal; // 기기 총 누적 인쇄 매수

      const extraTotal = bwExtra + colorExtra;
      const rawSupply  = baseRent + extraTotal;
      const discount   = Math.max(0, Number(dev.discount) || 0);
      const supply     = Math.max(0, rawSupply - discount);
      // 부가세 면제(free) 업체인 경우 VAT는 0원 처리
      const vat        = (vatType === 'free') ? 0 : Math.round(supply * 0.1);
      const total      = supply + vat;

      return {
        baseRent,
        bwBase, bwUnit, bwPrev, bwTotal, bwUsed, bwOver, bwExtra,
        colorBase, colorUnit, colorPrev, colorTotal, colorUsed, colorOver, colorExtra,
        totalUsage,
        extraTotal,
        rawSupply,
        discount,
        supply,
        vat,
        total
      };
    },

    // 거래처 전체 합산 계산
    calcClientTotals(client) {
      const devices = client.devices || [];
      const vatType = client.vatType || 'tax'; // 'tax': 일반과세(10%), 'free': 부가세 면제/제외(0%)
      let totalBaseRent   = 0;
      let totalBwExtra    = 0;
      let totalColorExtra = 0;
      let totalExtra      = 0;
      let totalRawSupply  = 0;
      let totalDiscount   = 0;
      let discountedSupply = 0;
      let totalVat        = 0;
      let totalMonthBill  = 0;
      let totalCumulativeUsage = 0;

      devices.forEach(dev => {
        const c = this.calcDevice(dev, vatType);
        totalBaseRent   += c.baseRent;
        totalBwExtra    += c.bwExtra;
        totalColorExtra += c.colorExtra;
        totalExtra      += c.extraTotal;
        totalRawSupply  += c.rawSupply; // 기본임대료 + 추가금액 (할인 전 순수 공급가)
        totalDiscount   += c.discount;  // 장비별 할인액 합계
        discountedSupply += c.supply;   // 할인 후 공급가액 합계
        totalVat        += c.vat;       // 부가세(면세면 0원) 합계
        totalMonthBill  += c.total;     // 최종 청구금액
        totalCumulativeUsage += c.totalUsage;
      });

      return {
        vatType,
        deviceCount: devices.length,
        totalBaseRent,
        totalBwExtra,
        totalColorExtra,
        totalExtra,
        totalRawSupply,                 // 할인 전 순수 공급가액 합계
        totalSupply: totalRawSupply,    // 명확한 표준화: 할인 전 총 공급가액
        totalDiscount,                  // 할인금액 합계
        discountAmount: totalDiscount,  // 모달/정산 일관성용 필드
        discountedSupply,               // 할인 후 공급가액
        finalVat: totalVat,             // 부가세 (면세면 0원)
        finalBill: totalMonthBill,      // 최종 청구액
        totalVat,
        totalMonthBill,
        totalBill: totalMonthBill,
        totalCumulativeUsage,
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
        if (excludeId && String(c.id) === String(excludeId)) return false;
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
      let statTotalMonthPaid = 0; // 금월 누적 결제금액 (완납 업체 청구금액 합산 + 부분납 실 입금액)

      const curMonth = this.getCurrentMonthStr();
      clients.forEach(c => {
        const t = this.calcClientTotals(c);
        const rec = this.getMeterRecord(c.id, curMonth);
        const meterSummary = rec && rec.summary ? rec.summary : null;
        const settlement = rec && rec.settlement ? rec.settlement : null;

        // 할인금액 산출 (정산 모달에 저장된 discountAmount 우선 -> 검침 요약 -> 장비 할인합계)
        const discountAmount = (settlement && settlement.discountAmount !== undefined)
          ? Number(settlement.discountAmount) || 0
          : ((meterSummary && meterSummary.discountAmount !== undefined)
              ? Number(meterSummary.discountAmount) || 0
              : (t.totalDiscount || 0));

        // 순수 할인 전 공급가 (기본임대료 + 추가금액)
        const rawSupply = (meterSummary && meterSummary.totalRawSupply !== undefined)
          ? Number(meterSummary.totalRawSupply) || 0
          : (t.totalRawSupply || (t.totalBaseRent + t.totalExtra));

        // 할인 후 공급가액 (이중 할인 차감 방지)
        let dispSupply;
        if (settlement && settlement.discountedSupply !== undefined) {
          dispSupply = Number(settlement.discountedSupply) || 0;
        } else if (meterSummary && meterSummary.discountedSupply !== undefined) {
          dispSupply = Number(meterSummary.discountedSupply) || 0;
        } else {
          dispSupply = Math.max(0, rawSupply - discountAmount);
        }

        const clientVatType = (settlement && settlement.vatType) ||
                              (meterSummary && meterSummary.vatType) ||
                              c.vatType || 'tax';
        const isClientTaxFree = (clientVatType === 'free');

        // V.A.T (면세업체면 0원, 일반과세면 할인 후 공급가액 기준 10%)
        let dispVat;
        if (isClientTaxFree) {
          dispVat = 0;
        } else if (settlement && settlement.finalVat !== undefined) {
          dispVat = Number(settlement.finalVat) || 0;
        } else if (meterSummary && meterSummary.finalVat !== undefined) {
          dispVat = Number(meterSummary.finalVat) || 0;
        } else {
          dispVat = Math.round(dispSupply * 0.1);
        }

        // 이번달 최종 청구금액 (공급가 + V.A.T)
        let bill;
        if (settlement && settlement.finalBill !== undefined) {
          bill = Number(settlement.finalBill) || 0;
        } else if (meterSummary && meterSummary.finalBill !== undefined) {
          bill = Number(meterSummary.finalBill) || 0;
        } else {
          bill = dispSupply + dispVat;
        }

        const paidAmount = settlement ? (Number(settlement.paidAmount) || 0) : 0;

        // 완납처리된 업체는 청구금액 합산, 부분입금은 실제 입금액 합산
        if (paidAmount >= bill && bill > 0) {
          statTotalMonthPaid += bill;
        } else if (paidAmount > 0) {
          statTotalMonthPaid += paidAmount;
        }

        statTotalDevices   += t.deviceCount;
        statTotalMonthBill += bill;
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
      if (elTotalPaid) elTotalPaid.textContent = statTotalMonthPaid.toLocaleString() + '원';
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
        // 원본 clients 배열에서의 실제 인덱스 (순서 이동용)
        const realIdx = clients.findIndex(c => String(c.id) === String(client.id));
        const isFirst = realIdx === 0;
        const isLast = realIdx === clients.length - 1;

        const totals = this.calcClientTotals(client);
        const devices = client.devices || [];

        // 당월 검침 및 정산 레코드 조회
        const curRecord = this.getMeterRecord(client.id, curMonth);
        const meterSummary = curRecord && curRecord.summary ? curRecord.summary : null;
        const settlement = curRecord && curRecord.settlement ? curRecord.settlement : null;

        // 정산 모달 또는 거래처 장비별 할인금액 산출
        const discountAmount = (settlement && settlement.discountAmount !== undefined)
          ? Number(settlement.discountAmount) || 0
          : ((meterSummary && meterSummary.discountAmount !== undefined)
              ? Number(meterSummary.discountAmount) || 0
              : (totals.totalDiscount || 0));

        // 순수 할인 전 공급가액 (기본임대료 + 추가금액)
        const rawSupply = (meterSummary && meterSummary.totalRawSupply !== undefined)
          ? Number(meterSummary.totalRawSupply) || 0
          : (totals.totalRawSupply || (totals.totalBaseRent + totals.totalExtra));

        // 할인 후 공급가액 (절대 이중 차감되지 않도록 단일 계산)
        let dispSupply;
        if (settlement && settlement.discountedSupply !== undefined) {
          dispSupply = Number(settlement.discountedSupply) || 0;
        } else if (meterSummary && meterSummary.discountedSupply !== undefined) {
          dispSupply = Number(meterSummary.discountedSupply) || 0;
        } else {
          dispSupply = Math.max(0, rawSupply - discountAmount);
        }

        const clientVatType = (settlement && settlement.vatType) ||
                              (meterSummary && meterSummary.vatType) ||
                              client.vatType || 'tax';
        const isClientTaxFree = (clientVatType === 'free');

        // V.A.T (면세업체면 0원, 일반과세면 할인 후 공급가액 기준 10%)
        let dispVat;
        if (isClientTaxFree) {
          dispVat = 0;
        } else if (settlement && settlement.finalVat !== undefined) {
          dispVat = Number(settlement.finalVat) || 0;
        } else if (meterSummary && meterSummary.finalVat !== undefined) {
          dispVat = Number(meterSummary.finalVat) || 0;
        } else {
          dispVat = Math.round(dispSupply * 0.1);
        }

        // 이번달 최종 청구금액 (공급가 + V.A.T)
        let curBill;
        if (settlement && settlement.finalBill !== undefined) {
          curBill = Number(settlement.finalBill) || 0;
        } else if (meterSummary && meterSummary.finalBill !== undefined) {
          curBill = Number(meterSummary.finalBill) || 0;
        } else {
          curBill = dispSupply + dispVat;
        }

        const st = settlement || {
          paidAmount: 0,
          unpaidAmount: curBill,
          taxStatus: 'unissued',
          paidDate: '',
          taxDate: '',
          discountAmount: discountAmount,
          discountedSupply: dispSupply,
          finalVat: dispVat,
          finalBill: curBill
        };

        const paidAmount = Number(st.paidAmount) || 0;
        const unpaidAmount = (st.unpaidAmount !== undefined && st.finalBill === curBill)
          ? Number(st.unpaidAmount)
          : Math.max(0, curBill - paidAmount);

        // 세금계산서 배지
        let taxBadge = '';
        if (st.taxStatus === 'issued') {
          taxBadge = `<span class="badge-tax issued" onclick="ClientManager.toggleTaxStatus('${client.id}', event)" title="발행일: ${st.taxDate || '-'} (클릭 시 미발행 전환)"><i class="fa fa-check-circle"></i> 발행완료</span>`;
        } else if (st.taxStatus === 'cashReceipt') {
          taxBadge = `<span class="badge-tax issued" onclick="ClientManager.toggleTaxStatus('${client.id}', event)" title="현금영수증 (클릭 시 미발행 전환)"><i class="fa fa-receipt"></i> 현금영수증</span>`;
        } else if (st.taxStatus === 'na') {
          taxBadge = `<span class="badge-tax unissued" onclick="ClientManager.toggleTaxStatus('${client.id}', event)" title="영수 (클릭 시 발행완료 전환)"><i class="fa fa-minus"></i> 영수</span>`;
        } else {
          taxBadge = `<span class="badge-tax unissued" onclick="ClientManager.toggleTaxStatus('${client.id}', event)" title="클릭 시 [발행완료]로 즉시 전환"><i class="fa fa-clock"></i> 미발행</span>`;
        }

        // 수금 / 미수금 상태 배지 (원클릭 미납 <-> 완납 토글 지원)
        let payBadge = '';
        if (paidAmount >= curBill && curBill > 0) {
          payBadge = `<span class="badge-pay paid" onclick="ClientManager.togglePayStatus('${client.id}', event)" title="완납 상태 (클릭 시 미납 전환)"><i class="fa fa-check"></i> 완납</span>`;
        } else if (paidAmount > 0) {
          payBadge = `<span class="badge-pay partial" onclick="ClientManager.togglePayStatus('${client.id}', event)" title="입금: ${paidAmount.toLocaleString()}원 / 미수: ${unpaidAmount.toLocaleString()}원 (클릭 시 전액완납 전환)"><i class="fa fa-adjust"></i> 부분 (${unpaidAmount.toLocaleString()}원 미수)</span>`;
        } else {
          payBadge = `<span class="badge-pay unpaid" onclick="ClientManager.togglePayStatus('${client.id}', event)" title="미납 총액: ${unpaidAmount.toLocaleString()}원 (클릭 시 전액완납 전환)"><i class="fa fa-exclamation-circle"></i> 미납 (${unpaidAmount.toLocaleString()}원)</span>`;
        }

        // 주 행 (Parent Row)
        html += `
          <tr class="accordion-parent" id="row-${client.id}" onclick="ClientManager.toggleAccordion('${client.id}', event)">
            <td style="text-align:center;">
              <span class="toggle-icon"><i class="fa fa-chevron-right"></i></span>
            </td>
            <td>${idx + 1}</td>
            <td>
              <strong style="font-size:14px;color:#fff;">${escapeHtml(client.name)}</strong>
              ${isClientTaxFree ? `<span style="font-size:11px;background:#ecfdf5;color:#059669;padding:1px 6px;border-radius:4px;margin-left:6px;font-weight:700;border:1px solid #a7f3d0;"><i class="fa fa-leaf"></i> 면세</span>` : ''}
              ${client.memo ? `<div style="font-size:11px;color:var(--text-muted);">${escapeHtml(client.memo)}</div>` : ''}
            </td>
            <td style="text-align:center;">
              <span class="status-badge" style="background:rgba(59,130,246,0.15);color:var(--accent-primary);font-weight:700;">
                <i class="fa fa-print"></i> ${totals.deviceCount}대
              </span>
            </td>
            <td style="text-align:right;">${totals.totalBaseRent.toLocaleString()}원</td>
            <td style="text-align:right;color:${totals.totalExtra > 0 ? '#f59e0b' : 'inherit'};font-weight:${totals.totalExtra > 0 ? '600' : 'normal'};">
              ${totals.totalExtra > 0 ? '+' : ''}${totals.totalExtra.toLocaleString()}원
            </td>
            <td style="text-align:right;">
              <strong>${dispSupply.toLocaleString()}원</strong>
              ${discountAmount > 0 ? `<div style="font-size:11px;color:#f59e0b;font-weight:600;white-space:nowrap;margin-top:2px;"><i class="fa fa-tag"></i> -${discountAmount.toLocaleString()}원 할인</div>` : ''}
            </td>
            <td style="text-align:right;color:var(--text-muted);">${isClientTaxFree ? '<span style="color:#059669;font-weight:600;">0원 (면세)</span>' : (dispVat.toLocaleString() + '원')}</td>
            <td style="text-align:right;color:#60a5fa;font-weight:700;font-size:15px;">
              ${curBill.toLocaleString()}원
            </td>
            <td style="text-align:center;" onclick="event.stopPropagation();">${taxBadge}</td>
            <td style="text-align:center;" onclick="event.stopPropagation();">${payBadge}</td>
            <td style="text-align:right;">
              ${(paidAmount >= curBill && curBill > 0)
                ? `<strong style="color:#10b981;font-weight:700;">${curBill.toLocaleString()}원</strong>`
                : (paidAmount > 0
                    ? `<span style="color:#0284c7;font-weight:600;">${paidAmount.toLocaleString()}원</span>`
                    : `<span style="color:var(--text-muted);">0원</span>`
                  )
              }
            </td>
            <td onclick="event.stopPropagation();">
              <div style="display:flex;gap:5px;align-items:center;">
                <!-- 순서 이동 버튼 -->
                <div style="display:flex;flex-direction:column;gap:2px;">
                  <button class="btn-action-icon" style="color:#94a3b8;padding:2px 5px;font-size:10px;${isFirst ? 'opacity:0.3;cursor:default;' : ''}" title="위로 이동" onclick="ClientManager.moveClient('${client.id}', 'up')" ${isFirst ? 'disabled' : ''}>
                    <i class="fa fa-chevron-up"></i>
                  </button>
                  <button class="btn-action-icon" style="color:#94a3b8;padding:2px 5px;font-size:10px;${isLast ? 'opacity:0.3;cursor:default;' : ''}" title="아래로 이동" onclick="ClientManager.moveClient('${client.id}', 'down')" ${isLast ? 'disabled' : ''}>
                    <i class="fa fa-chevron-down"></i>
                  </button>
                </div>
                <button class="btn-action-icon" style="color:#059669;" title="이번달 검침내역 수정 및 수금/세금계산서 정산" onclick="ClientManager.openMeterEditModal('${client.id}', null, event)">
                  <i class="fa fa-calendar-check"></i>
                </button>
                <button class="btn-action-icon" style="color:#dc2626;" title="이번달 검침 청구서 PDF/인쇄" onclick="ClientManager.printClientMeterReport('${client.id}', null, event)">
                  <i class="fa fa-file-pdf"></i>
                </button>
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
            <td colspan="13">
              <div class="device-subtable-wrap">
                <div class="device-subtable-title" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                  <span><i class="fa fa-layer-group"></i> [${escapeHtml(client.name)}] 임대 장비 상세 내역 (${devices.length}대)</span>
                  <div style="margin-left:auto;display:flex;gap:6px;align-items:center;">
                    <button type="button" class="btn-primary-sm" style="padding:4px 10px;font-size:11px;background:#059669;" onclick="ClientManager.openMeterEditModal('${client.id}', null, event)">
                      <i class="fa fa-calendar-check"></i> 이번달 검침 수정
                    </button>
                    <button type="button" class="btn-primary-sm" style="padding:4px 10px;font-size:11px;background:#0284c7;" onclick="ClientManager.exportMeterToExcel('${client.id}', event)">
                      <i class="fa fa-file-excel"></i> 엑셀
                    </button>
                    <button type="button" class="btn-primary-sm" style="padding:4px 10px;font-size:11px;background:#dc2626;" onclick="ClientManager.printClientMeterReport('${client.id}', null, event)">
                      <i class="fa fa-file-pdf"></i> PDF/인쇄
                    </button>
                  </div>
                </div>
                <table class="device-subtable">
                  <thead>
                    <tr>
                      <th style="width:30px;">#</th>
                      <th>장비명 (모델)</th>
                      <th>설치장소</th>
                      <th>시리얼 (S/N)</th>
                      <th>기본임대료</th>
                      <th>흑백 기준/단가</th>
                      <th>흑백 검침 (전월→당월 / 사용량)</th>
                      <th>흑백 추가요금</th>
                      <th>컬러 기준/단가</th>
                      <th>컬러 검침 (전월→당월 / 사용량)</th>
                      <th>컬러 추가요금</th>
                      <th style="background:rgba(56,189,248,0.1);color:#38bdf8;">기기 총누적(카운터)</th>
                      <th>장비별 월합계</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${devices.map((d, dIdx) => {
                      const dc = this.calcDevice(d);
                      const loc = d.location || (d.serial && d.serial.includes('/') ? d.serial.split('/')[1].trim() : '') || '메인 사무실';
                      const sn = d.serial && d.serial.includes('/') ? d.serial.split('/')[0].trim() : (d.serial || '-');

                      // 장비별 할인 분배 로직 (1대인 경우 전액, 복수 장비인 경우 개별할인 또는 공급가 비례 분배)
                      let effectiveDevDiscount = 0;
                      if (devices.length === 1) {
                        effectiveDevDiscount = discountAmount;
                      } else if (totals.totalDiscount === discountAmount && dc.discount > 0) {
                        effectiveDevDiscount = dc.discount;
                      } else if (discountAmount > 0 && rawSupply > 0) {
                        if (dIdx === devices.length - 1) {
                          const prevAllocated = devices.slice(0, -1).reduce((sum, prevDev) => {
                            const prevDc = this.calcDevice(prevDev);
                            return sum + Math.round((prevDc.rawSupply / rawSupply) * discountAmount);
                          }, 0);
                          effectiveDevDiscount = Math.max(0, discountAmount - prevAllocated);
                        } else {
                          effectiveDevDiscount = Math.round((dc.rawSupply / rawSupply) * discountAmount);
                        }
                      }

                      const effectiveDevSupply = Math.max(0, dc.rawSupply - effectiveDevDiscount);
                      const effectiveDevVat = isClientTaxFree ? 0 : Math.round(effectiveDevSupply * 0.1);
                      const effectiveDevTotal = effectiveDevSupply + effectiveDevVat;
                      return `
                        <tr>
                          <td>${dIdx + 1}</td>
                          <td><strong style="color:#e2e8f0;">${escapeHtml(d.name || '-')}</strong></td>
                          <td><span style="color:#60a5fa;font-weight:500;">${escapeHtml(loc)}</span></td>
                          <td><span style="color:#94a3b8;font-size:11px;">${escapeHtml(sn)}</span></td>
                          <td>${dc.baseRent.toLocaleString()}원</td>
                          <td>${dc.bwBase.toLocaleString()}장 / ${dc.bwUnit}원</td>
                          <td>
                            <div><strong>${dc.bwUsed.toLocaleString()}장</strong> <span style="color:#f59e0b;font-size:11px;">(${dc.bwOver > 0 ? '+' + dc.bwOver.toLocaleString() : '0'})</span></div>
                            <div style="font-size:10px;color:var(--text-muted);">${dc.bwPrev.toLocaleString()} → ${dc.bwTotal.toLocaleString()}</div>
                          </td>
                          <td style="color:${dc.bwExtra > 0 ? '#f59e0b' : 'inherit'};font-weight:${dc.bwExtra > 0 ? '600' : 'normal'};">
                            ${dc.bwExtra > 0 ? '+' : ''}${dc.bwExtra.toLocaleString()}원
                          </td>
                          <td>${dc.colorBase.toLocaleString()}장 / ${dc.colorUnit}원</td>
                          <td>
                            <div><strong>${dc.colorUsed.toLocaleString()}장</strong> <span style="color:#f59e0b;font-size:11px;">(${dc.colorOver > 0 ? '+' + dc.colorOver.toLocaleString() : '0'})</span></div>
                            <div style="font-size:10px;color:var(--text-muted);">${dc.colorPrev.toLocaleString()} → ${dc.colorTotal.toLocaleString()}</div>
                          </td>
                          <td style="color:${dc.colorExtra > 0 ? '#f59e0b' : 'inherit'};font-weight:${dc.colorExtra > 0 ? '600' : 'normal'};">
                            ${dc.colorExtra > 0 ? '+' : ''}${dc.colorExtra.toLocaleString()}원
                          </td>
                          <td style="background:rgba(56,189,248,0.03);">
                            <div style="font-weight:700;color:#38bdf8;font-size:13px;">${dc.totalUsage.toLocaleString()}장</div>
                            <div style="font-size:10px;color:var(--text-muted);">흑백 ${dc.bwTotal.toLocaleString()} | 컬러 ${dc.colorTotal.toLocaleString()}</div>
                          </td>
                          <td>
                            <strong style="color:#60a5fa;">${effectiveDevTotal.toLocaleString()}원</strong> <span style="font-size:10px;color:var(--text-muted);">${isClientTaxFree ? '(면세)' : '(VAT포함)'}</span>
                            ${effectiveDevDiscount > 0 ? `<div style="font-size:11px;color:#f59e0b;font-weight:600;"><i class="fa fa-tag"></i> -${effectiveDevDiscount.toLocaleString()}원 할인</div>` : ''}
                          </td>
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

    // 거래처 순서 이동 (위/아래)
    moveClient(clientId, direction) {
      const clients = this.getClients();
      const idx = clients.findIndex(c => String(c.id) === String(clientId));
      if (idx === -1) return;

      if (direction === 'up' && idx === 0) return;          // 이미 최상위
      if (direction === 'down' && idx === clients.length - 1) return; // 이미 최하위

      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      // 두 항목 위치 교환
      [clients[idx], clients[swapIdx]] = [clients[swapIdx], clients[idx]];

      this.saveClients(clients);
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

      const vatSelect = document.getElementById('clVatType');
      if (vatSelect) vatSelect.value = 'tax';

      // 장비 목록 초기화 및 1개 기본 추가
      const devList = document.getElementById('clientDeviceFormList');
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
      const client = clients.find(c => String(c.id) === String(clientId));
      if (!client) {
        alert('해당 거래처 정보를 찾을 수 없습니다.');
        return;
      }

      if (form) form.reset();
      const idInput = document.getElementById('clientId') || document.getElementById('editClientId');
      if (idInput) idInput.value = client.id;
      
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = (val !== undefined && val !== null) ? val : '';
      };

      setVal('clName', client.name);
      setVal('clBizNum', client.bizNum);
      setVal('clCeo', client.ceo);
      setVal('clPhone', client.phone);
      setVal('clEmail', client.email);
      setVal('clContractDate', client.contractDate);
      setVal('clAddress', client.address);
      setVal('clTotalPaid', client.totalPaid || 0);
      setVal('clVatType', client.vatType || 'tax');
      setVal('clMemo', client.memo);

      if (title) title.innerHTML = `<i class="fa fa-edit"></i> 거래처 정보 수정 - [${escapeHtml(client.name)}]`;

      const devList = document.getElementById('clientDeviceFormList');
      if (devList) devList.innerHTML = '';

      const devices = (client.devices && client.devices.length > 0) ? client.devices : [{}];
      devices.forEach(dev => this.addDeviceRow(dev));

      modal.style.display = 'flex';
      this.updateCalcPreview();
    },

    // 모달 닫기
    closeModal() {
      const modal = document.getElementById('clientModal');
      if (modal) modal.style.display = 'none';
    },

    // 장비 폼 행 추가 (장비명, 설치장소, 기본임대료, 흑백/컬러 추가사용료 세부내역)
    addDeviceRow(dev = {}) {
      const devList = document.getElementById('clientDeviceFormList');
      if (!devList) return;

      const idx = devList.querySelectorAll('.device-form-card').length + 1;
      const card = document.createElement('div');
      card.className = 'device-form-card';
      card.dataset.deviceId = dev.id || ('dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));

      const location = dev.location || (dev.serial && dev.serial.includes('/') ? dev.serial.split('/')[1].trim() : '') || '';
      const serial = dev.serial && dev.serial.includes('/') ? dev.serial.split('/')[0].trim() : (dev.serial || '');

      card.innerHTML = `
        <div class="device-card-header">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div class="device-badge-index"><i class="fa fa-print"></i> 장비 #${idx}</div>
            <span style="font-size:12px;color:var(--text-secondary);">
              총 누적: <strong class="dev-card-total-usage" style="color:#38bdf8;">0장</strong> | 
              추가사용료: <strong class="dev-card-extra" style="color:#f59e0b;">0원</strong> | 
              장비 월 청구: <strong class="dev-card-total" style="color:#60a5fa;">0원</strong>
            </span>
          </div>
          <button type="button" class="btn-remove-device" onclick="ClientManager.removeDeviceRow(this)">
            <i class="fa fa-trash"></i> 장비 삭제
          </button>
        </div>

        <div class="form-grid-4">
          <div class="form-group">
            <label>장비명 (모델명) <span class="req">*</span></label>
            <input type="text" class="dev-name" value="${escapeHtml(dev.name || '')}" placeholder="예: 캐논 iR-ADV C3922" required oninput="ClientManager.updateCalcPreview()">
          </div>
          <div class="form-group">
            <label>설치장소 <span class="req">*</span></label>
            <input type="text" class="dev-location" value="${escapeHtml(location)}" placeholder="예: 7층 본사 기획실, 교무실 등" required oninput="ClientManager.updateCalcPreview()">
          </div>
          <div class="form-group">
            <label>시리얼 번호 (S/N)</label>
            <input type="text" class="dev-serial" value="${escapeHtml(serial)}" placeholder="예: CN-3922-8812">
          </div>
          <div class="form-group">
            <label>기본 임대료 (원) <span class="req">*</span></label>
            <input type="number" class="dev-baseRent" value="${dev.baseRent !== undefined ? dev.baseRent : 80000}" min="0" step="1000" required oninput="ClientManager.updateCalcPreview()">
          </div>
        </div>

        <!-- 흑백 추가사용료 설정 & 검침 카운터(전월/당월) & 이번달 사용량 자동계산 -->
        <div style="margin-top:12px;background:rgba(255,255,255,0.02);padding:14px;border-radius:8px;border:1px solid rgba(255,255,255,0.07);">
          <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
            <i class="fa fa-print" style="color:#94a3b8;"></i> 흑백 요금 기준 및 카운터 검침
          </div>
          <div class="form-grid-2" style="margin-bottom:10px;">
            <div class="form-group">
              <label>흑백 기준 매수 (기본제공)</label>
              <input type="number" class="dev-bwBase" value="${dev.bwBase !== undefined ? dev.bwBase : 1000}" min="0" oninput="ClientManager.updateCalcPreview()">
            </div>
            <div class="form-group">
              <label>흑백 초과 단가 (원/장)</label>
              <input type="number" class="dev-bwUnit" value="${dev.bwUnit !== undefined ? dev.bwUnit : 10}" min="0" oninput="ClientManager.updateCalcPreview()">
            </div>
          </div>
          <div class="form-grid-3">
            <div class="form-group">
              <label style="color:#94a3b8;"><i class="fa fa-history"></i> 전월 흑백 누적 (장)</label>
              <input type="number" class="dev-bwPrev" value="${dev.bwPrev !== undefined ? dev.bwPrev : 0}" min="0" placeholder="전월 누적 카운터" oninput="ClientManager.updateUsageFromCounters(this, 'bw')">
            </div>
            <div class="form-group">
              <label style="color:#38bdf8;font-weight:600;"><i class="fa fa-tachometer-alt"></i> 당월 흑백 누적 (장)</label>
              <input type="number" class="dev-bwTotal" value="${dev.bwTotal !== undefined ? dev.bwTotal : 0}" min="0" placeholder="현재 복합기 계수기" oninput="ClientManager.updateUsageFromCounters(this, 'bw')">
            </div>
            <div class="form-group">
              <label style="color:#f59e0b;font-weight:700;"><i class="fa fa-calculator"></i> 이번달 흑백 사용량 (장)</label>
              <input type="number" class="dev-bwUsed" value="${dev.bwUsed !== undefined ? dev.bwUsed : 1000}" min="0" oninput="ClientManager.updateCalcPreview()">
            </div>
          </div>
          <div class="dev-bw-calc-tag" style="font-size:11px;color:#f59e0b;margin-top:6px;padding:4px 8px;background:rgba(245,158,11,0.08);border-radius:4px;">
            흑백 이번달: 0장 | 추가사용료: 0원
          </div>
        </div>

        <!-- 컬러 추가사용료 설정 & 검침 카운터(전월/당월) & 이번달 사용량 자동계산 -->
        <div style="margin-top:12px;background:rgba(255,255,255,0.02);padding:14px;border-radius:8px;border:1px solid rgba(255,255,255,0.07);">
          <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
            <i class="fa fa-palette" style="color:#ec4899;"></i> 컬러 요금 기준 및 카운터 검침
          </div>
          <div class="form-grid-2" style="margin-bottom:10px;">
            <div class="form-group">
              <label>컬러 기준 매수 (기본제공)</label>
              <input type="number" class="dev-colorBase" value="${dev.colorBase !== undefined ? dev.colorBase : 300}" min="0" oninput="ClientManager.updateCalcPreview()">
            </div>
            <div class="form-group">
              <label>컬러 초과 단가 (원/장)</label>
              <input type="number" class="dev-colorUnit" value="${dev.colorUnit !== undefined ? dev.colorUnit : 100}" min="0" oninput="ClientManager.updateCalcPreview()">
            </div>
          </div>
          <div class="form-grid-3">
            <div class="form-group">
              <label style="color:#94a3b8;"><i class="fa fa-history"></i> 전월 컬러 누적 (장)</label>
              <input type="number" class="dev-colorPrev" value="${dev.colorPrev !== undefined ? dev.colorPrev : 0}" min="0" placeholder="전월 누적 카운터" oninput="ClientManager.updateUsageFromCounters(this, 'color')">
            </div>
            <div class="form-group">
              <label style="color:#38bdf8;font-weight:600;"><i class="fa fa-tachometer-alt"></i> 당월 컬러 누적 (장)</label>
              <input type="number" class="dev-colorTotal" value="${dev.colorTotal !== undefined ? dev.colorTotal : 0}" min="0" placeholder="현재 복합기 계수기" oninput="ClientManager.updateUsageFromCounters(this, 'color')">
            </div>
            <div class="form-group">
              <label style="color:#f59e0b;font-weight:700;"><i class="fa fa-calculator"></i> 이번달 컬러 사용량 (장)</label>
              <input type="number" class="dev-colorUsed" value="${dev.colorUsed !== undefined ? dev.colorUsed : 300}" min="0" oninput="ClientManager.updateCalcPreview()">
            </div>
          </div>
          <div class="dev-color-calc-tag" style="font-size:11px;color:#f59e0b;margin-top:6px;padding:4px 8px;background:rgba(245,158,11,0.08);border-radius:4px;">
            컬러 이번달: 0장 | 추가사용료: 0원
          </div>
        </div>

        <!-- 장비별 할인금액 -->
        <div style="margin-top:10px;background:rgba(245,158,11,0.06);padding:12px 14px;border-radius:8px;border:1px solid rgba(245,158,11,0.2);display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:6px;">
            <i class="fa fa-tag" style="color:#b45309;"></i>
            <span style="font-size:13px;font-weight:700;color:#92400e;">장비 할인금액</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:180px;">
            <input type="number" class="dev-discount" value="${dev.discount !== undefined ? dev.discount : 0}" min="0" step="1"
              style="flex:1;max-width:200px;font-weight:700;color:#b45309;background:#fffbeb;border:1.5px solid #fbbf24;border-radius:6px;padding:6px 10px;text-align:right;"
              placeholder="0"
              oninput="ClientManager.updateCalcPreview()">
            <span style="font-size:12px;color:#78716c;white-space:nowrap;">원 할인 차감</span>
          </div>
          <div class="dev-discount-tag" style="font-size:11px;color:#b45309;padding:3px 8px;background:rgba(245,158,11,0.12);border-radius:4px;">할인 0원 적용</div>
        </div>
      `;

      devList.appendChild(card);
      this.renumberDeviceCards();
      this.updateCalcPreview();
    },

    // 전월 누적 - 당월 누적으로 이번달 사용량 자동 계산
    updateUsageFromCounters(inputEl, type) {
      const card = inputEl ? inputEl.closest('.device-form-card') : null;
      if (!card) return;

      if (type === 'bw') {
        const prev = Number(card.querySelector('.dev-bwPrev')?.value) || 0;
        const total = Number(card.querySelector('.dev-bwTotal')?.value) || 0;
        const usedEl = card.querySelector('.dev-bwUsed');
        if (total > 0 || prev > 0) {
          const diff = Math.max(0, total - prev);
          if (usedEl) usedEl.value = diff;
        }
      } else if (type === 'color') {
        const prev = Number(card.querySelector('.dev-colorPrev')?.value) || 0;
        const total = Number(card.querySelector('.dev-colorTotal')?.value) || 0;
        const usedEl = card.querySelector('.dev-colorUsed');
        if (total > 0 || prev > 0) {
          const diff = Math.max(0, total - prev);
          if (usedEl) usedEl.value = diff;
        }
      }

      this.updateCalcPreview();
    },

    // 장비 폼 행 삭제
    removeDeviceRow(btn) {
      const devList = document.getElementById('clientDeviceFormList');
      const cards = devList ? devList.querySelectorAll('.device-form-card') : [];
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
      const devList = document.getElementById('clientDeviceFormList');
      if (!devList) return;
      const cards = devList.querySelectorAll('.device-form-card');
      cards.forEach((c, i) => {
        const badge = c.querySelector('.device-badge-index');
        if (badge) badge.innerHTML = `<i class="fa fa-print"></i> 장비 #${i + 1}`;
      });
    },

    // 모달 내 실시간 정산 미리보기 업데이트
    updateCalcPreview() {
      const devList = document.getElementById('clientDeviceFormList');
      if (!devList) return;

      const cards = devList.querySelectorAll('.device-form-card');
      let sumBaseRent   = 0;
      let sumBwExtra    = 0;
      let sumColorExtra = 0;
      let sumDiscount   = 0; // 장비별 할인금액 합계

      cards.forEach(card => {
        const baseRent  = Number(card.querySelector('.dev-baseRent')?.value) || 0;
        const bwBase    = Number(card.querySelector('.dev-bwBase')?.value) || 0;
        const bwUnit    = Number(card.querySelector('.dev-bwUnit')?.value) || 0;
        const bwPrev    = Number(card.querySelector('.dev-bwPrev')?.value) || 0;
        const bwTotal   = Number(card.querySelector('.dev-bwTotal')?.value) || 0;
        let bwUsed      = Number(card.querySelector('.dev-bwUsed')?.value) || 0;

        const colorBase = Number(card.querySelector('.dev-colorBase')?.value) || 0;
        const colorUnit = Number(card.querySelector('.dev-colorUnit')?.value) || 0;
        const colorPrev = Number(card.querySelector('.dev-colorPrev')?.value) || 0;
        const colorTotal= Number(card.querySelector('.dev-colorTotal')?.value) || 0;
        let colorUsed   = Number(card.querySelector('.dev-colorUsed')?.value) || 0;

        const bwOver = Math.max(0, bwUsed - bwBase);
        const bwExtra = bwOver * bwUnit;
        const colorOver = Math.max(0, colorUsed - colorBase);
        const colorExtra = colorOver * colorUnit;

        // 장비별 할인금액
        const devDiscount = Math.max(0, Number(card.querySelector('.dev-discount')?.value) || 0);

        const devExtraTotal = bwExtra + colorExtra;
        const devSupplyBeforeDiscount = baseRent + devExtraTotal;
        const devSupply = Math.max(0, devSupplyBeforeDiscount - devDiscount);
        const isFree = (document.getElementById('clVatType')?.value === 'free');
        const devTotal = isFree ? devSupply : Math.round(devSupply * 1.1);

        const devTotalUsage = bwTotal + colorTotal;

        // 카드 내 실시간 텍스트 반영
        const bwTag = card.querySelector('.dev-bw-calc-tag');
        if (bwTag) {
          if (bwTotal > 0 && bwPrev > 0 && bwTotal < bwPrev) {
            bwTag.innerHTML = `<span style="color:#ef4444;"><i class="fa fa-exclamation-triangle"></i> 경고: 당월 누적(${bwTotal.toLocaleString()})이 전월 누적(${bwPrev.toLocaleString()})보다 작습니다!</span>`;
          } else {
            bwTag.innerHTML = `흑백 이번달: <strong>${bwUsed.toLocaleString()}장</strong> (당월 ${bwTotal.toLocaleString()} - 전월 ${bwPrev.toLocaleString()}) | 기준초과: <strong>${bwOver.toLocaleString()}장</strong> | 추가요금: <strong style="color:#f59e0b;">+${bwExtra.toLocaleString()}원</strong>`;
          }
        }

        const colorTag = card.querySelector('.dev-color-calc-tag');
        if (colorTag) {
          if (colorTotal > 0 && colorPrev > 0 && colorTotal < colorPrev) {
            colorTag.innerHTML = `<span style="color:#ef4444;"><i class="fa fa-exclamation-triangle"></i> 경고: 당월 누적(${colorTotal.toLocaleString()})이 전월 누적(${colorPrev.toLocaleString()})보다 작습니다!</span>`;
          } else {
            colorTag.innerHTML = `컬러 이번달: <strong>${colorUsed.toLocaleString()}장</strong> (당월 ${colorTotal.toLocaleString()} - 전월 ${colorPrev.toLocaleString()}) | 기준초과: <strong>${colorOver.toLocaleString()}장</strong> | 추가요금: <strong style="color:#f59e0b;">+${colorExtra.toLocaleString()}원</strong>`;
          }
        }

        // 할인금액 안내 태그
        const discountTag = card.querySelector('.dev-discount-tag');
        if (discountTag) {
          discountTag.textContent = devDiscount > 0 ? `할인 -${devDiscount.toLocaleString()}원 적용` : '할인 없음';
          discountTag.style.color = devDiscount > 0 ? '#b45309' : '#94a3b8';
        }

        const usageBadge = card.querySelector('.dev-card-total-usage');
        if (usageBadge) usageBadge.textContent = devTotalUsage.toLocaleString() + '장';

        const extraBadge = card.querySelector('.dev-card-extra');
        if (extraBadge) extraBadge.textContent = devExtraTotal.toLocaleString() + '원';

        const totalBadge = card.querySelector('.dev-card-total');
        if (totalBadge) {
          const vatText = isFree ? '(면세)' : `(VAT포함 ${devTotal.toLocaleString()}원)`;
          totalBadge.textContent = devDiscount > 0
            ? `${devSupplyBeforeDiscount.toLocaleString()}원 → 할인 후 ${devSupply.toLocaleString()}원 ${vatText}`
            : `${devSupply.toLocaleString()}원 ${vatText}`;
        }

        sumBaseRent   += baseRent;
        sumBwExtra    += bwExtra;
        sumColorExtra += colorExtra;
        sumDiscount   += devDiscount;
      });

      const formVatType = document.getElementById('clVatType')?.value || 'tax';
      const isFormFree = formVatType === 'free';
      const sumSupplyBeforeDiscount = sumBaseRent + sumBwExtra + sumColorExtra;
      const sumDiscount_ = sumDiscount; // alias
      const sumSupply = Math.max(0, sumSupplyBeforeDiscount - sumDiscount_);
      const sumVat    = isFormFree ? 0 : Math.round(sumSupply * 0.1);
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
      if (elVat)   elVat.textContent   = isFormFree ? '0원 (면세)' : (sumVat.toLocaleString() + '원');
      if (elTotal) elTotal.textContent = sumTotal.toLocaleString() + '원';
    },

    // 폼 요약 업데이트 (별칭)
    updateFormSummary() {
      this.updateCalcPreview();
    },

    // 거래처 및 임대 장비 저장 (신규 등록 및 수정 완벽 지원)
    saveClient(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      const idInput = document.getElementById('clientId') || document.getElementById('editClientId');
      const id = idInput ? idInput.value.trim() : '';

      const nameInput = document.getElementById('clName');
      const name = nameInput ? nameInput.value.trim() : '';

      const bizNumInput = document.getElementById('clBizNum');
      const bizNum = bizNumInput ? bizNumInput.value.trim() : '';

      const ceoInput = document.getElementById('clCeo');
      const ceo = ceoInput ? ceoInput.value.trim() : '';

      const phoneInput = document.getElementById('clPhone');
      const phone = phoneInput ? phoneInput.value.trim() : '';

      const emailInput = document.getElementById('clEmail');
      const email = emailInput ? emailInput.value.trim() : '';

      const contractDateInput = document.getElementById('clContractDate');
      const contractDate = contractDateInput ? contractDateInput.value : '';

      const addressInput = document.getElementById('clAddress');
      const address = addressInput ? addressInput.value.trim() : '';

      const totalPaidInput = document.getElementById('clTotalPaid');
      const totalPaid = totalPaidInput ? (Number(totalPaidInput.value) || 0) : 0;

      const memoInput = document.getElementById('clMemo');
      const memo = memoInput ? memoInput.value.trim() : '';

      const vatTypeInput = document.getElementById('clVatType');
      const vatType = vatTypeInput ? vatTypeInput.value : 'tax';

      if (!name) {
        alert('거래처명을 입력해주세요.');
        if (nameInput) nameInput.focus();
        return;
      }
      if (!phone) {
        alert('연락처(전화번호)를 입력해주세요.');
        if (phoneInput) phoneInput.focus();
        return;
      }

      // 장비 목록 수집
      const devList = document.getElementById('clientDeviceFormList');
      const cards = devList ? devList.querySelectorAll('.device-form-card') : [];
      if (!cards || cards.length === 0) {
        alert('최소 1대 이상의 임대 장비를 추가해주세요.');
        return;
      }

      const devices = [];
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const devName = card.querySelector('.dev-name')?.value.trim();
        const devLocation = card.querySelector('.dev-location')?.value.trim() || '기본 설치장소';
        const devSerial = card.querySelector('.dev-serial')?.value.trim() || '';
        
        if (!devName) {
          alert(`장비 #${i + 1}의 장비명(모델명)을 입력해주세요.`);
          card.querySelector('.dev-name')?.focus();
          return;
        }

        devices.push({
          id: card.dataset.deviceId || ('dev_' + Date.now() + '_' + i),
          name: devName,
          location: devLocation,
          serial: devSerial,
          baseRent: Number(card.querySelector('.dev-baseRent')?.value) || 0,
          bwBase: Number(card.querySelector('.dev-bwBase')?.value) || 0,
          bwUnit: Number(card.querySelector('.dev-bwUnit')?.value) || 0,
          bwPrev: Number(card.querySelector('.dev-bwPrev')?.value) || 0,
          bwTotal: Number(card.querySelector('.dev-bwTotal')?.value) || 0,
          bwUsed: Number(card.querySelector('.dev-bwUsed')?.value) || 0,
          colorBase: Number(card.querySelector('.dev-colorBase')?.value) || 0,
          colorUnit: Number(card.querySelector('.dev-colorUnit')?.value) || 0,
          colorPrev: Number(card.querySelector('.dev-colorPrev')?.value) || 0,
          colorTotal: Number(card.querySelector('.dev-colorTotal')?.value) || 0,
          colorUsed: Number(card.querySelector('.dev-colorUsed')?.value) || 0,
          discount: Math.max(0, Number(card.querySelector('.dev-discount')?.value) || 0)
        });
      }

      const candidateData = {
        name, bizNum, ceo, phone, email, contractDate, address, totalPaid, memo, vatType, devices
      };

      const clients = this.getClients();

      // [1] 기존 거래처 수정인 경우
      if (id) {
        const targetIdx = clients.findIndex(c => String(c.id) === String(id));
        if (targetIdx !== -1) {
          // 다른 거래처와의 중복 여부만 체크 (자신은 제외)
          const otherDuplicate = this.findDuplicate(candidateData, id);
          if (otherDuplicate) {
            const msg = `[중복 주의]\n입력하신 정보 중 다른 거래처와 일치하는 항목이 있습니다.\n\n` +
              `• 일치 거래처: ${otherDuplicate.name}\n` +
              `• 사업자등록번호: ${otherDuplicate.bizNum || '없음'}\n` +
              `• 연락처: ${otherDuplicate.phone || '없음'}\n\n` +
              `그래도 현재 거래처 [${clients[targetIdx].name}] 정보를 이 내용으로 수정하시겠습니까?`;
            if (!confirm(msg)) return;
          }

          clients[targetIdx] = {
            ...clients[targetIdx],
            ...candidateData,
            id: clients[targetIdx].id // 기존 고유 ID 유지
          };

          this.saveClients(clients);
          this.syncMeterFromClient(clients[targetIdx]);
          this.closeModal();
          alert(`[${name}] 거래처 및 임대 장비 정보가 성공적으로 수정·저장되었습니다.`);
          return;
        }
      }

      // [2] 신규 등록인 경우
      const duplicate = this.findDuplicate(candidateData, null);
      if (duplicate) {
        const msg = `[중복 거래처 안내]\n이미 동일한 정보가 등록된 거래처가 존재합니다.\n\n` +
          `• 기존 거래처명: ${duplicate.name}\n` +
          `• 사업자등록번호: ${duplicate.bizNum || '없음'}\n` +
          `• 대표 연락처: ${duplicate.phone || '없음'}\n\n` +
          `기존 거래처 [${duplicate.name}]의 정보를 현재 입력한 내용으로 업데이트(덮어쓰기)하시겠습니까?`;

        if (!confirm(msg)) return;

        const targetIdx = clients.findIndex(c => String(c.id) === String(duplicate.id));
        if (targetIdx !== -1) {
          clients[targetIdx] = {
            ...duplicate,
            ...candidateData,
            id: duplicate.id
          };
          this.saveClients(clients);
          this.syncMeterFromClient(clients[targetIdx]);
          this.closeModal();
          alert(`[${name}] 거래처 정보가 기존 데이터에 성공적으로 업데이트되었습니다.`);
          return;
        }
      }

      // 신규 추가
      const newClient = {
        id: 'cli_' + Date.now(),
        ...candidateData
      };
      clients.unshift(newClient);
      this.saveClients(clients);
      this.syncMeterFromClient(newClient);
      this.closeModal();
      alert(`[${name}] 거래처 및 임대 장비가 성공적으로 등록되었습니다.`);
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
            '설치장소': dev.location || '',
            '시리얼(S/N)': dev.serial || '',
            '기본임대료': dc.baseRent,
            '흑백기준매수': dc.bwBase,
            '흑백초과단가': dc.bwUnit,
            '흑백전월누적': dc.bwPrev,
            '흑백당월누적': dc.bwTotal,
            '흑백이번달사용량': dc.bwUsed,
            '흑백추가사용료': dc.bwExtra,
            '컬러기준매수': dc.colorBase,
            '컬러초과단가': dc.colorUnit,
            '컬러전월누적': dc.colorPrev,
            '컬러당월누적': dc.colorTotal,
            '컬러이번달사용량': dc.colorUsed,
            '컬러추가사용료': dc.colorExtra,
            '기기총누적사용량': dc.totalUsage,
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
        { wch: 25 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 12 },
        { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
        { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
        { wch: 14 }, { wch: 10 }, { wch: 14 }
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
          '설치장소': '3층 본사 기획실',
          '시리얼': 'CN-3922-01',
          '기본임대료': 85000,
          '흑백기준매수': 1000,
          '흑백초과단가': 10,
          '흑백전월누적': 27050,
          '흑백당월누적': 28500,
          '흑백이번달사용량': 1450,
          '컬러기준매수': 300,
          '컬러초과단가': 100,
          '컬러전월누적': 8980,
          '컬러당월누적': 9400,
          '컬러이번달사용량': 420
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
          '설치장소': '3층 상담실',
          '시리얼': 'HP-9010-02',
          '기본임대료': 35000,
          '흑백기준매수': 500,
          '흑백초과단가': 12,
          '흑백전월누적': 11650,
          '흑백당월누적': 12400,
          '흑백이번달사용량': 750,
          '컬러기준매수': 200,
          '컬러초과단가': 90,
          '컬러전월누적': 4570,
          '컬러당월누적': 4800,
          '컬러이번달사용량': 230
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
          '설치장소': '교무실',
          '시리얼': 'SND-420-99',
          '기본임대료': 110000,
          '흑백기준매수': 3000,
          '흑백초과단가': 8,
          '흑백전월누적': 60400,
          '흑백당월누적': 64200,
          '흑백이번달사용량': 3800,
          '컬러기준매수': 500,
          '컬러초과단가': 80,
          '컬러전월누적': 14650,
          '컬러당월누적': 15300,
          '컬러이번달사용량': 650
        }
      ];

      const ws = XLSX.utils.json_to_sheet(sampleRows);
      ws['!cols'] = [
        { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 20 },
        { wch: 12 }, { wch: 30 }, { wch: 14 }, { wch: 20 },
        { wch: 25 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
        { wch: 14 }, { wch: 14 }
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
              const location = (row['설치장소'] || row['설치위치'] || row['위치'] || '').toString().trim() || '메인 사무실';
              const serial = (row['시리얼'] || row['시리얼(S/N)'] || row['시리얼_위치'] || '').toString().trim();

              const bwPrev = Number(row['흑백전월누적'] || row['흑백전월카운터'] || 0);
              const bwTotal = Number(row['흑백당월누적'] || row['흑백누적사용량'] || row['흑백현재카운터'] || 0);
              let bwUsed = Number(row['흑백이번달사용량'] || row['흑백사용량'] || 0);
              if (bwTotal > 0 && bwPrev > 0 && bwTotal >= bwPrev && !row['흑백이번달사용량']) {
                bwUsed = bwTotal - bwPrev;
              }

              const colorPrev = Number(row['컬러전월누적'] || row['컬러전월카운터'] || 0);
              const colorTotal = Number(row['컬러당월누적'] || row['컬러누적사용량'] || row['컬러현재카운터'] || 0);
              let colorUsed = Number(row['컬러이번달사용량'] || row['컬러사용량'] || 0);
              if (colorTotal > 0 && colorPrev > 0 && colorTotal >= colorPrev && !row['컬러이번달사용량']) {
                colorUsed = colorTotal - colorPrev;
              }

              clientGroup.devices.push({
                id: 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                name: devName,
                location: location,
                serial: serial,
                baseRent: Number(row['기본임대료'] || row['기본료'] || 0),
                bwBase: Number(row['흑백기준매수'] || row['흑백기본'] || 0),
                bwUnit: Number(row['흑백초과단가'] || row['흑백단가'] || 0),
                bwPrev: bwPrev,
                bwTotal: bwTotal,
                bwUsed: bwUsed,
                colorBase: Number(row['컬러기준매수'] || row['컬러기본'] || 0),
                colorUnit: Number(row['컬러초과단가'] || row['컬러단가'] || 0),
                colorPrev: colorPrev,
                colorTotal: colorTotal,
                colorUsed: colorUsed
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
          existingClients.forEach(c => this.syncMeterFromClient(c));
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

    // ============================================
    // 검침 수정 모달, 엑셀 다운로드, PDF/인쇄 기능
    // ============================================

    // 세금계산서 발행 상태 원클릭 토글 (미발행 <-> 발행완료)
    toggleTaxStatus(clientId, event) {
      if (event) event.stopPropagation();
      const curMonth = this.getCurrentMonthStr();
      const record = this.getMeterRecord(clientId, curMonth);
      if (!record) return;

      const client = this.getClients().find(c => String(c.id) === String(clientId));
      const totals = client ? this.calcClientTotals(client) : null;
      const curBill = (record.summary?.finalBill !== undefined)
        ? record.summary.finalBill
        : ((record.summary?.totalBill !== undefined) ? record.summary.totalBill : (totals ? totals.totalMonthBill : 0));

      const curStatus = record.settlement?.taxStatus || 'unissued';
      const nextStatus = (curStatus === 'issued') ? 'unissued' : 'issued';
      const today = this.getTodayStr();

      if (!record.settlement) {
        record.settlement = {
          paidAmount: 0,
          unpaidAmount: curBill,
          paidDate: '',
          taxStatus: 'unissued',
          taxDate: '',
          finalBill: curBill
        };
      }

      record.settlement.taxStatus = nextStatus;
      record.settlement.taxDate = (nextStatus === 'issued') ? today : '';
      if (!record.settlement.finalBill) record.settlement.finalBill = curBill;

      const history = this.getMeterHistory();
      const existIdx = history.findIndex(h => String(h.clientId) === String(clientId) && h.month === curMonth);
      if (existIdx !== -1) {
        history[existIdx] = record;
      } else {
        history.push(record);
      }
      this.saveMeterHistory(history);
      this.renderTable();
    },

    // 수금 / 미수금 상태 원클릭 토글 (미납 <-> 완납)
    togglePayStatus(clientId, event) {
      if (event) event.stopPropagation();
      const curMonth = this.getCurrentMonthStr();
      const record = this.getMeterRecord(clientId, curMonth);
      if (!record) return;

      const client = this.getClients().find(c => String(c.id) === String(clientId));
      const totals = client ? this.calcClientTotals(client) : null;
      const curBill = (record.summary?.finalBill !== undefined)
        ? record.summary.finalBill
        : ((record.summary?.totalBill !== undefined) ? record.summary.totalBill : (totals ? totals.totalMonthBill : 0));

      const curPaid = Number(record.settlement?.paidAmount) || 0;
      const today = this.getTodayStr();

      if (!record.settlement) {
        record.settlement = {
          paidAmount: 0,
          unpaidAmount: curBill,
          paidDate: '',
          taxStatus: 'unissued',
          taxDate: '',
          finalBill: curBill
        };
      }

      // 이미 완납(paidAmount >= curBill)이면 미납(0원)으로, 아니면 전액 완납(curBill)으로 전환
      if (curPaid >= curBill && curBill > 0) {
        record.settlement.paidAmount = 0;
        record.settlement.unpaidAmount = curBill;
        record.settlement.paidDate = '';
      } else {
        record.settlement.paidAmount = curBill;
        record.settlement.unpaidAmount = 0;
        record.settlement.paidDate = today;
      }
      record.settlement.finalBill = curBill;

      const history = this.getMeterHistory();
      const existIdx = history.findIndex(h => String(h.clientId) === String(clientId) && h.month === curMonth);
      if (existIdx !== -1) {
        history[existIdx] = record;
      } else {
        history.push(record);
      }
      this.saveMeterHistory(history);
      this.renderTable();
    },

    // 검침 수정 모달 내 전액 완납 입력 바로가기
    fillFullPayment() {
      const finalBillEl = document.getElementById('meterFinalBill');
      const paidInput = document.getElementById('meterPaidAmount');
      const paidDateInput = document.getElementById('meterPaidDate');
      if (!finalBillEl || !paidInput) return;

      const billStr = (finalBillEl.textContent || '').replace(/[^0-9]/g, '');
      const billVal = Number(billStr) || 0;
      paidInput.value = billVal;
      if (paidDateInput && !paidDateInput.value) {
        paidDateInput.value = this.getTodayStr();
      }
      this.updateMeterModalPreview();
    },

    // 검침 수정 모달의 현재 부가세 구분 반환 ('tax' | 'free')
    getMeterVatType() {
      const radFree = document.getElementById('meterVatTypeFree');
      return (radFree && radFree.checked) ? 'free' : 'tax';
    },

    // 부가세 과세/면세 라디오 변경 핸들러
    onVatTypeChange() {
      this.updateMeterModalPreview();
    },

    // 최종 결제/청구 금액(만원단위 등) 직접 지정 시 부가세 및 할인금액 자동 역산 계산
    applyCustomFinalBill(targetVal) {
      const targetTotal = Number(targetVal);
      const noticeEl = document.getElementById('meterTargetCalcNotice');
      const discountInput = document.getElementById('meterDiscountAmount');
      if (isNaN(targetTotal) || targetTotal < 0) {
        alert('올바른 목표 정산 금액(원)을 숫자로 입력해주세요.');
        return;
      }

      // 현재 장비들의 순수 공급가액(기본료 + 추가금) 합계 산출
      const list = document.getElementById('meterEditDeviceList');
      const cards = list ? list.querySelectorAll('.meter-dev-card') : [];
      let sumSupply = 0;
      cards.forEach(card => {
        const baseRent = Number(card.querySelector('.m-dev-baseRent')?.value) || 0;
        const bwBase = Number(card.querySelector('.m-dev-bwBase')?.value) || 0;
        const bwUnit = Number(card.querySelector('.m-dev-bwUnit')?.value) || 0;
        const bwUsed = Number(card.querySelector('.m-dev-bwUsed')?.value) || 0;
        const colorBase = Number(card.querySelector('.m-dev-colorBase')?.value) || 0;
        const colorUnit = Number(card.querySelector('.m-dev-colorUnit')?.value) || 0;
        const colorUsed = Number(card.querySelector('.m-dev-colorUsed')?.value) || 0;

        const bwOver = Math.max(0, bwUsed - bwBase);
        const bwExtra = bwOver * bwUnit;
        const colorOver = Math.max(0, colorUsed - colorBase);
        const colorExtra = colorOver * colorUnit;
        sumSupply += (baseRent + bwExtra + colorExtra);
      });

      const vatType = this.getMeterVatType();
      let targetSupply = 0;
      let targetVat = 0;
      let requiredDiscount = 0;

      if (vatType === 'free') {
        // 면세인 경우: 최종금액 = 공급가액, 부가세 = 0원
        targetSupply = targetTotal;
        targetVat = 0;
        requiredDiscount = sumSupply - targetTotal;
      } else {
        // 일반과세(10%)인 경우: 최종금액 = 공급가액 + VAT = 공급가액 × 1.1
        // 정밀 역산: 공급가액 = Math.round(최종금액 / 1.1), VAT = 최종금액 - 공급가액
        targetSupply = Math.round(targetTotal / 1.1);
        targetVat = targetTotal - targetSupply;
        requiredDiscount = sumSupply - targetSupply;
      }

      if (requiredDiscount < 0) {
        const minTarget = vatType === 'free' ? sumSupply : Math.round(sumSupply * 1.1);
        if (!confirm(`입력하신 목표금액(${targetTotal.toLocaleString()}원)이 할인 전 청구금액(${minTarget.toLocaleString()}원)보다 큽니다.\n할인금액을 0원으로 두고 진행하시겠습니까?`)) {
          return;
        }
        requiredDiscount = 0;
      }

      if (discountInput) {
        discountInput.value = requiredDiscount;
      }

      // 프리뷰 즉시 갱신
      this.updateMeterModalPreview();

      // 역산 결과 알림 박스 노출
      if (noticeEl) {
        noticeEl.style.display = 'block';
        if (vatType === 'free') {
          noticeEl.innerHTML = `<i class="fa fa-check-circle" style="color:#059669;"></i> [면세 적용] 최종 목표금액 <strong>${targetTotal.toLocaleString()}원</strong>에 맞춰 할인금액 <strong>${requiredDiscount.toLocaleString()}원</strong>이 자동 세팅되었습니다.`;
        } else {
          noticeEl.innerHTML = `<i class="fa fa-check-circle" style="color:#2563eb;"></i> 최종 목표금액 <strong>${targetTotal.toLocaleString()}원</strong>에 맞춰 공급가액 <strong>${targetSupply.toLocaleString()}원</strong> + 부가세 <strong>${targetVat.toLocaleString()}원</strong>으로 자동 분리되었으며, 할인금액 <strong>${requiredDiscount.toLocaleString()}원</strong>이 자동 차감 반영되었습니다.`;
        }
      }
    },

    // 만원단위 맞춤 / 천원 절사 편의 기능
    roundBillDown(unit = 10000) {
      const finalEl = document.getElementById('meterFinalBill');
      let curTotal = 0;
      if (finalEl) {
        curTotal = Number(finalEl.textContent.replace(/[^0-9]/g, '')) || 0;
      }
      if (curTotal <= 0) {
        alert('현재 정산 가능한 청구 금액이 없습니다.');
        return;
      }

      const rounded = Math.floor(curTotal / unit) * unit;
      const targetInput = document.getElementById('meterTargetFinalBill');
      if (targetInput) targetInput.value = rounded;
      this.applyCustomFinalBill(rounded);
    },

    // 검침 수정 모달 열기
    openMeterEditModal(clientId, targetMonth = null, event = null) {
      if (event) event.stopPropagation();
      const month = targetMonth || this.getCurrentMonthStr();
      const client = this.getClients().find(c => String(c.id) === String(clientId));
      if (!client) {
        alert('해당 거래처 정보를 찾을 수 없습니다.');
        return;
      }

      const record = this.getMeterRecord(clientId, month) || {};

      const modal = document.getElementById('meterEditModal');
      const title = document.getElementById('meterEditModalTitle');
      const idInput = document.getElementById('meterEditClientId');
      const nameEl = document.getElementById('meterEditClientName');
      const monthInput = document.getElementById('meterEditMonth');
      const dateInput = document.getElementById('meterEditDate');
      const listEl = document.getElementById('meterEditDeviceList');

      if (title) title.innerHTML = `<i class="fa fa-calendar-check" style="color:#059669;margin-right:8px;"></i> [${escapeHtml(client.name)}] 검침내역 수정 및 청구 정산`;
      if (idInput) idInput.value = client.id;
      if (nameEl) nameEl.textContent = client.name;
      if (monthInput) monthInput.value = month;
      if (dateInput) dateInput.value = record.readingDate || this.getTodayStr();

      // 수금 및 세금계산서 정산 입력값 로드
      const totals = this.calcClientTotals(client);
      const curBill = (record.summary?.finalBill !== undefined)
        ? record.summary.finalBill
        : ((record.summary?.totalBill !== undefined) ? record.summary.totalBill : totals.totalMonthBill) || 0;
      const st = record.settlement || {
        paidAmount: curBill,
        unpaidAmount: 0,
        paidDate: '',
        taxStatus: 'unissued',
        taxDate: '',
        vatType: client.vatType || 'tax'
      };

      // 부가세 과세 / 면세 라디오 초기화
      const curVatType = (st && st.vatType) || (record.summary && record.summary.vatType) || client.vatType || 'tax';
      const radTax = document.getElementById('meterVatTypeTax');
      const radFree = document.getElementById('meterVatTypeFree');
      if (curVatType === 'free') {
        if (radFree) radFree.checked = true;
        if (radTax) radTax.checked = false;
      } else {
        if (radTax) radTax.checked = true;
        if (radFree) radFree.checked = false;
      }

      // 역산 입력 필드 및 안내 메시지 초기화
      const targetBillInput = document.getElementById('meterTargetFinalBill');
      if (targetBillInput) targetBillInput.value = '';
      const targetNotice = document.getElementById('meterTargetCalcNotice');
      if (targetNotice) {
        targetNotice.style.display = 'none';
        targetNotice.textContent = '';
      }

      const paidInput = document.getElementById('meterPaidAmount');
      const paidDateInput = document.getElementById('meterPaidDate');
      const taxStatusInput = document.getElementById('meterTaxStatus');
      const taxDateInput = document.getElementById('meterTaxDate');
      if (paidInput) paidInput.value = (st.paidAmount !== undefined && st.paidAmount !== null) ? st.paidAmount : '';
      if (paidDateInput) paidDateInput.value = st.paidDate || '';
      if (taxStatusInput) taxStatusInput.value = st.taxStatus || 'unissued';
      if (taxDateInput) taxDateInput.value = st.taxDate || '';

      // 기존 저장된 할인금액 복원 (다중 폴백: settlement -> summary -> 장비별 할인합계 -> totals -> 거래처 할인)
      const clientDevDiscount = (client.devices || []).reduce((sum, d) => sum + (Number(d.discount) || 0), 0);
      const recordDevDiscount = (record.devices || []).reduce((sum, d) => sum + (Number(d.discount) || 0), 0);
      const clientDiscount = Number(client.discount) || 0;
      const settlementDiscount = (st.discountAmount !== undefined && st.discountAmount !== null) ? Number(st.discountAmount) : 0;
      const summaryDiscount = Number(record.summary?.discountAmount || record.summary?.totalDiscount) || 0;
      const totalsDiscount = Number(totals.totalDiscount || totals.discountAmount) || 0;

      let initDiscount = 0;
      if (settlementDiscount > 0) {
        initDiscount = settlementDiscount;
      } else if (summaryDiscount > 0) {
        initDiscount = summaryDiscount;
      } else if (clientDevDiscount > 0) {
        initDiscount = clientDevDiscount;
      } else if (recordDevDiscount > 0) {
        initDiscount = recordDevDiscount;
      } else if (totalsDiscount > 0) {
        initDiscount = totalsDiscount;
      } else if (clientDiscount > 0) {
        initDiscount = clientDiscount;
      }

      const discountInput = document.getElementById('meterDiscountAmount');
      if (discountInput) {
        discountInput.value = initDiscount > 0 ? initDiscount : '';
      }

      const rawDevices = (record.devices && record.devices.length > 0) ? record.devices : (client.devices || []);
      const devices = rawDevices.map(d => {
        const matchedClientDev = (client.devices || []).find(cd => String(cd.id) === String(d.id));
        const devDiscount = (d.discount !== undefined && d.discount !== null && Number(d.discount) > 0)
          ? Number(d.discount)
          : (matchedClientDev ? (Number(matchedClientDev.discount) || 0) : 0);
        return {
          ...d,
          discount: devDiscount
        };
      });

      if (listEl) {
        listEl.innerHTML = devices.map((d, dIdx) => `
          <div class="meter-dev-card" data-device-id="${d.id}">
            <div class="meter-dev-header">
              <div>
                <strong style="color:#0f172a;font-size:14px;">장비 #${dIdx + 1}: ${escapeHtml(d.name || '-')}</strong>
                <span style="font-size:12px;color:#64748b;margin-left:8px;">[설치장소: ${escapeHtml(d.location || '메인 사무실')} | S/N: ${escapeHtml(d.serial || '-')}]</span>
                ${(d.discount || 0) > 0 ? `<span style="font-size:11px;color:#d97706;font-weight:700;margin-left:8px;background:#fef3c7;padding:2px 6px;border-radius:4px;"><i class="fa fa-tag"></i> 장비할인 -${Number(d.discount).toLocaleString()}원</span>` : ''}
              </div>
              <div style="font-size:13px;color:#0284c7;font-weight:700;">
                월 기본료: ${Number(d.baseRent || 0).toLocaleString()}원
              </div>
            </div>
            <input type="hidden" class="m-dev-name" value="${escapeHtml(d.name || '')}">
            <input type="hidden" class="m-dev-loc" value="${escapeHtml(d.location || '')}">
            <input type="hidden" class="m-dev-sn" value="${escapeHtml(d.serial || '')}">
            <input type="hidden" class="m-dev-baseRent" value="${d.baseRent || 0}">
            <input type="hidden" class="m-dev-discount" value="${d.discount || 0}">

            <div class="meter-grid-row" style="margin-top:10px;">
              <div class="meter-input-group">
                <label>흑백 기준매수 / 초과단가</label>
                <div style="display:flex;gap:4px;">
                  <input type="number" class="m-dev-bwBase" value="${d.bwBase !== undefined ? d.bwBase : 1000}" style="width:55%;" title="흑백 기준매수" oninput="ClientManager.updateMeterModalPreview()">
                  <input type="number" class="m-dev-bwUnit" value="${d.bwUnit !== undefined ? d.bwUnit : 10}" style="width:45%;" title="흑백 초과단가(원)" oninput="ClientManager.updateMeterModalPreview()">
                </div>
              </div>
              <div class="meter-input-group">
                <label>전월 흑백 누적 (장)</label>
                <input type="number" class="m-dev-bwPrev" value="${d.bwPrev !== undefined ? d.bwPrev : 0}" min="0" oninput="ClientManager.updateMeterModalUsage(this, 'bw')">
              </div>
              <div class="meter-input-group">
                <label style="color:#0284c7;font-weight:700;">당월 흑백 누적 (장)</label>
                <input type="number" class="m-dev-bwTotal" value="${d.bwTotal !== undefined ? d.bwTotal : 0}" min="0" oninput="ClientManager.updateMeterModalUsage(this, 'bw')">
              </div>
              <div class="meter-input-group">
                <label style="color:#f59e0b;font-weight:700;">이번달 흑백 사용량 (장)</label>
                <input type="number" class="m-dev-bwUsed" value="${d.bwUsed !== undefined ? d.bwUsed : 0}" min="0" oninput="ClientManager.updateMeterModalPreview()">
              </div>
            </div>

            <div class="meter-grid-row" style="margin-top:8px;">
              <div class="meter-input-group">
                <label>컬러 기준매수 / 초과단가</label>
                <div style="display:flex;gap:4px;">
                  <input type="number" class="m-dev-colorBase" value="${d.colorBase !== undefined ? d.colorBase : 300}" style="width:55%;" title="컬러 기준매수" oninput="ClientManager.updateMeterModalPreview()">
                  <input type="number" class="m-dev-colorUnit" value="${d.colorUnit !== undefined ? d.colorUnit : 100}" style="width:45%;" title="컬러 초과단가(원)" oninput="ClientManager.updateMeterModalPreview()">
                </div>
              </div>
              <div class="meter-input-group">
                <label>전월 컬러 누적 (장)</label>
                <input type="number" class="m-dev-colorPrev" value="${d.colorPrev !== undefined ? d.colorPrev : 0}" min="0" oninput="ClientManager.updateMeterModalUsage(this, 'color')">
              </div>
              <div class="meter-input-group">
                <label style="color:#0284c7;font-weight:700;">당월 컬러 누적 (장)</label>
                <input type="number" class="m-dev-colorTotal" value="${d.colorTotal !== undefined ? d.colorTotal : 0}" min="0" oninput="ClientManager.updateMeterModalUsage(this, 'color')">
              </div>
              <div class="meter-input-group">
                <label style="color:#f59e0b;font-weight:700;">이번달 컬러 사용량 (장)</label>
                <input type="number" class="m-dev-colorUsed" value="${d.colorUsed !== undefined ? d.colorUsed : 0}" min="0" oninput="ClientManager.updateMeterModalPreview()">
              </div>
            </div>

            <div class="m-dev-calc-result" style="margin-top:8px;font-size:12px;color:#475569;padding:6px 10px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;"></div>
          </div>
        `).join('');
      }

      if (modal) modal.style.display = 'flex';
      this.updateMeterModalPreview();
    },

    // 검침 모달 닫기
    closeMeterModal() {
      const modal = document.getElementById('meterEditModal');
      if (modal) modal.style.display = 'none';
    },

    // 검침 모달에서 연월 변경 시 데이터 다시 불러오기
    loadMeterRecordForSelectedMonth() {
      const clientId = document.getElementById('meterEditClientId')?.value;
      const month = document.getElementById('meterEditMonth')?.value;
      if (clientId && month) {
        this.openMeterEditModal(clientId, month);
      }
    },

    // 검침 모달 내 계수기(전월/당월) 입력 시 이번달 사용량 자동 계산
    updateMeterModalUsage(inputEl, type) {
      const card = inputEl ? inputEl.closest('.meter-dev-card') : null;
      if (!card) return;

      if (type === 'bw') {
        const prev = Number(card.querySelector('.m-dev-bwPrev')?.value) || 0;
        const total = Number(card.querySelector('.m-dev-bwTotal')?.value) || 0;
        const usedEl = card.querySelector('.m-dev-bwUsed');
        if (total > 0 || prev > 0) {
          if (usedEl) usedEl.value = Math.max(0, total - prev);
        }
      } else if (type === 'color') {
        const prev = Number(card.querySelector('.m-dev-colorPrev')?.value) || 0;
        const total = Number(card.querySelector('.m-dev-colorTotal')?.value) || 0;
        const usedEl = card.querySelector('.m-dev-colorUsed');
        if (total > 0 || prev > 0) {
          if (usedEl) usedEl.value = Math.max(0, total - prev);
        }
      }

      this.updateMeterModalPreview();
    },

    // 검침 모달 내 실시간 청구 합계 프리뷰 업데이트
    updateMeterModalPreview() {
      const list = document.getElementById('meterEditDeviceList');
      if (!list) return;
      const cards = list.querySelectorAll('.meter-dev-card');

      const vatType = this.getMeterVatType();
      const isFree = (vatType === 'free');

      const vatLabel = document.getElementById('meterVatLabel');
      if (vatLabel) {
        vatLabel.textContent = isFree ? 'V.A.T (면세 0%)' : 'V.A.T (10%)';
      }
      const formulaEl = document.getElementById('meterFinalBillFormula');
      if (formulaEl) {
        formulaEl.textContent = isFree ? '(공급가액 - 할인) 부가세 면제' : '(공급가액 - 할인) × 1.1 부가세 포함';
      }

      let sumBaseRent = 0;
      let sumBwExtra = 0;
      let sumColorExtra = 0;

      cards.forEach(card => {
        const baseRent = Number(card.querySelector('.m-dev-baseRent')?.value) || 0;
        const bwBase = Number(card.querySelector('.m-dev-bwBase')?.value) || 0;
        const bwUnit = Number(card.querySelector('.m-dev-bwUnit')?.value) || 0;
        const bwPrev = Number(card.querySelector('.m-dev-bwPrev')?.value) || 0;
        const bwTotal = Number(card.querySelector('.m-dev-bwTotal')?.value) || 0;
        const bwUsed = Number(card.querySelector('.m-dev-bwUsed')?.value) || 0;

        const colorBase = Number(card.querySelector('.m-dev-colorBase')?.value) || 0;
        const colorUnit = Number(card.querySelector('.m-dev-colorUnit')?.value) || 0;
        const colorPrev = Number(card.querySelector('.m-dev-colorPrev')?.value) || 0;
        const colorTotal = Number(card.querySelector('.m-dev-colorTotal')?.value) || 0;
        const colorUsed = Number(card.querySelector('.m-dev-colorUsed')?.value) || 0;

        const bwOver = Math.max(0, bwUsed - bwBase);
        const bwExtra = bwOver * bwUnit;
        const colorOver = Math.max(0, colorUsed - colorBase);
        const colorExtra = colorOver * colorUnit;

        const devExtra = bwExtra + colorExtra;
        const devSupply = baseRent + devExtra;
        const devVat = isFree ? 0 : Math.round(devSupply * 0.1);
        const devTotal = devSupply + devVat;

        const tag = card.querySelector('.m-dev-calc-result');
        if (tag) {
          let warnHtml = '';
          if (bwTotal > 0 && bwPrev > 0 && bwTotal < bwPrev) {
            warnHtml += '<span style="color:#ef4444;margin-right:8px;">[흑백 당월 < 전월 오류]</span> ';
          }
          if (colorTotal > 0 && colorPrev > 0 && colorTotal < colorPrev) {
            warnHtml += '<span style="color:#ef4444;margin-right:8px;">[컬러 당월 < 전월 오류]</span> ';
          }

          const vatSuffix = isFree ? '(면세 0원)' : `(VAT포함 ${devTotal.toLocaleString()}원)`;
          tag.innerHTML = `${warnHtml}흑백: <strong>${bwUsed.toLocaleString()}장</strong> (추가 +${bwExtra.toLocaleString()}원) | ` +
                          `컬러: <strong>${colorUsed.toLocaleString()}장</strong> (추가 +${colorExtra.toLocaleString()}원) | ` +
                          `기기 소계: <strong style="color:#0284c7;">${devSupply.toLocaleString()}원</strong> ${vatSuffix}`;
        }

        sumBaseRent += baseRent;
        sumBwExtra += bwExtra;
        sumColorExtra += colorExtra;
      });

      const sumSupply = sumBaseRent + sumBwExtra + sumColorExtra;
      const sumVat = isFree ? 0 : Math.round(sumSupply * 0.1);
      const sumTotal = sumSupply + sumVat;

      const setEl = (id, val, text = null) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text !== null ? text : (val.toLocaleString() + '원');
      };

      setEl('meterPrevBaseRent', sumBaseRent);
      setEl('meterPrevBwExtra', sumBwExtra);
      setEl('meterPrevColorExtra', sumColorExtra);
      setEl('meterPrevSupply', sumSupply);
      setEl('meterPrevVat', sumVat, isFree ? '0원 (면세)' : null);
      setEl('meterPrevTotalBill', sumTotal);

      // 할인금액을 부가세 적용 이전(공급가액) 단계에서 차감
      const discountInput = document.getElementById('meterDiscountAmount');
      let discountAmount = Math.max(0, Number(discountInput ? discountInput.value : 0) || 0);

      // 만약 입력창이 비어있다면, 각 장비 카드에 설정된 장비할인 합계를 감지하여 자동 세팅
      if (discountAmount === 0 && discountInput && discountInput.value === '') {
        let sumDevDiscount = 0;
        cards.forEach(card => {
          sumDevDiscount += Number(card.querySelector('.m-dev-discount')?.value) || 0;
        });
        if (sumDevDiscount > 0) {
          discountAmount = sumDevDiscount;
          discountInput.value = discountAmount;
        }
      }

      const discountedSupply = Math.max(0, sumSupply - discountAmount); // 할인 후 공급가액
      const finalVat = isFree ? 0 : Math.round(discountedSupply * 0.1); // 할인 후 공급가액에 VAT
      const finalBill = discountedSupply + finalVat;                    // 최종 정산금액
      const finalBillEl = document.getElementById('meterFinalBill');
      if (finalBillEl) finalBillEl.textContent = finalBill.toLocaleString() + '원';

      // 당월 수금 / 미수금 실시간 계산 연동 (최종 정산금액 기준)
      const paidInput = document.getElementById('meterPaidAmount');
      const unpaidEl = document.getElementById('meterUnpaidAmount');
      const paidAmount = Number(paidInput ? paidInput.value : 0) || 0;
      const unpaidAmount = Math.max(0, finalBill - paidAmount);
      if (unpaidEl) unpaidEl.value = unpaidAmount.toLocaleString() + '원';
    },

    // 검침내역 수정 저장
    saveMeterEdit(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      const clientId = document.getElementById('meterEditClientId')?.value;
      const month = document.getElementById('meterEditMonth')?.value || this.getCurrentMonthStr();
      const date = document.getElementById('meterEditDate')?.value || this.getTodayStr();

      if (!clientId) return;
      const clients = this.getClients();
      const client = clients.find(c => String(c.id) === String(clientId));
      if (!client) return;

      const vatType = this.getMeterVatType();
      const isFree = (vatType === 'free');

      const list = document.getElementById('meterEditDeviceList');
      const cards = list ? list.querySelectorAll('.meter-dev-card') : [];

      const devices = [];
      let sumBase = 0, sumBwExtra = 0, sumColorExtra = 0;

      cards.forEach(card => {
        const devId = card.dataset.deviceId;
        const name = card.querySelector('.m-dev-name')?.value || '';
        const loc = card.querySelector('.m-dev-loc')?.value || '';
        const sn = card.querySelector('.m-dev-sn')?.value || '';
        const baseRent = Number(card.querySelector('.m-dev-baseRent')?.value) || 0;

        const bwBase = Number(card.querySelector('.m-dev-bwBase')?.value) || 0;
        const bwUnit = Number(card.querySelector('.m-dev-bwUnit')?.value) || 0;
        const bwPrev = Number(card.querySelector('.m-dev-bwPrev')?.value) || 0;
        const bwTotal = Number(card.querySelector('.m-dev-bwTotal')?.value) || 0;
        const bwUsed = Number(card.querySelector('.m-dev-bwUsed')?.value) || 0;

        const colorBase = Number(card.querySelector('.m-dev-colorBase')?.value) || 0;
        const colorUnit = Number(card.querySelector('.m-dev-colorUnit')?.value) || 0;
        const colorPrev = Number(card.querySelector('.m-dev-colorPrev')?.value) || 0;
        const colorTotal = Number(card.querySelector('.m-dev-colorTotal')?.value) || 0;
        const colorUsed = Number(card.querySelector('.m-dev-colorUsed')?.value) || 0;
        const devDiscount = Number(card.querySelector('.m-dev-discount')?.value) || 0;

        const bwOver = Math.max(0, bwUsed - bwBase);
        const bwExtra = bwOver * bwUnit;
        const colorOver = Math.max(0, colorUsed - colorBase);
        const colorExtra = colorOver * colorUnit;

        const supply = baseRent + bwExtra + colorExtra;
        const vat = isFree ? 0 : Math.round(supply * 0.1);
        const total = supply + vat;

        sumBase += baseRent;
        sumBwExtra += bwExtra;
        sumColorExtra += colorExtra;

        devices.push({
          id: devId,
          name,
          location: loc,
          serial: sn,
          baseRent,
          bwBase, bwUnit, bwPrev, bwTotal, bwUsed, bwOver, bwExtra,
          colorBase, colorUnit, colorPrev, colorTotal, colorUsed, colorOver, colorExtra,
          totalUsage: bwTotal + colorTotal,
          discount: devDiscount,
          supply, vat, total
        });
      });

      const sumSupply = sumBase + sumBwExtra + sumColorExtra;
      const sumVat = isFree ? 0 : Math.round(sumSupply * 0.1);
      const sumTotal = sumSupply + sumVat;

      // 할인금액을 부가세 적용 이전(공급가액) 단계에서 차감
      const discountAmount = Math.max(0, Number(document.getElementById('meterDiscountAmount')?.value) || 0);
      const discountedSupply = Math.max(0, sumSupply - discountAmount); // 할인 후 공급가액
      const finalVat = isFree ? 0 : Math.round(discountedSupply * 0.1); // 할인 후 부가세
      const finalBill = discountedSupply + finalVat;                    // 최종 정산금액

      // 당월 수금 및 세금계산서 정산 정보 (최종 정산금액 기준)
      const paidAmount = Number(document.getElementById('meterPaidAmount')?.value) || 0;
      const unpaidAmount = Math.max(0, finalBill - paidAmount);
      const paidDate = document.getElementById('meterPaidDate')?.value || '';
      const taxStatus = document.getElementById('meterTaxStatus')?.value || 'unissued';
      const taxDate = document.getElementById('meterTaxDate')?.value || '';

      const settlement = {
        vatType,
        paidAmount,
        unpaidAmount,
        paidDate,
        taxStatus,
        taxDate,
        discountAmount,
        discountedSupply, // 할인 후 공급가액
        finalVat,         // 할인 후 VAT
        finalBill         // 할인 후 최종 정산금액
      };

      const history = this.getMeterHistory();
      const record = {
        id: `meter_${clientId}_${month}`,
        clientId,
        clientName: client.name,
        bizNum: client.bizNum || '',
        ceo: client.ceo || '',
        phone: client.phone || '',
        email: client.email || '',
        address: client.address || '',
        month,
        readingDate: date,
        devices,
        summary: {
          vatType,
          totalBaseRent: sumBase,
          totalExtra: sumBwExtra + sumColorExtra,
          totalBwExtra: sumBwExtra,
          totalColorExtra: sumColorExtra,
          totalRawSupply: sumSupply,    // 순수 할인 전 공급가액
          totalSupply: sumSupply,       // 할인 전 공급가액 (호환)
          totalVat: sumVat,             // 할인 전 VAT
          totalBill: sumTotal,          // 할인 전 청구금액
          discountAmount,               // 할인금액
          discountedSupply,             // 할인 후 공급가액
          finalVat,                     // 할인 후 VAT
          finalBill,                    // 할인 후 최종 정산금액 (청구액)
          totalMonthBill: finalBill,    // 호환
          totalPaid: client.totalPaid || 0
        },
        settlement,
        updatedAt: new Date().toISOString()
      };

      const existIdx = history.findIndex(h => String(h.clientId) === String(clientId) && h.month === month);
      if (existIdx !== -1) {
        history[existIdx] = record;
      } else {
        history.push(record);
      }
      this.saveMeterHistory(history);

      // 현재 기준월이면 거래처 기본 장비 계수기 및 할인, 부가세 설정에도 즉시 동기화 반영
      if (month === this.getCurrentMonthStr()) {
        const cIdx = clients.findIndex(c => String(c.id) === String(clientId));
        if (cIdx !== -1) {
          clients[cIdx].vatType = vatType;
          clients[cIdx].devices = (clients[cIdx].devices || []).map(cd => {
            const matched = devices.find(d => String(d.id) === String(cd.id));
            if (matched) {
              return {
                ...cd,
                bwBase: matched.bwBase,
                bwUnit: matched.bwUnit,
                bwPrev: matched.bwPrev,
                bwTotal: matched.bwTotal,
                bwUsed: matched.bwUsed,
                colorBase: matched.colorBase,
                colorUnit: matched.colorUnit,
                colorPrev: matched.colorPrev,
                colorTotal: matched.colorTotal,
                colorUsed: matched.colorUsed,
                discount: devices.length === 1 ? discountAmount : (cd.discount || 0)
              };
            }
            return cd;
          });
          this.saveClients(clients);
        }
      }

      this.closeMeterModal();
      alert(`[${client.name}]의 ${month} 검침내역이 성공적으로 저장되었습니다.`);
      this.renderTable();
      if (window.ProfitManager) window.ProfitManager.render();
    },

    // 검침내역 엑셀 다운로드 (단일 거래처 또는 이번달 전체 거래처)
    exportMeterToExcel(clientId = null, event = null) {
      if (event) event.stopPropagation();
      if (typeof XLSX === 'undefined') {
        alert('엑셀 라이브러리(SheetJS)를 로딩 중입니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      const curMonth = this.getCurrentMonthStr();
      const clients = this.getClients();
      let targetRecords = [];

      if (clientId) {
        const rec = this.getMeterRecord(clientId, curMonth);
        if (rec) targetRecords.push(rec);
      } else {
        clients.forEach(c => {
          const rec = this.getMeterRecord(c.id, curMonth);
          if (rec) targetRecords.push(rec);
        });
      }

      if (targetRecords.length === 0) {
        alert('내보낼 검침 데이터가 없습니다.');
        return;
      }

      const rows = [];
      targetRecords.forEach(rec => {
        const devCount = (rec.devices || []).length;
        const discountAmount = Number(rec.summary?.discountAmount || rec.settlement?.discountAmount || 0);
        const rawSupply = Number(rec.summary?.totalRawSupply || rec.summary?.totalSupply || 0);

        const isTaxFree = (rec.settlement?.vatType === 'free') || (rec.summary?.vatType === 'free');

        (rec.devices || []).forEach((dev, idx) => {
          let devDiscount = Number(dev.discount || 0);
          if (devCount === 1) {
            devDiscount = discountAmount > 0 ? discountAmount : devDiscount;
          } else if (discountAmount > 0 && devDiscount === 0 && rawSupply > 0) {
            const devRaw = Number(dev.baseRent || 0) + Number(dev.bwExtra || 0) + Number(dev.colorExtra || 0);
            if (idx === devCount - 1) {
              const prevAlloc = rec.devices.slice(0, -1).reduce((s, p) => {
                const pr = Number(p.baseRent || 0) + Number(p.bwExtra || 0) + Number(p.colorExtra || 0);
                return s + Math.round((pr / rawSupply) * discountAmount);
              }, 0);
              devDiscount = Math.max(0, discountAmount - prevAlloc);
            } else {
              devDiscount = Math.round((devRaw / rawSupply) * discountAmount);
            }
          }

          const devRawSupply = Number(dev.baseRent || 0) + Number(dev.bwExtra || 0) + Number(dev.colorExtra || 0);
          const devSupply = Math.max(0, devRawSupply - devDiscount);
          const devVat = isTaxFree ? 0 : Math.round(devSupply * 0.1);
          const devTotal = devSupply + devVat;

          rows.push({
            '검침연월': rec.month,
            '검침일자': rec.readingDate || '',
            '거래처명': rec.clientName,
            '부가세유형': isTaxFree ? '면세' : '일반과세(10%)',
            '사업자번호': rec.bizNum || '',
            '대표자': rec.ceo || '',
            '전화번호': rec.phone || '',
            '설치주소': rec.address || '',
            '순번': idx + 1,
            '장비명': dev.name || '',
            '설치장소': dev.location || '',
            '시리얼번호': dev.serial || '',
            '기본임대료': dev.baseRent,
            '흑백_전월누적': dev.bwPrev,
            '흑백_당월누적': dev.bwTotal,
            '흑백_사용량': dev.bwUsed,
            '흑백_기준매수': dev.bwBase,
            '흑백_초과매수': dev.bwOver || Math.max(0, dev.bwUsed - dev.bwBase),
            '흑백_초과단가': dev.bwUnit,
            '흑백_추가금액': dev.bwExtra,
            '컬러_전월누적': dev.colorPrev,
            '컬러_당월누적': dev.colorTotal,
            '컬러_사용량': dev.colorUsed,
            '컬러_기준매수': dev.colorBase,
            '컬러_초과매수': dev.colorOver || Math.max(0, dev.colorUsed - dev.colorBase),
            '컬러_초과단가': dev.colorUnit,
            '컬러_추가금액': dev.colorExtra,
            '기기_총누적(카운터)': dev.totalUsage,
            '할인금액': devDiscount,
            '공급가액': devSupply,
            'V.A.T': devVat,
            '청구합계금액': devTotal
          });
        });
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 10 },
        { wch: 14 }, { wch: 28 }, { wch: 6 }, { wch: 22 }, { wch: 16 },
        { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 14 }
      ];

      const wb = XLSX.utils.book_new();
      const sheetName = clientId ? '거래처_검침내역' : '전체_검침내역';
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      const fileTitle = clientId ? `검침내역_${targetRecords[0].clientName}_${curMonth}.xlsx` : `전체거래처_검침내역_${curMonth}.xlsx`;
      XLSX.writeFile(wb, fileTitle);
    },

    // 현재 열린 검침 모달 내용 엑셀 다운로드
    exportCurrentMeterModalExcel() {
      const clientId = document.getElementById('meterEditClientId')?.value;
      if (clientId) {
        this.exportMeterToExcel(clientId);
      }
    },

    // 단일 거래처 검침 청구서 인쇄 / PDF 출력
    printClientMeterReport(clientId, targetMonth = null, event = null) {
      if (event) event.stopPropagation();
      const month = targetMonth || this.getCurrentMonthStr();
      const record = this.getMeterRecord(clientId, month);
      if (!record) {
        alert('출력할 검침 내역이 없습니다.');
        return;
      }

      const html = this.generateMeterReportHtml([record], `${record.clientName} ${month} 검침 청구서`);
      const area = document.getElementById('meterPrintArea');
      if (!area) return;

      area.innerHTML = html;
      area.style.display = 'block';
      window.print();
      setTimeout(() => {
        area.style.display = 'none';
        area.innerHTML = '';
      }, 1000);
    },

    // 현재 열린 검침 모달 청구서 인쇄 / PDF 출력
    printCurrentMeterModalReport() {
      const clientId = document.getElementById('meterEditClientId')?.value;
      const month = document.getElementById('meterEditMonth')?.value;
      if (clientId) {
        this.printClientMeterReport(clientId, month);
      }
    },

    // 이번달 전체 거래처 검침 청구서 일괄 인쇄 / PDF 출력
    printAllMeterReports() {
      const month = this.getCurrentMonthStr();
      const clients = this.getClients();
      if (clients.length === 0) {
        alert('출력할 거래처 데이터가 없습니다.');
        return;
      }

      const records = clients.map(c => this.getMeterRecord(c.id, month)).filter(Boolean);
      const html = this.generateMeterReportHtml(records, `전체 거래처 ${month} 검침 청구서`);
      const area = document.getElementById('meterPrintArea');
      if (!area) return;

      area.innerHTML = html;
      area.style.display = 'block';
      window.print();
      setTimeout(() => {
        area.style.display = 'none';
        area.innerHTML = '';
      }, 1000);
    },

    // A4 검침 청구서 HTML 서식 생성
    generateMeterReportHtml(records, title) {
      const today = this.getTodayStr();
      return `
        <style>
          .meter-print-page {
            font-family: 'Pretendard', sans-serif, -apple-system;
            color: #1e293b;
            padding: 24px;
            background: #fff;
            max-width: 900px;
            margin: 0 auto;
            page-break-after: always;
          }
          .meter-print-page:last-child {
            page-break-after: auto;
          }
          .print-hdr-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }
          .print-hdr-table td {
            vertical-align: top;
          }
          .print-box {
            border: 1px solid #cbd5e1;
            padding: 10px;
            border-radius: 6px;
            font-size: 12px;
            line-height: 1.6;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 14px;
            margin-bottom: 14px;
            font-size: 11.5px;
          }
          .print-table th, .print-table td {
            border: 1px solid #94a3b8;
            padding: 6px 8px;
            text-align: center;
          }
          .print-table th {
            background: #f1f5f9;
            font-weight: 700;
          }
          .print-summary-box {
            margin-top: 14px;
            background: #f8fafc;
            border: 1.5px solid #0f172a;
            padding: 12px 18px;
            border-radius: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
        </style>
        ${records.map(rec => {
          const summary = rec.summary || {};
          return `
            <div class="meter-print-page">
              <div style="text-align:center;margin-bottom:20px;">
                <h1 style="font-size:24px;margin:0;font-weight:800;letter-spacing:-0.5px;text-decoration:underline;">복합기 임대료 및 검침 정산 청구서</h1>
                <div style="margin-top:6px;font-size:13px;color:#475569;">
                  <strong>청구 연월: ${rec.month}</strong> | 검침 일자: ${rec.readingDate || today}
                </div>
              </div>

              <table class="print-hdr-table">
                <tr>
                  <td style="width:48%;">
                    <div class="print-box">
                      <div style="font-weight:700;font-size:13px;margin-bottom:6px;border-bottom:1px solid #cbd5e1;padding-bottom:4px;">
                        ■ 공급받는 자 (고객사)
                      </div>
                      <div><strong>상호(거래처명):</strong> ${escapeHtml(rec.clientName)}</div>
                      <div><strong>사업자등록번호:</strong> ${escapeHtml(rec.bizNum || '미기재')}</div>
                      <div><strong>대표자명:</strong> ${escapeHtml(rec.ceo || '미기재')} | <strong>연락처:</strong> ${escapeHtml(rec.phone || '-')}</div>
                      <div><strong>설치 장소:</strong> ${escapeHtml(rec.address || '-')}</div>
                    </div>
                  </td>
                  <td style="width:4%;"></td>
                  <td style="width:48%;">
                    <div class="print-box">
                      <div style="font-weight:700;font-size:13px;margin-bottom:6px;border-bottom:1px solid #cbd5e1;padding-bottom:4px;">
                        ■ 공급자 (렌탈사)
                      </div>
                      <div><strong>상호:</strong> 프린터모아</div>
                      <div><strong>사업자등록번호:</strong> 110-81-12345</div>
                      <div><strong>대표자:</strong> 최○○ | <strong>대표번호:</strong> 010-5922-3650</div>
                      <div><strong>사업장주소:</strong> 서울 강동구 아리수로64길 11 1층</div>
                    </div>
                  </td>
                </tr>
              </table>

              <table class="print-table">
                <thead>
                  <tr>
                    <th rowspan="2" style="width:25px;">#</th>
                    <th rowspan="2">장비명 (설치장소)</th>
                    <th rowspan="2">시리얼</th>
                    <th rowspan="2">기본임대료</th>
                    <th colspan="4" style="background:#e2e8f0;">흑백 검침 내역</th>
                    <th colspan="4" style="background:#fce7f3;">컬러 검침 내역</th>
                    <th rowspan="2">합계(공급가)</th>
                  </tr>
                  <tr>
                    <th>전월→당월</th>
                    <th>사용량</th>
                    <th>기준(단가)</th>
                    <th>추가금</th>
                    <th>전월→당월</th>
                    <th>사용량</th>
                    <th>기준(단가)</th>
                    <th>추가금</th>
                  </tr>
                </thead>
                <tbody>
                  ${(rec.devices || []).map((d, i) => `
                    <tr>
                      <td>${i + 1}</td>
                      <td style="text-align:left;">
                        <strong>${escapeHtml(d.name)}</strong>
                        <div style="font-size:10px;color:#64748b;">${escapeHtml(d.location || '사무실')}</div>
                      </td>
                      <td>${escapeHtml(d.serial || '-')}</td>
                      <td style="text-align:right;">${Number(d.baseRent).toLocaleString()}원</td>
                      <td>${Number(d.bwPrev).toLocaleString()} → ${Number(d.bwTotal).toLocaleString()}</td>
                      <td><strong>${Number(d.bwUsed).toLocaleString()}</strong></td>
                      <td>${Number(d.bwBase).toLocaleString()} (${d.bwUnit}원)</td>
                      <td style="text-align:right;color:#d97706;">+${Number(d.bwExtra).toLocaleString()}원</td>
                      <td>${Number(d.colorPrev).toLocaleString()} → ${Number(d.colorTotal).toLocaleString()}</td>
                      <td><strong>${Number(d.colorUsed).toLocaleString()}</strong></td>
                      <td>${Number(d.colorBase).toLocaleString()} (${d.colorUnit}원)</td>
                      <td style="text-align:right;color:#d97706;">+${Number(d.colorExtra).toLocaleString()}원</td>
                      <td style="text-align:right;font-weight:700;">${Number(d.supply).toLocaleString()}원</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="print-summary-box">
                <div>
                  <div style="font-size:12px;color:#64748b;">
                    총 공급가액: <strong>${((summary.discountedSupply !== undefined ? summary.discountedSupply : (summary.totalRawSupply ? Math.max(0, summary.totalRawSupply - (summary.discountAmount || 0)) : summary.totalSupply)) || 0).toLocaleString()}원</strong>
                    ${(summary.discountAmount || 0) > 0 ? `<span style="color:#d97706;font-weight:700;"> (할인 -${Number(summary.discountAmount).toLocaleString()}원 차감)</span>` : ''} | 부가세: <strong>${((rec.settlement?.vatType === 'free') || (summary.vatType === 'free')) ? '0원 (면세)' : (((summary.finalVat !== undefined ? summary.finalVat : summary.totalVat) || 0).toLocaleString() + '원 (10%)')}</strong>
                  </div>
                  <div style="font-size:11px;color:#0284c7;margin-top:3px;">입금계좌: 우리은행 1002-000-000000 (예금주: 최○○ / 프린터모아)</div>
                  <div style="margin-top:5px;font-size:11px;color:#334155;display:flex;gap:12px;flex-wrap:wrap;">
                    <span>세금계산서: <strong>${rec.settlement?.taxStatus === 'issued' ? '발행완료 (' + (rec.settlement.taxDate || '발행') + ')' : (rec.settlement?.taxStatus === 'cashReceipt' ? '현금영수증' : '미발행')}</strong></span>
                    <span>정산상태: <strong>${(rec.settlement?.paidAmount || 0) >= ((summary.finalBill !== undefined ? summary.finalBill : summary.totalBill) || 0) && ((summary.finalBill !== undefined ? summary.finalBill : summary.totalBill) || 0) > 0 ? '완납 (입금확인)' : ((rec.settlement?.paidAmount || 0) > 0 ? '부분입금 (미수금: ' + (rec.settlement.unpaidAmount || 0).toLocaleString() + '원)' : '미납 (미수금: ' + ((summary.finalBill !== undefined ? summary.finalBill : summary.totalBill) || 0).toLocaleString() + '원)')}</strong></span>
                  </div>
                </div>
                <div style="text-align:right;">
                  <span style="font-size:13px;color:#475569;font-weight:600;">이번달 총 청구금액${((rec.settlement?.vatType === 'free') || (summary.vatType === 'free')) ? '(면세)' : '(VAT포함)'}:</span>
                  <div style="font-size:22px;font-weight:800;color:#0f172a;">${((summary.finalBill !== undefined ? summary.finalBill : summary.totalBill) || 0).toLocaleString()} 원</div>
                </div>
              </div>

              <div style="margin-top:16px;font-size:11px;color:#64748b;text-align:center;">
                귀사의 일익 번창하심을 기원합니다. 청구서 내용에 이상이 있거나 문의사항은 고객센터(010-5922-3650)로 연락 바랍니다.
              </div>
            </div>
          `;
        }).join('')}
      `;
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

      // 거래처 모달 바깥 클릭 및 ESC
      const modal = document.getElementById('clientModal');
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.closeModal();
        });
      }

      // 검침 수정 모달 바깥 클릭 및 ESC
      const meterModal = document.getElementById('meterEditModal');
      if (meterModal) {
        meterModal.addEventListener('click', (e) => {
          if (e.target === meterModal) this.closeMeterModal();
        });
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (modal && modal.style.display === 'flex') this.closeModal();
          if (meterModal && meterModal.style.display === 'flex') this.closeMeterModal();
        }
      });
    }
  };

  // ============================================
  // 렌탈 수익성 분석 관리자 모듈 (ProfitManager)
  // 대외비 보안: 관리자 전용 손익분기점(BEP) 및 ROI 분석
  // ============================================
  const ProfitManager = {
    STORAGE_KEY: 'pm_client_costs',
    escapeHtml: escapeHtml,

    defaultCost: {
      devCost: 1800000,         // 장비 매입/취득원가 총합 (원)
      contractMonths: 36,       // 계약기간 (개월)
      residualValue: 200000,    // 만료 후 기기 잔존가치 총합 (원)
      monthlySupplies: 15000,   // 월평균 소모품비 (토너/잉크/드럼 등)
      monthlyRepairs: 5000,     // 월평균 부품수리비 (헤드/롤러 등)
      monthlyService: 5000,     // 월평균 정기점검 및 방문인건비
      initialSetup: 50000,      // 초기 설치 및 물류비 총합 (추천 항목)
      memo: '',
      devCosts: {},             // 기기별 분리 원가 { [devId]: { devCost, initialSetup, residualValue } }
      useActualLogs: false      // 건별 지출 장부 누적합계 자동 연동 여부
    },

    getCosts() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch (e) {
        console.error('원가 데이터 로드 실패:', e);
        return {};
      }
    },

    saveCosts(costs) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(costs));
      } catch (e) {
        console.error('원가 데이터 저장 실패:', e);
      }
    },

    getClientCost(clientId) {
      const costs = this.getCosts();
      const cost = costs[clientId] || { ...this.defaultCost };
      const client = ClientManager.getClients().find(c => String(c.id) === String(clientId));
      const devices = client?.devices || [];

      // 기기별 분리 원가 구조(devCosts)가 없으면 거래처 등록 기기 목록으로 초기화
      if (!cost.devCosts || Object.keys(cost.devCosts).length === 0) {
        cost.devCosts = {};
        devices.forEach((d, idx) => {
          cost.devCosts[d.id] = {
            devCost: idx === 0 ? (cost.devCost || 1800000) : 1200000,
            initialSetup: idx === 0 ? (cost.initialSetup || 50000) : 30000,
            residualValue: idx === 0 ? (cost.residualValue || 200000) : 100000
          };
        });
      }

      // 기기별 합계로 devCost, initialSetup, residualValue 자동 동기화
      if (cost.devCosts && Object.keys(cost.devCosts).length > 0) {
        let sumDevCost = 0, sumSetup = 0, sumResidual = 0;
        Object.values(cost.devCosts).forEach(dc => {
          sumDevCost += Number(dc.devCost) || 0;
          sumSetup += Number(dc.initialSetup) || 0;
          sumResidual += Number(dc.residualValue) || 0;
        });
        cost.devCost = sumDevCost;
        cost.initialSetup = sumSetup;
        cost.residualValue = sumResidual;
      }

      return cost;
    },

    // 특정 거래처의 렌탈 수익성 및 BEP 정밀 계산
    calcProfit(client, costConfig = null) {
      const cost = costConfig || this.getClientCost(client.id);
      const totals = ClientManager.calcClientTotals(client);

      // 월 렌탈 매출 (VAT 제외 공급가액 기준 - B2B 손익분석 표준)
      const monthlyRevenue = totals.totalSupply || 0;

      // 월간 경상 유지비용 (소모품 + 부품수리 + 정기점검)
      const monthlyCosts = (Number(cost.monthlySupplies) || 0) +
                           (Number(cost.monthlyRepairs) || 0) +
                           (Number(cost.monthlyService) || 0);

      // 월 순마진 (월 영업이익)
      const monthlyNet = monthlyRevenue - monthlyCosts;

      // 순 자본 투자원가 (기기 매입가 + 초기설치비 - 만료 후 잔존가치)
      const devCost = Number(cost.devCost) || 0;
      const initialSetup = Number(cost.initialSetup) || 0;
      const residualValue = Number(cost.residualValue) || 0;
      const contractMonths = Number(cost.contractMonths) || 36;

      const netInvestment = Math.max(0, devCost + initialSetup - residualValue);
      const grossInvestment = devCost + initialSetup;

      // 손익분기점 (BEP) 회수 기간 (개월)
      let bepMonths = 0;
      let isPaybackPossible = true;
      if (monthlyNet <= 0) {
        bepMonths = 9999;
        isPaybackPossible = false;
      } else {
        bepMonths = netInvestment / monthlyNet;
      }

      // 계약 기간 전체 총 예상 수입, 총 비용, 총 순이익
      const totalContractRevenue = monthlyRevenue * contractMonths;
      const totalContractCosts = (monthlyCosts * contractMonths) + netInvestment;
      const totalContractNet = (monthlyNet * contractMonths) - netInvestment;

      // 투자수익률 (ROI)
      let roi = 0;
      if (grossInvestment > 0) {
        roi = Math.round((totalContractNet / grossInvestment) * 100);
      }

      return {
        clientId: client.id,
        clientName: client.name,
        deviceCount: (client.devices || []).length,
        deviceNames: (client.devices || []).map(d => d.name).join(', '),
        costConfig: cost,
        monthlyRevenue,
        monthlyCosts,
        monthlyNet,
        netInvestment,
        grossInvestment,
        contractMonths,
        bepMonths,
        isPaybackPossible,
        totalContractRevenue,
        totalContractCosts,
        totalContractNet,
        roi
      };
    },

    // 전체 화면 렌더링
    render(keyword = '') {
      this.renderStats();
      this.renderTable(keyword);
    },

    // 상단 4개 요약 통계 카드
    renderStats() {
      const clients = ClientManager.getClients();
      let totalInvest = 0;
      let totalMonthlyNet = 0;
      let totalMonthlyRevenue = 0;
      let totalContractNet = 0;
      let totalDevices = 0;
      let sumBep = 0;
      let validBepCount = 0;
      let sumRoi = 0;

      clients.forEach(c => {
        const p = this.calcProfit(c);
        totalInvest += p.grossInvestment;
        totalMonthlyNet += p.monthlyNet;
        totalMonthlyRevenue += p.monthlyRevenue;
        totalContractNet += p.totalContractNet;
        totalDevices += p.deviceCount;
        if (p.isPaybackPossible && p.bepMonths < 999) {
          sumBep += p.bepMonths;
          validBepCount++;
        }
        sumRoi += p.roi;
      });

      const avgBep = validBepCount > 0 ? (sumBep / validBepCount).toFixed(1) : '0.0';
      const marginRate = totalMonthlyRevenue > 0 ? Math.round((totalMonthlyNet / totalMonthlyRevenue) * 100) : 0;
      const avgRoi = clients.length > 0 ? Math.round(sumRoi / clients.length) : 0;

      const elInvest = document.getElementById('profitStatTotalInvestment');
      const elDevCount = document.getElementById('profitStatDeviceCount');
      const elMonthlyNet = document.getElementById('profitStatMonthlyNet');
      const elMargin = document.getElementById('profitStatMarginRate');
      const elAvgBep = document.getElementById('profitStatAvgBep');
      const elContractNet = document.getElementById('profitStatTotalContractNet');
      const elAvgRoi = document.getElementById('profitStatAvgRoi');

      if (elInvest) elInvest.textContent = '₩ ' + totalInvest.toLocaleString();
      if (elDevCount) elDevCount.textContent = `임대 기기 총 ${totalDevices}대 운용 중`;
      if (elMonthlyNet) elMonthlyNet.textContent = '₩ ' + totalMonthlyNet.toLocaleString();
      if (elMargin) elMargin.textContent = `월평균 순마진율 ${marginRate}%`;
      if (elAvgBep) elAvgBep.textContent = `${avgBep} 개월`;
      if (elContractNet) elContractNet.textContent = '₩ ' + totalContractNet.toLocaleString();
      if (elAvgRoi) elAvgRoi.textContent = `평균 ROI ${avgRoi}% (36개월 기준)`;
    },

    // 거래처별 수익성 분석 테이블 렌더링
    renderTable(keyword = '') {
      const tbody = document.getElementById('profitTbody');
      const empty = document.getElementById('profitEmpty');
      const badge = document.getElementById('profitClientCountBadge');
      if (!tbody) return;

      const kwInput = document.getElementById('profitSearchInput');
      const kw = String(keyword !== undefined ? keyword : (kwInput ? kwInput.value : '') || '').trim().toLowerCase();

      const sortSelect = document.getElementById('profitSortSelect');
      const sortVal = sortSelect ? sortSelect.value : 'name';

      let clients = ClientManager.getClients();

      if (kw) {
        clients = clients.filter(c => {
          const name = (c.name || '').toLowerCase();
          const devs = (c.devices || []).map(d => d.name || '').join(' ').toLowerCase();
          return name.includes(kw) || devs.includes(kw);
        });
      }

      if (badge) badge.textContent = `${clients.length}개사`;

      if (clients.length === 0) {
        tbody.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
      }
      if (empty) empty.style.display = 'none';

      const profitList = clients.map(c => this.calcProfit(c));
      // '거래처관리 순서'인 경우 sort 없이 getClients() 원본 순서를 그대로 사용
      if (sortVal !== 'order') {
        profitList.sort((a, b) => {
          if (sortVal === 'name') return a.clientName.localeCompare(b.clientName);
          if (sortVal === 'bep_asc') return a.bepMonths - b.bepMonths;
          if (sortVal === 'net_desc') return b.monthlyNet - a.monthlyNet;
          if (sortVal === 'roi_desc') return b.roi - a.roi;
          if (sortVal === 'invest_desc') return b.grossInvestment - a.grossInvestment;
          return 0;
        });
      }

      const html = profitList.map((p, idx) => {
        let bepBadge = '';
        let barWidth = 0;
        let barColor = '#10b981';

        if (!p.isPaybackPossible) {
          bepBadge = '<span class="badge" style="background:#fee2e2;color:#ef4444;font-size:11px;">회수 불가(적자)</span>';
          barWidth = 0;
        } else {
          const pct = Math.min(100, Math.round((p.bepMonths / p.contractMonths) * 100));
          barWidth = pct;
          if (p.bepMonths <= p.contractMonths * 0.5) {
            barColor = '#10b981';
            bepBadge = `<span class="badge" style="background:#dcfce7;color:#15803d;font-weight:700;font-size:11px;">${p.bepMonths.toFixed(1)}개월 (${pct}% 시점)</span>`;
          } else if (p.bepMonths <= p.contractMonths) {
            barColor = '#f59e0b';
            bepBadge = `<span class="badge" style="background:#fef3c7;color:#b45309;font-weight:700;font-size:11px;">${p.bepMonths.toFixed(1)}개월 (${pct}% 시점)</span>`;
          } else {
            barColor = '#ef4444';
            bepBadge = `<span class="badge" style="background:#fee2e2;color:#b91c1c;font-weight:700;font-size:11px;">계약초과 (${p.bepMonths.toFixed(1)}개월)</span>`;
          }
        }

        return `
          <tr>
            <td>${idx + 1}</td>
            <td>
              <strong>${ClientManager.escapeHtml(p.clientName)}</strong>
              <div style="font-size:11px;color:#64748b;">계약기간: ${p.contractMonths}개월</div>
            </td>
            <td>
              <div style="font-weight:600;color:#0284c7;">${p.deviceCount}대</div>
              <div style="font-size:11px;color:#64748b;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${ClientManager.escapeHtml(p.deviceNames || '-')}">
                ${ClientManager.escapeHtml(p.deviceNames || '-')}
              </div>
            </td>
            <td>
              <div style="font-weight:700;">${p.costConfig.devCost.toLocaleString()}원</div>
              <div style="font-size:10px;color:#94a3b8;">초기설치 +${(p.costConfig.initialSetup || 0).toLocaleString()}원</div>
            </td>
            <td>
              <div style="color:#d97706;font-weight:600;">-${p.monthlyCosts.toLocaleString()}원</div>
              <div style="font-size:10px;color:#94a3b8;">소모품/부품/점검</div>
            </td>
            <td>
              <div style="font-weight:700;color:#0284c7;">+${p.monthlyRevenue.toLocaleString()}원</div>
              <div style="font-size:10px;color:#94a3b8;">(공급가 기준)</div>
            </td>
            <td>
              <div style="font-weight:800;color:${p.monthlyNet >= 0 ? '#059669' : '#ef4444'};">
                ${p.monthlyNet >= 0 ? '+' : ''}${p.monthlyNet.toLocaleString()}원
              </div>
            </td>
            <td>
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                ${bepBadge}
              </div>
              <div class="bep-bar-wrap">
                <div class="bep-bar-fill" style="width:${barWidth}%;background:${barColor};"></div>
              </div>
            </td>
            <td>
              <div style="font-weight:800;color:${p.totalContractNet >= 0 ? '#1e40af' : '#dc2626'};">
                ${p.totalContractNet >= 0 ? '+' : ''}${p.totalContractNet.toLocaleString()}원
              </div>
              <div style="font-size:10px;color:#64748b;">${p.contractMonths}개월 총순익</div>
            </td>
            <td>
              <span class="badge" style="background:${p.roi >= 100 ? '#f3e8ff' : '#f1f5f9'};color:${p.roi >= 100 ? '#7e22ce' : '#334155'};font-weight:700;font-size:12px;">
                ${p.roi}%
              </span>
            </td>
            <td>
              <button class="btn-primary-sm" style="padding:4px 8px;font-size:11px;background:#7c3aed;" onclick="ProfitManager.openEditModal('${p.clientId}')">
                <i class="fa fa-cog"></i> 원가설정
              </button>
            </td>
          </tr>
        `;
      }).join('');

      tbody.innerHTML = html;
    },

    // 소모품·부품 건별 지출 장부 스토리지 키
    MAINT_STORAGE_KEY: 'pm_maintenance_logs',

    getMaintenanceLogs(clientId) {
      try {
        const raw = localStorage.getItem(this.MAINT_STORAGE_KEY);
        const all = raw ? JSON.parse(raw) : {};
        return all[clientId] || [];
      } catch (e) {
        console.error('소모품/부품 장부 로드 실패:', e);
        return [];
      }
    },

    saveMaintenanceLogs(clientId, logs) {
      try {
        const raw = localStorage.getItem(this.MAINT_STORAGE_KEY);
        const all = raw ? JSON.parse(raw) : {};
        all[clientId] = logs;
        localStorage.setItem(this.MAINT_STORAGE_KEY, JSON.stringify(all));
      } catch (e) {
        console.error('소모품/부품 장부 저장 실패:', e);
      }
    },

    // 건별 지출 장부 등록
    addMaintenanceLog() {
      const clientId = document.getElementById('profitClientId')?.value;
      if (!clientId) return;

      const date = document.getElementById('maintInputDate')?.value || ClientManager.getTodayStr();
      const category = document.getElementById('maintInputCategory')?.value || 'supplies';
      const name = (document.getElementById('maintInputName')?.value || '').trim();
      const amount = Number(document.getElementById('maintInputAmount')?.value) || 0;
      const memo = (document.getElementById('maintInputMemo')?.value || '').trim();

      if (!name) {
        alert('품목 또는 수리 내역을 입력해주세요.');
        document.getElementById('maintInputName')?.focus();
        return;
      }
      if (amount <= 0) {
        alert('0원 이상의 비용 금액을 입력해주세요.');
        document.getElementById('maintInputAmount')?.focus();
        return;
      }

      const logs = this.getMaintenanceLogs(clientId);
      logs.unshift({
        id: 'log_' + Date.now(),
        date,
        category,
        name,
        amount,
        memo
      });

      this.saveMaintenanceLogs(clientId, logs);
      this.renderMaintenanceLogs(clientId);

      // 입력란 리셋
      document.getElementById('maintInputName').value = '';
      document.getElementById('maintInputAmount').value = '';
      document.getElementById('maintInputMemo').value = '';
    },

    // 건별 지출 장부 삭제
    deleteMaintenanceLog(logId) {
      const clientId = document.getElementById('profitClientId')?.value;
      if (!clientId) return;
      if (!confirm('해당 건별 지출 내역을 삭제하시겠습니까?')) return;

      let logs = this.getMaintenanceLogs(clientId);
      logs = logs.filter(l => l.id !== logId);
      this.saveMaintenanceLogs(clientId, logs);
      this.renderMaintenanceLogs(clientId);
      this.syncSuppliesCost(clientId);
    },

    // 건별 지출 장부 테이블 및 합계 렌더링
    renderMaintenanceLogs(clientId) {
      const tbody = document.getElementById('maintLogsTableBody');
      if (!tbody) return;

      const logs = this.getMaintenanceLogs(clientId);
      let sumSupplies = 0;
      let sumRepairs = 0;
      let sumService = 0;

      logs.forEach(l => {
        const amt = Number(l.amount) || 0;
        if (l.category === 'supplies') sumSupplies += amt;
        else if (l.category === 'repairs') sumRepairs += amt;
        else sumService += amt;
      });
      const sumTotal = sumSupplies + sumRepairs + sumService;

      const setEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val.toLocaleString() + '원';
      };
      setEl('maintSumSupplies', sumSupplies);
      setEl('maintSumRepairs', sumRepairs);
      setEl('maintSumService', sumService);
      setEl('maintSumTotal', sumTotal);

      if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="color:#94a3b8;padding:16px;">등록된 건별 지출 내역이 없습니다.</td></tr>';
      } else {
        tbody.innerHTML = logs.map(l => {
          let catBadge = '';
          if (l.category === 'supplies') catBadge = '<span class="badge" style="background:#e0f2fe;color:#0369a1;">소모품</span>';
          else if (l.category === 'repairs') catBadge = '<span class="badge" style="background:#fef3c7;color:#b45309;">부품수리</span>';
          else catBadge = '<span class="badge" style="background:#dcfce7;color:#15803d;">점검/기타</span>';

          return `
            <tr>
              <td>${l.date || '-'}</td>
              <td>${catBadge}</td>
              <td style="text-align:left;font-weight:600;">${ClientManager.escapeHtml(l.name)}</td>
              <td style="text-align:right;font-weight:700;color:#0f172a;">${Number(l.amount).toLocaleString()}원</td>
              <td style="text-align:left;color:#64748b;font-size:11px;">${ClientManager.escapeHtml(l.memo || '-')}</td>
              <td>
                <button type="button" class="btn-action-icon delete" style="padding:2px 6px;" title="삭제" onclick="ProfitManager.deleteMaintenanceLog('${l.id}')">
                  <i class="fa fa-times"></i>
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }

      // 실비 자동 반영 체크 시 월평균 환산액 주입
      const useActual = document.getElementById('profitUseActualLogs')?.checked;
      if (useActual) {
        const months = Math.min(12, Number(document.getElementById('profitContractMonths')?.value) || 36);
        const mSupplies = Math.round(sumSupplies / months);
        const mRepairs = Math.round(sumRepairs / months);
        const mService = Math.round(sumService / months);
        const setInput = (id, v) => {
          const el = document.getElementById(id);
          if (el) el.value = v;
        };
        setInput('profitMonthlySupplies', mSupplies);
        setInput('profitMonthlyRepairs', mRepairs);
        setInput('profitMonthlyService', mService);
        this.updateModalPreview();
      }
    },

    toggleUseActualLogs(checked) {
      const wrap = document.getElementById('profitManualCostsWrap');
      const inputs = wrap ? wrap.querySelectorAll('input') : [];
      inputs.forEach(inp => {
        inp.readOnly = checked;
        inp.style.background = checked ? '#f1f5f9' : '#fff';
      });
      const clientId = document.getElementById('profitClientId')?.value;
      if (clientId) this.renderMaintenanceLogs(clientId);
      this.updateModalPreview();
    },

    // 소모품 출고 내역 변경(등록/수정/삭제) 시 렌탈수익성 원가/비용 실시간 동기화
    syncSuppliesCost(clientId) {
      if (!clientId) return;
      const idStr = String(clientId);
      const logs = this.getMaintenanceLogs(idStr);

      let sumSupplies = 0;
      let sumRepairs = 0;
      let sumService = 0;

      logs.forEach(l => {
        const amt = Number(l.amount) || 0;
        if (l.category === 'supplies') sumSupplies += amt;
        else if (l.category === 'repairs') sumRepairs += amt;
        else sumService += amt;
      });

      // 거래처 원가 설정 가져오기
      const costs = this.getCosts();
      const cost = costs[idStr] || { ...this.defaultCost };

      // 소모품 지출 장부 누적 금액을 월평균 소모품비로 환산하여 자동 갱신
      const months = Math.min(12, Number(cost.contractMonths) || 36);
      const calculatedMonthlySupplies = Math.round(sumSupplies / months);

      // cost 객체에 반영
      cost.monthlySupplies = calculatedMonthlySupplies;
      costs[idStr] = cost;
      this.saveCosts(costs);

      // 모달이 현재 열려 있고 동일한 거래처라면 모달 UI도 즉각 갱신
      const currentModalClientId = document.getElementById('profitClientId')?.value;
      if (currentModalClientId && String(currentModalClientId) === idStr) {
        this.renderMaintenanceLogs(idStr);
        const inpSupplies = document.getElementById('profitMonthlySupplies');
        if (inpSupplies) inpSupplies.value = calculatedMonthlySupplies;
        this.updateModalPreview();
      }

      // 메인 렌탈수익성분석 화면 갱신
      try {
        this.render();
      } catch (e) {
        console.warn('[ProfitManager] render error:', e);
      }
    },

    // 기기별 입력 카드 합계 실시간 계산 및 상단 요약 바 반영
    updateDeviceCostTotals() {
      const container = document.getElementById('profitDeviceCostList');
      if (!container) return;
      const cards = container.querySelectorAll('.profit-dev-cost-card');

      let sumDevCost = 0;
      let sumSetup = 0;
      let sumResidual = 0;

      cards.forEach(card => {
        const costInput = card.querySelector('.dev-cost-input');
        const setupInput = card.querySelector('.dev-setup-input');
        const residualInput = card.querySelector('.dev-residual-input');
        const subtotalEl = card.querySelector('.dev-subtotal-val');

        const dCost = Number(costInput ? costInput.value : 0) || 0;
        const dSetup = Number(setupInput ? setupInput.value : 0) || 0;
        const dResidual = Number(residualInput ? residualInput.value : 0) || 0;
        const subtotal = Math.max(0, dCost + dSetup - dResidual);

        if (subtotalEl) subtotalEl.textContent = `${subtotal.toLocaleString()}원`;

        sumDevCost += dCost;
        sumSetup += dSetup;
        sumResidual += dResidual;
      });

      const sumNetInvest = Math.max(0, sumDevCost + sumSetup - sumResidual);

      const setEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val.toLocaleString() + '원';
      };
      setEl('profitTotalDevCostDisplay', sumDevCost);
      setEl('profitTotalSetupDisplay', sumSetup);
      setEl('profitTotalResidualDisplay', sumResidual);
      setEl('profitNetInvestDisplay', sumNetInvest);

      // hidden inputs 동기화
      const hCost = document.getElementById('profitDevCost');
      const hSetup = document.getElementById('profitInitialSetup');
      const hResidual = document.getElementById('profitResidualValue');
      if (hCost) hCost.value = sumDevCost;
      if (hSetup) hSetup.value = sumSetup;
      if (hResidual) hResidual.value = sumResidual;

      this.updateModalPreview();
    },

    // 원가 설정 모달 열기
    openEditModal(clientId) {
      try {
        const modal = document.getElementById('profitEditModal');
        if (!modal) {
          console.error('[ProfitManager] profitEditModal 요소를 찾을 수 없습니다.');
          return;
        }

        const clients = ClientManager.getClients();
        const client = clients.find(c => String(c.id) === String(clientId));
        if (!client) {
          alert('거래처 정보를 찾을 수 없습니다. (ID: ' + clientId + ')');
          return;
        }

        // ★ 모달을 먼저 표시 (이후 로직에서 오류가 나도 모달은 열림)
        modal.style.display = 'flex';

        const cost = this.getClientCost(clientId);

        // 기본 정보 세팅
        const idEl = document.getElementById('profitClientId');
        const nameEl = document.getElementById('profitClientName');
        const revEl = document.getElementById('profitMonthlyRevenue');
        if (idEl) idEl.value = clientId;
        if (nameEl) nameEl.textContent = client.name;

        try {
          const totals = ClientManager.calcClientTotals(client);
          const supAmt = (totals.totalSupply || 0).toLocaleString();
          const billAmt = (totals.totalMonthBill || totals.totalBill || 0).toLocaleString();
          if (revEl) revEl.textContent = `${supAmt}원 (VAT포함 ${billAmt}원)`;
        } catch (e) {
          if (revEl) revEl.textContent = '계산 불가';
          console.warn('[ProfitManager] calcClientTotals 오류:', e);
        }

        const setVal = (id, v) => {
          const el = document.getElementById(id);
          if (el) el.value = (v !== undefined && v !== null) ? v : '';
        };

        setVal('profitContractMonths', cost.contractMonths || 36);
        setVal('profitMonthlySupplies', cost.monthlySupplies);
        setVal('profitMonthlyRepairs', cost.monthlyRepairs);
        setVal('profitMonthlyService', cost.monthlyService);
        setVal('profitMemo', cost.memo);

        // 1. 기기별 원가 분리 입력 카드 렌더링
        const devCostListEl = document.getElementById('profitDeviceCostList');
        const devCountBadge = document.getElementById('profitDeviceCountBadge');
        const devices = (client.devices && client.devices.length > 0) ? client.devices : [
          { id: 'dev_default', name: client.name + ' 임대 복합기', location: '메인 사무실', serial: '-' }
        ];
        if (devCountBadge) devCountBadge.textContent = `등록 기기: ${devices.length}대`;

        const savedDevCosts = cost.devCosts || {};
        if (devCostListEl) {
          devCostListEl.innerHTML = devices.map((d, dIdx) => {
            const dSaved = savedDevCosts[d.id] || {};
            const defDevCost = dIdx === 0 ? (cost.devCost || 1800000) : 1200000;
            const defSetup = dIdx === 0 ? (cost.initialSetup || 50000) : 30000;
            const defResidual = dIdx === 0 ? (cost.residualValue || 200000) : 100000;

            const curDevCost = dSaved.devCost !== undefined ? dSaved.devCost : defDevCost;
            const curSetup = dSaved.initialSetup !== undefined ? dSaved.initialSetup : defSetup;
            const curResidual = dSaved.residualValue !== undefined ? dSaved.residualValue : defResidual;
            const subtotal = Math.max(0, curDevCost + curSetup - curResidual);

            return `
              <div class="profit-dev-cost-card" data-dev-id="${escapeHtml(String(d.id))}">
                <div class="profit-dev-cost-header">
                  <div>
                    <strong style="font-size:13px;color:#1e293b;">
                      <i class="fa fa-print" style="color:#0284c7;margin-right:4px;"></i>
                      [기기 #${dIdx + 1}] ${escapeHtml(d.name || '복합기')}
                    </strong>
                    <span style="font-size:11px;color:#64748b;margin-left:6px;">(${escapeHtml(d.location || '사무실')} / S/N: ${escapeHtml(d.serial || '-')})</span>
                  </div>
                  <div style="font-size:11px;color:#7c3aed;font-weight:700;">
                    기기 순투자: <span class="dev-subtotal-val">${subtotal.toLocaleString()}원</span>
                  </div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:10px;">
                  <label style="font-size:11px;color:#475569;font-weight:600;display:block;margin-bottom:3px;">
                    기기 매입/취득원가(원)
                    <input type="number" id="devCostInput_${dIdx}" class="form-input dev-cost-input" value="${curDevCost}" min="0" step="10000" placeholder="원가 입력" oninput="ProfitManager.updateDeviceCostTotals()" style="margin-top:3px;">
                  </label>
                  <label style="font-size:11px;color:#475569;font-weight:600;display:block;margin-bottom:3px;">
                    초기 설치/물류비(원)
                    <input type="number" id="devSetupInput_${dIdx}" class="form-input dev-setup-input" value="${curSetup}" min="0" step="5000" placeholder="설치비 입력" oninput="ProfitManager.updateDeviceCostTotals()" style="margin-top:3px;">
                  </label>
                  <label style="font-size:11px;color:#475569;font-weight:600;display:block;margin-bottom:3px;">
                    만료 잔존가치(원)
                    <input type="number" id="devResidualInput_${dIdx}" class="form-input dev-residual-input" value="${curResidual}" min="0" step="10000" placeholder="잔존가치 입력" oninput="ProfitManager.updateDeviceCostTotals()" style="margin-top:3px;">
                  </label>
                </div>
              </div>
            `;
          }).join('');
        }

        try { this.updateDeviceCostTotals(); } catch(e) { console.warn('[ProfitManager] updateDeviceCostTotals 오류:', e); }

        // 2. 소모품·부품 건별 지출 장부 렌더링
        const dateInp = document.getElementById('maintInputDate');
        if (dateInp) dateInp.value = ClientManager.getTodayStr ? ClientManager.getTodayStr() : new Date().toISOString().split('T')[0];
        const useActualChk = document.getElementById('profitUseActualLogs');
        if (useActualChk) useActualChk.checked = !!cost.useActualLogs;

        try { this.renderMaintenanceLogs(clientId); } catch(e) { console.warn('[ProfitManager] renderMaintenanceLogs 오류:', e); }
        try { this.toggleUseActualLogs(!!cost.useActualLogs); } catch(e) { console.warn('[ProfitManager] toggleUseActualLogs 오류:', e); }
        try { this.updateModalPreview(); } catch(e) { console.warn('[ProfitManager] updateModalPreview 오류:', e); }

      } catch (err) {
        console.error('[ProfitManager] openEditModal 오류:', err);
        // 오류가 나도 모달은 표시 시도
        const modal = document.getElementById('profitEditModal');
        if (modal) modal.style.display = 'flex';
      }
    },

    // 원가 모달 닫기
    closeModal() {
      const modal = document.getElementById('profitEditModal');
      if (modal) modal.style.display = 'none';
    },

    // 모달 내 실시간 시뮬레이션 프리뷰
    updateModalPreview() {
      const clientId = document.getElementById('profitClientId')?.value;
      if (!clientId) return;
      const clients = ClientManager.getClients();
      const client = clients.find(c => String(c.id) === String(clientId));
      if (!client) return;

      const devCost = Number(document.getElementById('profitDevCost')?.value) || 0;
      const contractMonths = Number(document.getElementById('profitContractMonths')?.value) || 36;
      const residualValue = Number(document.getElementById('profitResidualValue')?.value) || 0;
      const monthlySupplies = Number(document.getElementById('profitMonthlySupplies')?.value) || 0;
      const monthlyRepairs = Number(document.getElementById('profitMonthlyRepairs')?.value) || 0;
      const monthlyService = Number(document.getElementById('profitMonthlyService')?.value) || 0;
      const initialSetup = Number(document.getElementById('profitInitialSetup')?.value) || 0;

      const candidateCost = {
        devCost, contractMonths, residualValue, monthlySupplies, monthlyRepairs, monthlyService, initialSetup
      };

      const p = this.calcProfit(client, candidateCost);

      const elNet = document.getElementById('prevProfitMonthlyNet');
      const elBep = document.getElementById('prevProfitBepMonths');
      const elTotal = document.getElementById('prevProfitTotalNet');
      const elRoi = document.getElementById('prevProfitRoi');

      if (elNet) elNet.textContent = `${p.monthlyNet.toLocaleString()}원`;
      if (elBep) {
        if (!p.isPaybackPossible) {
          elBep.textContent = '회수 불가 (적자)';
          elBep.style.color = '#ef4444';
        } else {
          elBep.textContent = `${p.bepMonths.toFixed(1)}개월 (${p.contractMonths}M 계약)`;
          elBep.style.color = p.bepMonths <= p.contractMonths ? '#059669' : '#d97706';
        }
      }
      if (elTotal) {
        elTotal.textContent = `${p.totalContractNet.toLocaleString()}원`;
        elTotal.style.color = p.totalContractNet >= 0 ? '#1e40af' : '#ef4444';
      }
      if (elRoi) {
        elRoi.textContent = `${p.roi}%`;
        elRoi.style.color = p.roi >= 100 ? '#7e22ce' : '#334155';
      }
    },

    // 원가 설정 저장
    saveProfitCost(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      const clientId = document.getElementById('profitClientId')?.value;
      if (!clientId) return;

      const container = document.getElementById('profitDeviceCostList');
      const cards = container ? container.querySelectorAll('.profit-dev-cost-card') : [];
      const devCosts = {};
      let totalDevCost = 0, totalSetup = 0, totalResidual = 0;

      cards.forEach(card => {
        const devId = card.dataset.devId;
        const dCost = Number(card.querySelector('.dev-cost-input')?.value) || 0;
        const dSetup = Number(card.querySelector('.dev-setup-input')?.value) || 0;
        const dResidual = Number(card.querySelector('.dev-residual-input')?.value) || 0;

        devCosts[devId] = {
          devCost: dCost,
          initialSetup: dSetup,
          residualValue: dResidual
        };
        totalDevCost += dCost;
        totalSetup += dSetup;
        totalResidual += dResidual;
      });

      const costs = this.getCosts();
      costs[clientId] = {
        devCost: totalDevCost,
        contractMonths: Number(document.getElementById('profitContractMonths')?.value) || 36,
        residualValue: totalResidual,
        monthlySupplies: Number(document.getElementById('profitMonthlySupplies')?.value) || 0,
        monthlyRepairs: Number(document.getElementById('profitMonthlyRepairs')?.value) || 0,
        monthlyService: Number(document.getElementById('profitMonthlyService')?.value) || 0,
        initialSetup: totalSetup,
        memo: document.getElementById('profitMemo')?.value || '',
        devCosts: devCosts,
        useActualLogs: !!document.getElementById('profitUseActualLogs')?.checked,
        updatedAt: new Date().toISOString()
      };

      this.saveCosts(costs);
      this.closeModal();
      this.render();
      alert('기기별 원가 및 소모품 유지비용 정보가 성공적으로 저장되었습니다.\n수익성 분석 지표가 최신으로 갱신되었습니다.');
    },

    // 수익성 분석 엑셀 다운로드
    exportToExcel() {
      if (typeof XLSX === 'undefined') {
        alert('엑셀 라이브러리(SheetJS)를 로딩 중입니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      const clients = ClientManager.getClients();
      if (clients.length === 0) {
        alert('내보낼 거래처 데이터가 없습니다.');
        return;
      }

      const rows = clients.map((c, idx) => {
        const p = this.calcProfit(c);
        return {
          '순번': idx + 1,
          '거래처명': p.clientName,
          '임대장비수': p.deviceCount,
          '장비목록': p.deviceNames,
          '장비취득원가': p.costConfig.devCost,
          '초기설치물류비': p.costConfig.initialSetup,
          '만료잔존가치': p.costConfig.residualValue,
          '월소모품비': p.costConfig.monthlySupplies,
          '월부품수리비': p.costConfig.monthlyRepairs,
          '월정기점검비': p.costConfig.monthlyService,
          '월유지비합계': p.monthlyCosts,
          '월렌탈매출(공급가)': p.monthlyRevenue,
          '월순마진': p.monthlyNet,
          '계약기간(개월)': p.contractMonths,
          '원가회수시점(BEP개월)': p.isPaybackPossible ? Number(p.bepMonths.toFixed(1)) : '회수불가',
          '계약기간예상총순익': p.totalContractNet,
          '투자수익률(ROI%)': p.roi,
          '비고': p.costConfig.memo || ''
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 6 }, { wch: 18 }, { wch: 10 }, { wch: 25 }, { wch: 14 },
        { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 18 },
        { wch: 18 }, { wch: 14 }, { wch: 25 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '렌탈수익성분석');
      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `렌탈수익성분석_보고서_${today}.xlsx`);
    },

    escapeHtml(str) {
      return ClientManager.escapeHtml(str);
    },

    init() {
      // 모달 바깥 클릭 시 닫기
      const modal = document.getElementById('profitEditModal');
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

      this.render();
    }
  };

  // ============================================
  // 월별 정산 히스토리 및 비교 차트 모듈 (SettlementHistoryManager)
  // ============================================
  const SettlementHistoryManager = {
    escapeHtml: escapeHtml,
    revChart: null,
    volChart: null,

    openModal(targetClientId = null) {
      const modal = document.getElementById('settlementHistoryModal');
      if (!modal) return;

      // 거래처 필터 드롭다운 채우기
      const select = document.getElementById('settlementClientFilter');
      if (select) {
        const clients = ClientManager.getClients();
        select.innerHTML = '<option value="ALL">전체 거래처 통합 정산</option>' +
          clients.map(c => `<option value="${c.id}">${ClientManager.escapeHtml(c.name)}</option>`).join('');
        if (targetClientId) select.value = targetClientId;
        else select.value = 'ALL';
      }

      modal.style.display = 'flex';
      this.switchTab('charts');
      this.render();
    },

    closeModal() {
      const modal = document.getElementById('settlementHistoryModal');
      if (modal) modal.style.display = 'none';
    },

    onClientFilterChange() {
      this.render();
    },

    switchTab(tabName) {
      const btnCharts = document.getElementById('tabBtnCharts');
      const btnTable = document.getElementById('tabBtnTable');
      const tabCharts = document.getElementById('settlementTabCharts');
      const tabTable = document.getElementById('settlementTabTable');

      if (tabName === 'charts') {
        if (btnCharts) btnCharts.classList.add('active');
        if (btnTable) btnTable.classList.remove('active');
        if (tabCharts) tabCharts.style.display = 'block';
        if (tabTable) tabTable.style.display = 'none';
      } else {
        if (btnCharts) btnCharts.classList.remove('active');
        if (btnTable) btnTable.classList.add('active');
        if (tabCharts) tabCharts.style.display = 'none';
        if (tabTable) tabTable.style.display = 'block';
      }
    },

    render() {
      const filterVal = document.getElementById('settlementClientFilter')?.value || 'ALL';
      const history = ClientManager.getMeterHistory();
      const clients = ClientManager.getClients();

      // 필터 적용
      let records = (filterVal === 'ALL')
        ? [...history]
        : history.filter(h => String(h.clientId) === String(filterVal));

      // 만약 레코드가 없거나 부족하면 현재 등록된 거래처들로 당월 레코드 생성
      if (records.length === 0 && clients.length > 0) {
        clients.forEach(c => {
          if (filterVal === 'ALL' || String(c.id) === String(filterVal)) {
            const rec = ClientManager.syncMeterFromClient(c, ClientManager.getCurrentMonthStr());
            if (rec) records.push(rec);
          }
        });
      }

      // 월별 정렬 (오름차순: 과거 -> 최근)
      records.sort((a, b) => (a.month || '').localeCompare(b.month || ''));

      // 4개 핵심 지표 요약
      let sumBilled = 0;
      let sumPaid = 0;
      let sumUnpaid = 0;
      let issuedCount = 0;

      records.forEach(r => {
        const billed = r.summary?.finalBill !== undefined ? r.summary.finalBill : (r.summary?.totalBill || r.summary?.totalMonthBill || 0);
        const paid = r.settlement?.paidAmount !== undefined ? r.settlement.paidAmount : billed;
        const unpaid = r.settlement?.unpaidAmount !== undefined ? r.settlement.unpaidAmount : Math.max(0, billed - paid);

        sumBilled += billed;
        sumPaid += paid;
        sumUnpaid += unpaid;
        if (r.settlement?.taxStatus === 'issued' || r.settlement?.taxStatus === 'cashReceipt') {
          issuedCount++;
        }
      });

      const taxRate = records.length > 0 ? Math.round((issuedCount / records.length) * 100) : 0;

      const setEl = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      };
      setEl('settleSumBilled', sumBilled.toLocaleString() + '원');
      setEl('settleSumPaid', sumPaid.toLocaleString() + '원');
      setEl('settleSumUnpaid', sumUnpaid.toLocaleString() + '원');
      setEl('settleTaxRate', taxRate + '% (' + issuedCount + '/' + records.length + '건)');

      // 차트 & 테이블 렌더링
      this.renderCharts(records);
      this.renderHistoryTable(records);
    },

    renderCharts(records) {
      if (typeof Chart === 'undefined') return;

      // 월별로 집계
      const monthlyMap = {};
      records.forEach(r => {
        const m = r.month || ClientManager.getCurrentMonthStr();
        if (!monthlyMap[m]) {
          monthlyMap[m] = {
            billed: 0,
            paid: 0,
            unpaid: 0,
            bwTotal: 0,
            colorTotal: 0
          };
        }
        const billed = r.summary?.finalBill !== undefined ? r.summary.finalBill : (r.summary?.totalBill || r.summary?.totalMonthBill || 0);
        const paid = r.settlement?.paidAmount !== undefined ? r.settlement.paidAmount : billed;
        const unpaid = r.settlement?.unpaidAmount !== undefined ? r.settlement.unpaidAmount : Math.max(0, billed - paid);

        monthlyMap[m].billed += billed;
        monthlyMap[m].paid += paid;
        monthlyMap[m].unpaid += unpaid;

        (r.devices || []).forEach(d => {
          monthlyMap[m].bwTotal += (Number(d.bwUsed) || 0);
          monthlyMap[m].colorTotal += (Number(d.colorUsed) || 0);
        });
      });

      const labels = Object.keys(monthlyMap).sort();
      const billedData = labels.map(m => monthlyMap[m].billed);
      const paidData = labels.map(m => monthlyMap[m].paid);
      const unpaidData = labels.map(m => monthlyMap[m].unpaid);
      const bwData = labels.map(m => monthlyMap[m].bwTotal);
      const colorData = labels.map(m => monthlyMap[m].colorTotal);

      // Chart 1: 청구액 vs 실제 입금액 & 미수금
      const canvas1 = document.getElementById('settlementRevenueChart');
      if (canvas1) {
        if (this.revChart) this.revChart.destroy();
        this.revChart = new Chart(canvas1, {
          data: {
            labels: labels,
            datasets: [
              {
                type: 'bar',
                label: '청구금액(원)',
                data: billedData,
                backgroundColor: 'rgba(79, 70, 229, 0.7)',
                borderColor: '#4f46e5',
                borderWidth: 1,
                borderRadius: 4
              },
              {
                type: 'bar',
                label: '실제 입금액(원)',
                data: paidData,
                backgroundColor: 'rgba(16, 185, 129, 0.7)',
                borderColor: '#10b981',
                borderWidth: 1,
                borderRadius: 4
              },
              {
                type: 'line',
                label: '미수금 잔액(원)',
                data: unpaidData,
                borderColor: '#ef4444',
                backgroundColor: '#ef4444',
                tension: 0.2,
                borderWidth: 2,
                pointRadius: 4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
              tooltip: {
                callbacks: {
                  label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y).toLocaleString()}원`
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: (v) => (v >= 10000 ? (v / 10000).toLocaleString() + '만' : v.toLocaleString())
                }
              }
            }
          }
        });
      }

      // Chart 2: 복합기 출력량 추이
      const canvas2 = document.getElementById('settlementVolumeChart');
      if (canvas2) {
        if (this.volChart) this.volChart.destroy();
        this.volChart = new Chart(canvas2, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              {
                label: '흑백 출력량 (장)',
                data: bwData,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.3,
                borderWidth: 2,
                pointRadius: 4
              },
              {
                label: '컬러 출력량 (장)',
                data: colorData,
                borderColor: '#ec4899',
                backgroundColor: 'rgba(236, 72, 153, 0.1)',
                fill: true,
                tension: 0.3,
                borderWidth: 2,
                pointRadius: 4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
              tooltip: {
                callbacks: {
                  label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y).toLocaleString()}장`
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: (v) => v.toLocaleString() + '장'
                }
              }
            }
          }
        });
      }
    },

    renderHistoryTable(records) {
      const tbody = document.getElementById('settlementHistoryTbody');
      if (!tbody) return;

      if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="color:#94a3b8;padding:24px;">정산 내역이 존재하지 않습니다.</td></tr>';
        return;
      }

      // 내림차순(최신순) 표시
      const descList = [...records].reverse();
      tbody.innerHTML = descList.map(r => {
        const billed = r.summary?.finalBill !== undefined ? r.summary.finalBill : (r.summary?.totalBill || r.summary?.totalMonthBill || 0);
        const paid = r.settlement?.paidAmount !== undefined ? r.settlement.paidAmount : billed;
        const unpaid = r.settlement?.unpaidAmount !== undefined ? r.settlement.unpaidAmount : Math.max(0, billed - paid);

        let payBadge = '';
        if (paid >= billed && billed > 0) {
          payBadge = '<span class="badge-pay paid"><i class="fa fa-check"></i> 완납</span>';
        } else if (paid > 0) {
          payBadge = `<span class="badge-pay partial"><i class="fa fa-adjust"></i> 부분입금</span>`;
        } else {
          payBadge = `<span class="badge-pay unpaid"><i class="fa fa-exclamation-circle"></i> 미납</span>`;
        }

        let taxBadge = '';
        const tStatus = r.settlement?.taxStatus || 'unissued';
        if (tStatus === 'issued') {
          taxBadge = '<span class="badge-tax issued"><i class="fa fa-check-circle"></i> 발행완료</span>';
        } else if (tStatus === 'cashReceipt') {
          taxBadge = '<span class="badge-tax issued"><i class="fa fa-receipt"></i> 현금영수증</span>';
        } else if (tStatus === 'na') {
          taxBadge = '<span class="badge-tax unissued"><i class="fa fa-minus"></i> 영수</span>';
        } else {
          taxBadge = '<span class="badge-tax unissued"><i class="fa fa-clock"></i> 미발행</span>';
        }

        const dateStr = r.settlement?.paidDate || r.settlement?.taxDate || r.readingDate || '-';

        return `
          <tr>
            <td><strong>${r.month || '-'}</strong></td>
            <td style="text-align:left;font-weight:700;">${ClientManager.escapeHtml(r.clientName || '-')}</td>
            <td style="text-align:right;font-weight:700;color:#1e40af;">${billed.toLocaleString()}원</td>
            <td style="text-align:right;font-weight:700;color:#16a34a;">${paid.toLocaleString()}원</td>
            <td style="text-align:right;font-weight:800;color:${unpaid > 0 ? '#dc2626' : '#64748b'};">${unpaid.toLocaleString()}원</td>
            <td>${payBadge}</td>
            <td>${taxBadge}</td>
            <td style="font-size:11px;color:#64748b;">${dateStr}</td>
          </tr>
        `;
      }).join('');
    },

    init() {
      const modal = document.getElementById('settlementHistoryModal');
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.closeModal();
        });
      }
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
          this.closeModal();
        }
      });
    }
  };

  // ============================================
  // 소모품 관리 (SuppliesManager)
  // 소모품 입·출고 등록, 재고 관리, 월별 거래처 렌탈수익성분석 비용 자동 연동
  // ============================================
  const SuppliesManager = {
    STORAGE_KEY: 'pm_supplies_records',
    currentTab: 'records', // 'records' | 'inventory'
    currentType: 'in',     // 'in' | 'out'

    getRecords() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.error('소모품 데이터 로드 실패:', e);
        return [];
      }
    },

    saveRecords(records) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
      } catch (e) {
        console.error('소모품 데이터 저장 실패:', e);
      }
    },

    init() {
      // 초기 기본 샘플 데이터 (비어있을 경우 현실적인 샘플 등록)
      if (!localStorage.getItem(this.STORAGE_KEY)) {
        const today = ClientManager.getTodayStr ? ClientManager.getTodayStr() : new Date().toISOString().split('T')[0];
        const initialRecords = [
          {
            id: 'sup_' + Date.now() + '_1',
            type: 'in',
            itemName: '삼성 CLT-K504S 블랙 토너',
            supplier: '현대오피스',
            price: 38000,
            quantity: 5,
            totalAmount: 190000,
            date: today,
            memo: '정기 입고'
          },
          {
            id: 'sup_' + Date.now() + '_2',
            type: 'in',
            itemName: '신도 D410 드럼 유닛',
            supplier: '본사 물류센터',
            price: 75000,
            quantity: 3,
            totalAmount: 225000,
            date: today,
            memo: '부품 확보'
          }
        ];
        this.saveRecords(initialRecords);
      }

      // 모달 바깥 클릭 시 닫기
      const modal = document.getElementById('suppliesModal');
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.closeModal();
        });
      }

      this.render();
    },

    switchTab(tab) {
      this.currentTab = tab;
      const tabRec = document.getElementById('supTabRecords');
      const tabInv = document.getElementById('supTabInventory');
      const viewRec = document.getElementById('supViewRecords');
      const viewInv = document.getElementById('supViewInventory');

      if (tab === 'records') {
        if (tabRec) tabRec.className = 'btn-tab active';
        if (tabInv) tabInv.className = 'btn-tab';
        if (viewRec) viewRec.style.display = 'block';
        if (viewInv) viewInv.style.display = 'none';
      } else {
        if (tabRec) tabRec.className = 'btn-tab';
        if (tabInv) tabInv.className = 'btn-tab active';
        if (viewRec) viewRec.style.display = 'none';
        if (viewInv) viewInv.style.display = 'block';
      }
      this.render();
    },

    openModal(type = 'in') {
      const modal = document.getElementById('suppliesModal');
      if (!modal) return;
      modal.style.display = 'flex';

      const form = document.getElementById('suppliesForm');
      if (form) form.reset();

      const editId = document.getElementById('supEditId');
      if (editId) editId.value = '';

      const dateInp = document.getElementById('supDate');
      if (dateInp) {
        dateInp.value = ClientManager.getTodayStr ? ClientManager.getTodayStr() : new Date().toISOString().split('T')[0];
      }

      // 월별 거래처 드롭다운 구성
      this.populateClientDropdown();

      // 추천 품목명 datalist 갱신
      this.updateItemSuggestions();

      const hint = document.getElementById('supPriceHint');
      if (hint) hint.style.display = 'none';

      this.toggleType(type);
    },

    openEditModal(id) {
      const records = this.getRecords();
      const rec = records.find(r => r.id === id);
      if (!rec) {
        alert('수정할 데이터를 찾을 수 없습니다.');
        return;
      }

      const modal = document.getElementById('suppliesModal');
      if (!modal) return;
      modal.style.display = 'flex';

      const form = document.getElementById('suppliesForm');
      if (form) form.reset();

      const hint = document.getElementById('supPriceHint');
      if (hint) hint.style.display = 'none';

      // 수정 대상 ID 설정
      const editId = document.getElementById('supEditId');
      if (editId) editId.value = rec.id;

      // 월별 거래처 드롭다운 구성 및 datalist 갱신
      this.populateClientDropdown();
      this.updateItemSuggestions();

      // 입고/출고 타입 설정
      this.toggleType(rec.type);

      // 모달 타이틀 및 버튼 텍스트 변경
      const title = document.getElementById('supModalTitle');
      if (title) title.innerHTML = `<i class="fa fa-pen-to-square" style="color:#38bdf8;margin-right:6px;"></i>소모품 내역 수정 (${rec.type === 'in' ? '입고' : '출고'})`;

      const submitBtnText = document.getElementById('supSubmitBtnText');
      if (submitBtnText) submitBtnText.textContent = '수정 내용 저장';

      // 기존 데이터 폼에 주입
      const setVal = (elmId, val) => {
        const el = document.getElementById(elmId);
        if (el) el.value = (val !== undefined && val !== null) ? val : '';
      };

      setVal('supItemName', rec.itemName);
      setVal('supPrice', rec.price);
      setVal('supQuantity', rec.quantity);
      setVal('supTotalAmount', rec.totalAmount);
      setVal('supDate', rec.date);
      setVal('supMemo', rec.memo);

      if (rec.type === 'in') {
        setVal('supSupplier', rec.supplier);
      } else {
        const targetType = rec.targetType || 'client';
        const radios = document.querySelectorAll('input[name="supClientType"]');
        radios.forEach(r => {
          r.checked = (r.value === targetType);
        });
        this.toggleClientType(targetType);

        if (targetType === 'client') {
          setVal('supClientId', rec.clientId);
        } else {
          setVal('supOtherClientName', rec.clientName);
        }
      }
    },

    closeModal() {
      const modal = document.getElementById('suppliesModal');
      if (modal) modal.style.display = 'none';
      const editId = document.getElementById('supEditId');
      if (editId) editId.value = '';
      const hint = document.getElementById('supPriceHint');
      if (hint) hint.style.display = 'none';
    },

    toggleType(type) {
      this.currentType = type;
      const btnIn = document.getElementById('supTypeBtnIn');
      const btnOut = document.getElementById('supTypeBtnOut');
      const inFields = document.getElementById('supInFields');
      const outFields = document.getElementById('supOutFields');
      const dateLabel = document.getElementById('supDateLabel');
      const submitText = document.getElementById('supSubmitBtnText');
      const submitBtn = document.getElementById('supSubmitBtn');
      const title = document.getElementById('supModalTitle');
      const supplierInp = document.getElementById('supSupplier');

      if (type === 'in') {
        if (btnIn) {
          btnIn.className = 'btn-segment active';
          btnIn.style.borderColor = '#0284c7';
          btnIn.style.background = '#0284c7';
          btnIn.style.color = '#fff';
        }
        if (btnOut) {
          btnOut.className = 'btn-segment';
          btnOut.style.borderColor = '#e2e8f0';
          btnOut.style.background = '#f8fafc';
          btnOut.style.color = '#64748b';
        }
        if (inFields) inFields.style.display = 'block';
        if (outFields) outFields.style.display = 'none';
        if (dateLabel) dateLabel.textContent = '입고날짜';
        if (submitText) submitText.textContent = '입고 등록 완료';
        if (submitBtn) submitBtn.style.background = '#0284c7';
        if (title) title.textContent = '소모품 입고 등록';
        if (supplierInp) supplierInp.required = true;
      } else {
        if (btnOut) {
          btnOut.className = 'btn-segment active';
          btnOut.style.borderColor = '#f59e0b';
          btnOut.style.background = '#f59e0b';
          btnOut.style.color = '#fff';
        }
        if (btnIn) {
          btnIn.className = 'btn-segment';
          btnIn.style.borderColor = '#e2e8f0';
          btnIn.style.background = '#f8fafc';
          btnIn.style.color = '#64748b';
        }
        if (inFields) inFields.style.display = 'none';
        if (outFields) outFields.style.display = 'block';
        if (dateLabel) dateLabel.textContent = '출고날짜';
        if (submitText) submitText.textContent = '출고 등록 완료';
        if (submitBtn) submitBtn.style.background = '#d97706';
        if (title) title.textContent = '소모품 출고 등록';
        if (supplierInp) supplierInp.required = false;

        this.toggleClientType('client');
      }
      this.calcSubtotal();
    },

    toggleClientType(type) {
      const selectWrap = document.getElementById('supClientSelectWrap');
      const otherWrap = document.getElementById('supOtherClientWrap');
      const selectEl = document.getElementById('supClientId');
      const otherEl = document.getElementById('supOtherClientName');

      if (type === 'client') {
        if (selectWrap) selectWrap.style.display = 'block';
        if (otherWrap) otherWrap.style.display = 'none';
        if (selectEl) selectEl.required = true;
        if (otherEl) otherEl.required = false;
      } else {
        if (selectWrap) selectWrap.style.display = 'none';
        if (otherWrap) otherWrap.style.display = 'block';
        if (selectEl) selectEl.required = false;
        if (otherEl) otherEl.required = true;
      }
    },

    populateClientDropdown() {
      const select = document.getElementById('supClientId');
      if (!select) return;
      const clients = ClientManager.getClients();
      let html = '<option value="">-- 월별 거래처를 선택하세요 --</option>';
      clients.forEach(c => {
        const devCount = (c.devices || []).length;
        html += `<option value="${escapeHtml(String(c.id))}">${escapeHtml(c.name)} (기기 ${devCount}대)</option>`;
      });
      select.innerHTML = html;
    },

    updateItemSuggestions() {
      const datalist = document.getElementById('supItemSuggestions');
      if (!datalist) return;
      const records = this.getRecords();

      // 품목별 가장 최근 입고가 및 현재고 계산
      const itemInfoMap = {};
      records.forEach(r => {
        const name = (r.itemName || '').trim();
        if (!name) return;
        if (!itemInfoMap[name]) {
          itemInfoMap[name] = { inPrice: null, stock: 0 };
        }
        const qty = Number(r.quantity) || 0;
        if (r.type === 'in') {
          itemInfoMap[name].stock += qty;
          if (itemInfoMap[name].inPrice === null && r.price !== undefined && r.price !== null) {
            itemInfoMap[name].inPrice = Number(r.price) || 0;
          }
        } else {
          itemInfoMap[name].stock -= qty;
        }
      });

      const names = Object.keys(itemInfoMap);
      datalist.innerHTML = names.map(n => {
        const info = itemInfoMap[n];
        const priceLabel = info.inPrice !== null ? `최근 입고가: ${info.inPrice.toLocaleString()}원` : '';
        return `<option value="${escapeHtml(n)}">${escapeHtml(priceLabel)}</option>`;
      }).join('');
    },

    // 품목명 입력/선택 시 입고가를 자동으로 불러와 단가에 주입
    onItemNameChange(itemName) {
      const hint = document.getElementById('supPriceHint');
      if (!itemName) {
        if (hint) hint.style.display = 'none';
        return;
      }

      const trimmed = itemName.trim().toLowerCase();
      const records = this.getRecords();

      // 1. 가장 최근 입고(type === 'in') 내역 중 품목명 일치 항목 검색 (records는 최신순 정렬)
      let matched = records.find(r => r.type === 'in' && (r.itemName || '').trim().toLowerCase() === trimmed);

      // 2. 완전 일치가 없는 경우 포함 매칭 검색
      if (!matched) {
        matched = records.find(r => r.type === 'in' && (r.itemName || '').trim().toLowerCase().includes(trimmed));
      }

      // 3. 입고 내역이 없으면 전체 내역 중 가격이 있는 항목 검색
      if (!matched) {
        matched = records.find(r => (r.itemName || '').trim().toLowerCase() === trimmed && r.price);
      }

      const priceInp = document.getElementById('supPrice');

      if (matched && matched.price !== undefined && matched.price !== null) {
        const inPrice = Number(matched.price) || 0;
        if (priceInp) {
          priceInp.value = inPrice;
          this.calcSubtotal();
        }
        if (hint) {
          const supplierText = matched.supplier ? ` (입고처: ${escapeHtml(matched.supplier)})` : '';
          hint.innerHTML = `<i class="fa fa-check-circle" style="color:#0284c7;"></i> 최근 입고가 <strong>${inPrice.toLocaleString()}원</strong> 자동 반영${supplierText}`;
          hint.style.display = 'block';
        }
      } else {
        if (hint) hint.style.display = 'none';
      }
    },

    calcSubtotal() {
      const price = Number(document.getElementById('supPrice')?.value) || 0;
      const qty = Number(document.getElementById('supQuantity')?.value) || 0;
      const totalInp = document.getElementById('supTotalAmount');
      if (totalInp) {
        totalInp.value = price * qty;
      }
    },

    saveRecord(e) {
      if (e) e.preventDefault();

      const type = this.currentType; // 'in' or 'out'
      const itemName = (document.getElementById('supItemName')?.value || '').trim();
      const price = Number(document.getElementById('supPrice')?.value) || 0;
      const quantity = Number(document.getElementById('supQuantity')?.value) || 0;
      const totalAmount = Number(document.getElementById('supTotalAmount')?.value) || (price * quantity);
      const date = document.getElementById('supDate')?.value || ClientManager.getTodayStr();
      const memo = (document.getElementById('supMemo')?.value || '').trim();

      if (!itemName) {
        alert('품목명을 입력해주세요.');
        document.getElementById('supItemName')?.focus();
        return;
      }
      if (price < 0) {
        alert('올바른 가격(단가)을 입력해주세요.');
        document.getElementById('supPrice')?.focus();
        return;
      }
      if (quantity <= 0) {
        alert('수량은 1개 이상 입력해주세요.');
        document.getElementById('supQuantity')?.focus();
        return;
      }

      let supplier = '';
      let targetType = 'client';
      let clientId = '';
      let clientName = '';
      let linkedLogId = '';

      if (type === 'in') {
        supplier = (document.getElementById('supSupplier')?.value || '').trim();
        if (!supplier) {
          alert('입고처를 입력해주세요.');
          document.getElementById('supSupplier')?.focus();
          return;
        }
      } else {
        const clientTypeRadio = document.querySelector('input[name="supClientType"]:checked')?.value || 'client';
        targetType = clientTypeRadio;

        if (targetType === 'client') {
          clientId = document.getElementById('supClientId')?.value;
          if (!clientId) {
            alert('월별 거래처를 선택해주세요.');
            document.getElementById('supClientId')?.focus();
            return;
          }
          const client = ClientManager.getClients().find(c => String(c.id) === String(clientId));
          clientName = client ? client.name : '선택 거래처';

          // ★ [핵심 요구사항] 렌탈수익성분석 - 원가 및 비용 설정 메뉴에 소모품 비용 자동 추가!
          linkedLogId = 'sup_log_' + Date.now();
          const logs = ProfitManager.getMaintenanceLogs(clientId);
          logs.unshift({
            id: linkedLogId,
            date: date,
            category: 'supplies', // 소모품
            name: `${itemName} (출고 ${quantity}개)`,
            amount: totalAmount,
            memo: memo ? `소모품관리 출고 연동 - ${memo}` : '소모품관리 출고 연동',
            source: 'supplies_mgmt'
          });
          ProfitManager.saveMaintenanceLogs(clientId, logs);

        } else {
          clientName = (document.getElementById('supOtherClientName')?.value || '').trim();
          if (!clientName) {
            alert('기타업체명을 입력해주세요.');
            document.getElementById('supOtherClientName')?.focus();
            return;
          }
        }
      }

      const editId = document.getElementById('supEditId')?.value;
      const records = this.getRecords();

      // =========================
      // 1. 수정 모드 (editId 존재)
      // =========================
      if (editId) {
        const idx = records.findIndex(r => r.id === editId);
        if (idx === -1) {
          alert('수정할 내역을 찾을 수 없습니다.');
          return;
        }
        const oldRec = records[idx];
        let finalLinkedLogId = oldRec.linkedLogId || '';

        // 출고 & 월별 거래처 연동 동기화 처리
        if (type === 'out' && targetType === 'client') {
          if (oldRec.type === 'out' && oldRec.targetType === 'client' && oldRec.clientId === clientId && finalLinkedLogId) {
            // 동일한 월별 거래처: 기존 렌탈수익성 지출 장부 내용 업데이트
            const logs = ProfitManager.getMaintenanceLogs(clientId);
            const logIdx = logs.findIndex(l => l.id === finalLinkedLogId);
            if (logIdx !== -1) {
              logs[logIdx].date = date;
              logs[logIdx].name = `${itemName} (출고 ${quantity}개)`;
              logs[logIdx].amount = totalAmount;
              logs[logIdx].memo = memo ? `소모품관리 출고 연동 - ${memo}` : '소모품관리 출고 연동';
              ProfitManager.saveMaintenanceLogs(clientId, logs);
            } else {
              // 로그가 없으면 새로 생성
              finalLinkedLogId = 'sup_log_' + Date.now();
              logs.unshift({
                id: finalLinkedLogId,
                date: date,
                category: 'supplies',
                name: `${itemName} (출고 ${quantity}개)`,
                amount: totalAmount,
                memo: memo ? `소모품관리 출고 연동 - ${memo}` : '소모품관리 출고 연동',
                source: 'supplies_mgmt'
              });
              ProfitManager.saveMaintenanceLogs(clientId, logs);
            }
          } else {
            // 거래처가 바뀌었거나 이전에 연동이 없었던 경우
            if (oldRec.type === 'out' && oldRec.clientId && finalLinkedLogId) {
              let oldLogs = ProfitManager.getMaintenanceLogs(oldRec.clientId);
              oldLogs = oldLogs.filter(l => l.id !== finalLinkedLogId);
              ProfitManager.saveMaintenanceLogs(oldRec.clientId, oldLogs);
            }
            finalLinkedLogId = 'sup_log_' + Date.now();
            const newLogs = ProfitManager.getMaintenanceLogs(clientId);
            newLogs.unshift({
              id: finalLinkedLogId,
              date: date,
              category: 'supplies',
              name: `${itemName} (출고 ${quantity}개)`,
              amount: totalAmount,
              memo: memo ? `소모품관리 출고 연동 - ${memo}` : '소모품관리 출고 연동',
              source: 'supplies_mgmt'
            });
            ProfitManager.saveMaintenanceLogs(clientId, newLogs);
          }
        } else {
          // 새 상태가 입고이거나 기타업체인 경우: 이전 연동 로그가 있었다면 삭제
          if (oldRec.type === 'out' && oldRec.clientId && finalLinkedLogId) {
            let oldLogs = ProfitManager.getMaintenanceLogs(oldRec.clientId);
            oldLogs = oldLogs.filter(l => l.id !== finalLinkedLogId);
            ProfitManager.saveMaintenanceLogs(oldRec.clientId, oldLogs);
          }
          finalLinkedLogId = '';
        }

        records[idx] = {
          ...oldRec,
          type,
          itemName,
          supplier: type === 'in' ? supplier : '',
          targetType: type === 'out' ? targetType : '',
          clientId: type === 'out' ? clientId : '',
          clientName: type === 'out' ? clientName : '',
          price,
          quantity,
          totalAmount,
          date,
          memo,
          linkedLogId: finalLinkedLogId,
          updatedAt: new Date().toISOString()
        };

        this.saveRecords(records);

        // ★ 렌탈수익성분석 원가 및 화면 실시간 동기화
        if (type === 'out' && targetType === 'client' && clientId) {
          ProfitManager.syncSuppliesCost(clientId);
        }
        if (oldRec.type === 'out' && oldRec.clientId && String(oldRec.clientId) !== String(clientId)) {
          ProfitManager.syncSuppliesCost(oldRec.clientId);
        }

        this.closeModal();
        this.render();

        let updateMsg = `[수정 완료] "${itemName}" 내역이 성공적으로 수정되었습니다.`;
        if (type === 'out' && targetType === 'client') {
          updateMsg += `\n\n★ [연동 완료] "${clientName}"의 렌탈수익성분석 지출 장부도 최신 정보(${totalAmount.toLocaleString()}원)로 자동 갱신되었습니다!`;
        }
        alert(updateMsg);
        return;
      }

      // =========================
      // 2. 신규 등록 모드
      // =========================
      if (type === 'out' && targetType === 'client') {
        linkedLogId = 'sup_log_' + Date.now();
        const logs = ProfitManager.getMaintenanceLogs(clientId);
        logs.unshift({
          id: linkedLogId,
          date: date,
          category: 'supplies',
          name: `${itemName} (출고 ${quantity}개)`,
          amount: totalAmount,
          memo: memo ? `소모품관리 출고 연동 - ${memo}` : '소모품관리 출고 연동',
          source: 'supplies_mgmt'
        });
        ProfitManager.saveMaintenanceLogs(clientId, logs);
        // ★ 렌탈수익성분석 원가 및 화면 실시간 동기화
        ProfitManager.syncSuppliesCost(clientId);
      }

      const newRecord = {
        id: 'sup_' + Date.now(),
        type,
        itemName,
        supplier: type === 'in' ? supplier : '',
        targetType: type === 'out' ? targetType : '',
        clientId: type === 'out' ? clientId : '',
        clientName: type === 'out' ? clientName : '',
        price,
        quantity,
        totalAmount,
        date,
        memo,
        linkedLogId,
        createdAt: new Date().toISOString()
      };

      records.unshift(newRecord);
      this.saveRecords(records);

      this.closeModal();
      this.render();

      let successMsg = type === 'in'
        ? `[입고 완료] "${itemName}" ${quantity}개가 성공적으로 입고 등록되었습니다.`
        : `[출고 완료] "${itemName}" ${quantity}개가 성공적으로 출고 등록되었습니다.`;

      if (type === 'out' && targetType === 'client') {
        successMsg += `\n\n★ [연동 완료] "${clientName}"의 렌탈수익성분석 - 원가 및 비용 설정 지출 장부에 소모품 비용(${totalAmount.toLocaleString()}원)이 자동으로 추가되었습니다!`;
      }
      alert(successMsg);
    },

    deleteRecord(id) {
      const records = this.getRecords();
      const rec = records.find(r => r.id === id);
      if (!rec) return;

      const typeStr = rec.type === 'in' ? '입고' : '출고';
      if (!confirm(`해당 ${typeStr} 내역("${rec.itemName}", ${rec.quantity}개)을 삭제하시겠습니까?`)) {
        return;
      }

      // ★ 출고 연동 로그가 있는 경우 ProfitManager 지출 장부에서도 철저하게 자동 삭제 및 실시간 재계산
      if (rec.type === 'out' && rec.clientId) {
        const cId = String(rec.clientId);
        let logs = ProfitManager.getMaintenanceLogs(cId);

        // 1차: linkedLogId 매칭, 2차: 품목명 & 금액 매칭으로 확실한 삭제
        logs = logs.filter(l => {
          if (rec.linkedLogId && l.id === rec.linkedLogId) return false;
          if (l.source === 'supplies_mgmt') {
            const nameMatch = l.name && l.name.includes(rec.itemName);
            const amtMatch = Number(l.amount) === Number(rec.totalAmount);
            if (nameMatch && amtMatch) return false;
          }
          return true;
        });

        ProfitManager.saveMaintenanceLogs(cId, logs);
        // ★ 렌탈수익성분석 원가 및 유지비용 실시간 동기화 갱신!
        ProfitManager.syncSuppliesCost(cId);
      }

      const filtered = records.filter(r => r.id !== id);
      this.saveRecords(filtered);
      this.render();

      if (rec.type === 'out' && rec.clientId) {
        alert('출고 내역이 삭제되었으며, 렌탈수익성분석 메뉴의 소모품 지출 장부와 유지비용이 최신으로 즉시 업데이트되었습니다.');
      }
    },

    render() {
      this.renderStats();
      if (this.currentTab === 'records') {
        this.renderRecordsTable();
      } else {
        this.renderInventoryTable();
      }
    },

    renderStats() {
      const records = this.getRecords();
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = String(now.getMonth() + 1).padStart(2, '0');
      const curYearMonth = `${curYear}-${curMonth}`;

      // 품목별 집계
      const itemMap = {};
      let totalStock = 0;
      let monthInAmt = 0;
      let monthInCount = 0;
      let monthOutAmt = 0;
      let monthOutCount = 0;

      records.forEach(r => {
        const itemKey = r.itemName;
        if (!itemMap[itemKey]) {
          itemMap[itemKey] = { inQty: 0, outQty: 0, stock: 0 };
        }
        const qty = Number(r.quantity) || 0;
        const amt = Number(r.totalAmount) || 0;
        const isThisMonth = (r.date || '').startsWith(curYearMonth);

        if (r.type === 'in') {
          itemMap[itemKey].inQty += qty;
          itemMap[itemKey].stock += qty;
          totalStock += qty;
          if (isThisMonth) {
            monthInAmt += amt;
            monthInCount++;
          }
        } else {
          itemMap[itemKey].outQty += qty;
          itemMap[itemKey].stock -= qty;
          totalStock -= qty;
          if (isThisMonth) {
            monthOutAmt += amt;
            monthOutCount++;
          }
        }
      });

      const totalItemCount = Object.keys(itemMap).length;

      const setEl = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      };

      setEl('supStatTotalItems', `${totalItemCount}개`);
      setEl('supStatTotalStock', `${totalStock}개`);
      setEl('supStatMonthInAmt', `${monthInAmt.toLocaleString()}원`);
      setEl('supStatMonthInCount', `총 ${monthInCount}건 입고`);
      setEl('supStatMonthOutAmt', `${monthOutAmt.toLocaleString()}원`);
      setEl('supStatMonthOutCount', `총 ${monthOutCount}건 출고`);
    },

    renderRecordsTable() {
      const tbody = document.getElementById('supRecordsTbody');
      if (!tbody) return;

      const records = this.getRecords();
      const filterType = document.getElementById('supFilterType')?.value || 'ALL';
      const filterPeriod = document.getElementById('supFilterPeriod')?.value || 'THIS_MONTH';
      const keyword = (document.getElementById('supSearchInput')?.value || '').trim().toLowerCase();

      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = String(now.getMonth() + 1).padStart(2, '0');
      const curYearMonth = `${curYear}-${curMonth}`;

      const prevD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevYearMonth = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`;

      const filtered = records.filter(r => {
        // 구분 필터
        if (filterType !== 'ALL' && r.type !== filterType) return false;

        // 기간 필터
        if (filterPeriod === 'THIS_MONTH') {
          if (!r.date || !r.date.startsWith(curYearMonth)) return false;
        } else if (filterPeriod === 'PREV_MONTH') {
          if (!r.date || !r.date.startsWith(prevYearMonth)) return false;
        } else if (filterPeriod === 'THIS_YEAR') {
          if (!r.date || !r.date.startsWith(String(curYear))) return false;
        }

        // 검색어 필터
        if (keyword) {
          const matchItem = (r.itemName || '').toLowerCase().includes(keyword);
          const matchTarget = (r.supplier || r.clientName || '').toLowerCase().includes(keyword);
          const matchMemo = (r.memo || '').toLowerCase().includes(keyword);
          if (!matchItem && !matchTarget && !matchMemo) return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#94a3b8;padding:32px;">조건에 일치하는 입·출고 내역이 없습니다.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(r => {
        const isIn = r.type === 'in';
        const typeBadge = isIn
          ? '<span class="badge-in"><i class="fa fa-arrow-down"></i> 입고</span>'
          : '<span class="badge-out"><i class="fa fa-arrow-up"></i> 출고</span>';

        let targetHtml = '';
        if (isIn) {
          targetHtml = `<span style="color:#38bdf8;font-weight:600;font-size:13px;"><i class="fa fa-truck" style="margin-right:4px;"></i>${escapeHtml(r.supplier || '-')}</span>`;
        } else {
          if (r.targetType === 'client') {
            targetHtml = `<span class="badge-client" title="월별 거래처"><i class="fa fa-building"></i> ${escapeHtml(r.clientName || '-')}</span>`;
          } else {
            targetHtml = `<span class="badge-other" title="기타업체"><i class="fa fa-store"></i> ${escapeHtml(r.clientName || '-')}</span>`;
          }
        }

        let linkHtml = '';
        if (!isIn && r.targetType === 'client') {
          linkHtml = '<span class="badge-sync-ok" title="렌탈수익성분석 원가/비용 설정에 자동 추가됨"><i class="fa fa-check-circle"></i> 렌탈수익성 연동</span>';
        }

        const memoText = r.memo ? escapeHtml(r.memo) : '-';

        return `
          <tr>
            <td style="white-space:nowrap;color:#cbd5e1;font-size:13px;font-weight:500;">${r.date || '-'}</td>
            <td style="text-align:center;white-space:nowrap;">${typeBadge}</td>
            <td style="font-weight:700;color:#f8fafc;font-size:14px;">${escapeHtml(r.itemName)}</td>
            <td>${targetHtml}</td>
            <td style="text-align:right;color:#e2e8f0;font-size:13.5px;font-weight:500;white-space:nowrap;">${Number(r.price).toLocaleString()}원</td>
            <td style="text-align:center;font-weight:700;color:#38bdf8;font-size:14px;white-space:nowrap;">${Number(r.quantity).toLocaleString()}개</td>
            <td style="text-align:right;font-weight:700;color:#60a5fa;font-size:14px;white-space:nowrap;">${Number(r.totalAmount).toLocaleString()}원</td>
            <td style="font-size:12.5px;color:#94a3b8;">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span>${memoText}</span>
                ${linkHtml}
              </div>
            </td>
            <td style="text-align:center;white-space:nowrap;">
              <button type="button" class="btn-action-icon edit" title="수정" onclick="SuppliesManager.openEditModal('${r.id}')" style="color:#38bdf8;background:none;border:none;cursor:pointer;font-size:15px;padding:4px 6px;margin-right:2px;transition:color 0.2s;">
                <i class="fa fa-pen-to-square"></i>
              </button>
              <button type="button" class="btn-action-icon delete" title="삭제" onclick="SuppliesManager.deleteRecord('${r.id}')" style="color:#f87171;background:none;border:none;cursor:pointer;font-size:15px;padding:4px 6px;transition:color 0.2s;">
                <i class="fa fa-trash-alt"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    },

    renderInventoryTable() {
      const tbody = document.getElementById('supInventoryTbody');
      if (!tbody) return;

      const records = this.getRecords();
      const keyword = (document.getElementById('supSearchInput')?.value || '').trim().toLowerCase();

      const itemMap = {};
      records.forEach(r => {
        const name = r.itemName;
        if (!itemMap[name]) {
          itemMap[name] = {
            name,
            totalIn: 0,
            totalOut: 0,
            stock: 0,
            lastDate: r.date || ''
          };
        }
        const qty = Number(r.quantity) || 0;
        if (r.type === 'in') {
          itemMap[name].totalIn += qty;
          itemMap[name].stock += qty;
        } else {
          itemMap[name].totalOut += qty;
          itemMap[name].stock -= qty;
        }
        if (r.date && (!itemMap[name].lastDate || r.date > itemMap[name].lastDate)) {
          itemMap[name].lastDate = r.date;
        }
      });

      let items = Object.values(itemMap);
      if (keyword) {
        items = items.filter(it => it.name.toLowerCase().includes(keyword));
      }

      if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:32px;">등록된 품목 재고 정보가 없습니다.</td></tr>';
        return;
      }

      tbody.innerHTML = items.map((it, idx) => {
        let statusBadge = '';
        if (it.stock <= 0) {
          statusBadge = '<span class="badge-stock-zero">재고 없음</span>';
        } else if (it.stock <= 2) {
          statusBadge = '<span class="badge-stock-low">재고 부족</span>';
        } else {
          statusBadge = '<span class="badge-stock-ok">재고 여유</span>';
        }

        return `
          <tr>
            <td style="text-align:center;color:#94a3b8;">${idx + 1}</td>
            <td style="font-weight:700;color:#f8fafc;font-size:14px;">${escapeHtml(it.name)}</td>
            <td style="text-align:right;color:#38bdf8;font-weight:600;font-size:13.5px;white-space:nowrap;">${it.totalIn.toLocaleString()}개</td>
            <td style="text-align:right;color:#fbbf24;font-weight:600;font-size:13.5px;white-space:nowrap;">${it.totalOut.toLocaleString()}개</td>
            <td style="text-align:right;font-size:15px;font-weight:800;color:${it.stock <= 0 ? '#f87171' : '#f8fafc'};white-space:nowrap;">${it.stock.toLocaleString()}개</td>
            <td style="text-align:center;white-space:nowrap;">${statusBadge}</td>
            <td style="text-align:center;color:#cbd5e1;font-size:13px;white-space:nowrap;">${it.lastDate || '-'}</td>
          </tr>
        `;
      }).join('');
    },

    exportCSV() {
      const records = this.getRecords();
      if (records.length === 0) {
        alert('다운로드할 소모품 내역이 없습니다.');
        return;
      }

      const headers = ['일자', '구분', '품목명', '거래처/입고처', '거래처구분', '단가', '수량', '합계금액', '비고'];
      const rows = records.map(r => {
        const isIn = r.type === 'in';
        const typeStr = isIn ? '입고' : '출고';
        const target = isIn ? (r.supplier || '') : (r.clientName || '');
        const targetKind = isIn ? '입고처' : (r.targetType === 'client' ? '월별거래처(연동)' : '기타업체');
        return [
          r.date || '',
          typeStr,
          `"${(r.itemName || '').replace(/"/g, '""')}"`,
          `"${target.replace(/"/g, '""')}"`,
          targetKind,
          r.price || 0,
          r.quantity || 0,
          r.totalAmount || 0,
          `"${(r.memo || '').replace(/"/g, '""')}"`
        ].join(',');
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `소모품_입출고내역_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // 전역 노출
  window.ClientManager = ClientManager;
  window.ProfitManager = ProfitManager;
  window.SettlementHistoryManager = SettlementHistoryManager;
  window.SuppliesManager = SuppliesManager;

  // 모듈 초기화 실행 (각 모듈 독립 실행 보장)
  try { ClientManager.init(); } catch (e) { console.error('ClientManager init error:', e); }
  try { ProfitManager.init(); } catch (e) { console.error('ProfitManager init error:', e); }
  try { SettlementHistoryManager.init(); } catch (e) { console.error('SettlementHistoryManager init error:', e); }
  try { SuppliesManager.init(); } catch (e) { console.error('SuppliesManager init error:', e); }

  // 관리자 로그인 시 전화상담신청 새 글 알림 확인
  if (typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin()) {
    if (typeof Board !== 'undefined' && Board.checkAndNotifyAdmin) {
      Board.checkAndNotifyAdmin();
    }
  }

}); // END DOMContentLoaded


