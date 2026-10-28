/**
 * MediScan AI — Clinical Frontend Logic
 * =======================================
 * Patient info, upload, analysis, image controls, clinical notes, print report
 */

// ─── DOM References ────────────────────────────────────────────────────────

const stepModality     = document.getElementById('stepModality');
const stepPatientUpload = document.getElementById('stepPatientUpload');
const stepResults      = document.getElementById('stepResults');

const uploadZone       = document.getElementById('uploadZone');
const fileInput        = document.getElementById('fileInput');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const uploadPreview    = document.getElementById('uploadPreview');
const previewImage     = document.getElementById('previewImage');
const uploadFileInfo   = document.getElementById('uploadFileInfo');
const btnRemoveImg     = document.getElementById('btnRemoveImg');

const btnAnalyze       = document.getElementById('btnAnalyze');
const btnAnalyzeContent = document.getElementById('btnAnalyzeContent');
const btnAnalyzeLoading = document.getElementById('btnAnalyzeLoading');

const resultSummary    = document.getElementById('resultSummary');
const summaryIcon      = document.getElementById('summaryIcon');
const summaryTitle     = document.getElementById('summaryTitle');
const summarySubtitle  = document.getElementById('summarySubtitle');
const resultTimestamp  = document.getElementById('resultTimestamp');
const resultPatientBar = document.getElementById('resultPatientBar');
const findingsList     = document.getElementById('findingsList');

const resultImage      = document.getElementById('resultImage');
const btnShowAnnotated = document.getElementById('btnShowAnnotated');
const btnShowOriginal  = document.getElementById('btnShowOriginal');

const sliderBrightness = document.getElementById('sliderBrightness');
const sliderContrast   = document.getElementById('sliderContrast');
const imageViewport    = document.getElementById('imageViewport');

const clinicalNotes    = document.getElementById('clinicalNotes');

// ─── State ─────────────────────────────────────────────────────────────────

let currentModality = 'xray';
let selectedFile = null;
let annotatedB64 = null;
let originalB64  = null;
let currentZoom  = 1;
let lastAnalysisData = null;

const severityLabels = {
    low: 'ระดับต่ำ',
    warning: 'เฝ้าระวัง',
    danger: 'อันตราย',
    critical: 'วิกฤต',
};

// ─── Modality Selection ────────────────────────────────────────────────────

function selectModality(id) {
    if (id === 'xray' || id === 'ct' || id === 'brain_ct') {
        currentModality = id;
        stepModality.style.display = 'none';
        stepPatientUpload.style.display = 'block';
        stepResults.style.display = 'none';
        resetUpload();
        stepPatientUpload.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function goBackToModality() {
    stepPatientUpload.style.display = 'none';
    stepResults.style.display = 'none';
    stepModality.style.display = 'block';
}

// ─── File Upload ───────────────────────────────────────────────────────────

uploadZone.addEventListener('click', (e) => {
    if (e.target === btnRemoveImg || btnRemoveImg.contains(e.target)) return;
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
});

uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
});
uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
});

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('กรุณาเลือกไฟล์ภาพเท่านั้น (JPG, PNG)', 'error');
        return;
    }
    if (file.size > 20 * 1024 * 1024) {
        showToast('ไฟล์ขนาดใหญ่เกิน 20MB', 'error');
        return;
    }

    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
        previewImage.src = ev.target.result;
        uploadPlaceholder.style.display = 'none';
        uploadPreview.style.display = 'block';
        const mb = (file.size / (1024 * 1024)).toFixed(2);
        uploadFileInfo.textContent = `${file.name} — ${mb} MB`;
    };
    reader.readAsDataURL(file);
    btnAnalyze.disabled = false;
    stepResults.style.display = 'none';
}

btnRemoveImg.addEventListener('click', (e) => {
    e.stopPropagation();
    resetUpload();
});

function resetUpload() {
    selectedFile = null;
    fileInput.value = '';
    uploadPreview.style.display = 'none';
    uploadPlaceholder.style.display = 'block';
    btnAnalyze.disabled = true;
    previewImage.src = '';
    uploadFileInfo.textContent = '';
}

// ─── Analyze ───────────────────────────────────────────────────────────────

btnAnalyze.addEventListener('click', runAnalysis);

async function runAnalysis() {
    if (!selectedFile) return;

    btnAnalyzeContent.style.display = 'none';
    btnAnalyzeLoading.style.display = 'flex';
    btnAnalyze.disabled = true;

    try {
        const fd = new FormData();
        fd.append('file', selectedFile);
        fd.append('modality', currentModality);

        const resp = await fetch('/api/predict', { method: 'POST', body: fd });
        const data = await resp.json();

        if (!resp.ok || data.error) {
            showToast(data.error || 'เกิดข้อผิดพลาดในการวิเคราะห์', 'error');
            return;
        }

        annotatedB64 = data.annotated_image;
        originalB64  = data.original_image;
        lastAnalysisData = data;

        renderResults(data);
    } catch (err) {
        console.error(err);
        showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    } finally {
        btnAnalyzeContent.style.display = 'flex';
        btnAnalyzeLoading.style.display = 'none';
        btnAnalyze.disabled = false;
    }
}

// ─── Render Results ────────────────────────────────────────────────────────

function renderResults(data) {
    const { total_detections, detections, analyzed_at, image_size } = data;

    stepResults.style.display = 'block';
    setTimeout(() => stepResults.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

    // Timestamp
    if (analyzed_at) {
        const d = new Date(analyzed_at);
        resultTimestamp.textContent = `วิเคราะห์เมื่อ: ${d.toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' })} เวลา ${d.toLocaleTimeString('th-TH')}`;
    }

    // Summary
    if (total_detections === 0) {
        resultSummary.className = 'result-summary summary-success';
        summaryIcon.textContent = '✓';
        summaryIcon.style.color = '#22c55e';
        summaryTitle.textContent = 'ไม่พบความผิดปกติ (No Findings)';
        summarySubtitle.textContent = 'ระบบ AI ไม่พบสัญญาณของความผิดปกติในภาพสแกนนี้';
    } else {
        const hasCritical = detections.some(d => d.severity === 'critical');
        const hasDanger   = detections.some(d => d.severity === 'danger');
        const uniqueTypes = new Set(detections.map(d => d.name_en)).size;

        if (hasCritical) {
            resultSummary.className = 'result-summary summary-critical';
            summaryIcon.textContent = '⚠';
            summaryIcon.style.color = '#dc2626';
        } else if (hasDanger) {
            resultSummary.className = 'result-summary summary-danger';
            summaryIcon.textContent = '⚠';
            summaryIcon.style.color = '#ef4444';
        } else {
            resultSummary.className = 'result-summary summary-warning';
            summaryIcon.textContent = '⚠';
            summaryIcon.style.color = '#f59e0b';
        }
        summaryTitle.textContent = `พบความผิดปกติ ${total_detections} จุด (${uniqueTypes} ประเภท)`;
        summarySubtitle.textContent = 'โปรดส่งต่อให้รังสีแพทย์เพื่อวินิจฉัยยืนยัน';
    }

    // Patient bar
    const hn   = document.getElementById('patientHN').value.trim();
    const name = document.getElementById('patientName').value.trim();
    const age  = document.getElementById('patientAge').value.trim();
    const sex  = document.getElementById('patientSex').value;

    if (hn || name || age || sex) {
        resultPatientBar.style.display = 'flex';
        document.getElementById('dispPatientHN').textContent = hn ? `HN: ${hn}` : '';
        document.getElementById('dispPatientName').textContent = name || '';
        document.getElementById('dispPatientAge').textContent = age ? `อายุ ${age} ปี` : '';
        document.getElementById('dispPatientSex').textContent = sex === 'M' ? 'ชาย' : sex === 'F' ? 'หญิง' : '';

        // Hide empty spans
        resultPatientBar.querySelectorAll('span').forEach(s => {
            s.style.display = s.textContent ? '' : 'none';
        });
    } else {
        resultPatientBar.style.display = 'none';
    }

    // Image
    resultImage.src = `data:image/jpeg;base64,${annotatedB64}`;
    btnShowAnnotated.classList.add('active');
    btnShowOriginal.classList.remove('active');
    resetImageControls();

    // Findings
    renderFindings(detections);
}

function renderFindings(detections) {
    findingsList.innerHTML = '';

    if (detections.length === 0) {
        findingsList.innerHTML = `
            <div class="no-findings">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <h4>ผลการตรวจปกติ</h4>
                <p>ไม่พบรอยโรคหรือความผิดปกติในภาพ</p>
            </div>`;
        return;
    }

    detections.forEach((det, i) => {
        const card = document.createElement('div');
        card.className = 'finding-card';

        // Build mask area row if segmentation
        let maskAreaHtml = '';
        if (det.type === 'segmentation' && det.mask_area_pct) {
            maskAreaHtml = `
            <div class="mask-area-row">
                <span class="mask-area-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>
                    Segmentation
                </span>
                <span class="mask-area-info">พื้นที่: ${det.mask_area_pct} (${det.mask_area_px?.toLocaleString() || '—'} px)</span>
            </div>`;
        }

        card.innerHTML = `
            <div class="finding-header">
                <span class="finding-name">${det.name_en} <span class="finding-name-th">(${det.name_th})</span></span>
                <span class="sev-badge sev-${det.severity}">${severityLabels[det.severity] || det.severity}</span>
            </div>
            <p class="finding-desc">${det.description}</p>${maskAreaHtml}
            <div class="conf-row">
                <span class="conf-label">Confidence</span>
                <div class="conf-bar"><div class="conf-fill" style="width:0%;" data-w="${(det.confidence*100).toFixed(1)}"></div></div>
                <span class="conf-pct">${det.confidence_pct}</span>
            </div>`;
        findingsList.appendChild(card);

        // Animate bar
        requestAnimationFrame(() => {
            setTimeout(() => {
                card.querySelector('.conf-fill').style.width = card.querySelector('.conf-fill').dataset.w + '%';
            }, 150 + i * 80);
        });
    });
}

// ─── Image Toggle ──────────────────────────────────────────────────────────

btnShowAnnotated.addEventListener('click', () => {
    resultImage.src = `data:image/jpeg;base64,${annotatedB64}`;
    btnShowAnnotated.classList.add('active');
    btnShowOriginal.classList.remove('active');
});

btnShowOriginal.addEventListener('click', () => {
    resultImage.src = `data:image/jpeg;base64,${originalB64}`;
    btnShowOriginal.classList.add('active');
    btnShowAnnotated.classList.remove('active');
});

// ─── Image Controls ────────────────────────────────────────────────────────

function imageZoom(dir) {
    currentZoom = Math.min(3, Math.max(0.5, currentZoom + dir * 0.25));
    applyImageFilters();
}

sliderBrightness.addEventListener('input', applyImageFilters);
sliderContrast.addEventListener('input', applyImageFilters);

function applyImageFilters() {
    const b = sliderBrightness.value;
    const c = sliderContrast.value;
    resultImage.style.filter = `brightness(${b}%) contrast(${c}%)`;
    resultImage.style.transform = `scale(${currentZoom})`;
}

function resetImageControls() {
    currentZoom = 1;
    sliderBrightness.value = 100;
    sliderContrast.value = 100;
    applyImageFilters();
}

function toggleFullscreen() {
    if (imageViewport.requestFullscreen) {
        imageViewport.requestFullscreen();
    } else if (imageViewport.webkitRequestFullscreen) {
        imageViewport.webkitRequestFullscreen();
    }
}

// ─── New Case ──────────────────────────────────────────────────────────────

function startNewCase() {
    resetUpload();
    stepResults.style.display = 'none';
    annotatedB64 = null;
    originalB64 = null;
    lastAnalysisData = null;
    document.getElementById('patientHN').value = '';
    document.getElementById('patientName').value = '';
    document.getElementById('patientAge').value = '';
    document.getElementById('patientSex').value = '';
    clinicalNotes.value = '';
    stepPatientUpload.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Print Report ──────────────────────────────────────────────────────────

function printReport() {
    if (!lastAnalysisData) return;
    const data = lastAnalysisData;

    // Fill print template
    const hn   = document.getElementById('patientHN').value.trim();
    const name = document.getElementById('patientName').value.trim();
    const age  = document.getElementById('patientAge').value.trim();
    const sex  = document.getElementById('patientSex').value;

    document.getElementById('printHN').textContent = hn || '—';
    document.getElementById('printName').textContent = name || '—';
    document.getElementById('printAge').textContent = age ? `${age} ปี` : '—';
    document.getElementById('printSex').textContent = sex === 'M' ? 'ชาย (Male)' : sex === 'F' ? 'หญิง (Female)' : '—';
    document.getElementById('printModality').textContent = currentModality === 'brain_ct' ? 'Brain CT Scan' : currentModality === 'ct' ? 'CT Scan — Lung Nodule' : 'Chest X-Ray';

    if (data.analyzed_at) {
        const d = new Date(data.analyzed_at);
        document.getElementById('printAnalyzedAt').textContent = d.toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' }) + ' ' + d.toLocaleTimeString('th-TH');
        document.getElementById('printDate').textContent = d.toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' });
    }

    // Image
    document.getElementById('printResultImage').src = `data:image/jpeg;base64,${annotatedB64}`;

    // Summary
    const summaryEl = document.getElementById('printSummaryText');
    if (data.total_detections === 0) {
        summaryEl.textContent = 'ไม่พบความผิดปกติ (No Findings) — ระบบ AI ไม่พบสัญญาณของความผิดปกติในภาพสแกนนี้';
    } else {
        const uniqueTypes = new Set(data.detections.map(d => d.name_en)).size;
        summaryEl.textContent = `พบความผิดปกติ ${data.total_detections} จุด (${uniqueTypes} ประเภท) — โปรดส่งต่อให้รังสีแพทย์เพื่อวินิจฉัยยืนยัน`;
    }

    // Findings table
    const tableEl = document.getElementById('printFindingsTable');
    const isSeg = data.analysis_type === 'segmentation';
    if (data.detections.length > 0) {
        let html = `<table class="print-findings-table">
            <thead><tr><th>#</th><th>Diagnosis</th><th>ชื่อภาษาไทย</th><th>Severity</th><th>Confidence</th>${isSeg ? '<th>พื้นที่</th>' : ''}<th>รายละเอียด</th></tr></thead><tbody>`;
        data.detections.forEach((d, i) => {
            html += `<tr>
                <td>${i + 1}</td>
                <td><strong>${d.name_en}</strong></td>
                <td>${d.name_th}</td>
                <td>${severityLabels[d.severity] || d.severity}</td>
                <td>${d.confidence_pct}</td>${isSeg ? `<td>${d.mask_area_pct || '—'}</td>` : ''}
                <td>${d.description}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        tableEl.innerHTML = html;
    } else {
        tableEl.innerHTML = '<p>ไม่พบรอยโรคหรือความผิดปกติ</p>';
    }

    // Clinical notes
    document.getElementById('printClinicalNotes').textContent = clinicalNotes.value.trim() || '— ไม่มีหมายเหตุ —';

    // Trigger print
    setTimeout(() => window.print(), 200);
}

// ─── Toast Notification ────────────────────────────────────────────────────

function showToast(message, type) {
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(34,197,94,0.95)';
    toast.style.cssText = `
        position:fixed; bottom:24px; left:50%; transform:translateX(-50%) translateY(16px);
        background:${bgColor}; color:white; padding:12px 24px;
        border-radius:8px; font-size:0.88rem; font-weight:500;
        z-index:9999; opacity:0; transition:all 0.35s cubic-bezier(0.16,1,0.3,1);
        max-width:90%; text-align:center;
        box-shadow:0 4px 20px rgba(0,0,0,0.3);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(16px)';
        setTimeout(() => toast.remove(), 350);
    }, 3500);
}
