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

}); // END DOMContentLoaded
