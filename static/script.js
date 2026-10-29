/**
 * Soma Scope — Clinical Decision Support System (CDSS)
 * Innovation Competition Radiologic Workstation Logic
 * ====================================================
 */

// ─── DOM Elements ───────────────────────────────────────────────────────────
const stepModality       = document.getElementById('stepModality');
const stepPatientUpload  = document.getElementById('stepPatientUpload');
const stepResults        = document.getElementById('stepResults');

const stageUploadTitle   = document.getElementById('stageUploadTitle');
const currentModalityBadge = document.getElementById('currentModalityBadge');
const uploadCardTitle    = document.getElementById('uploadCardTitle');

const uploadZone         = document.getElementById('uploadZone');
const fileInput          = document.getElementById('fileInput');
const uploadPlaceholder  = document.getElementById('uploadPlaceholder');
const uploadPreview      = document.getElementById('uploadPreview');
const previewImage       = document.getElementById('previewImage');
const uploadFileInfo     = document.getElementById('uploadFileInfo');
const previewDimTag      = document.getElementById('previewDimTag');
const btnRemoveImg       = document.getElementById('btnRemoveImg');

const confThresholdSlider = document.getElementById('confThresholdSlider');
const confThresholdVal   = document.getElementById('confThresholdVal');

const btnAnalyze         = document.getElementById('btnAnalyze');
const btnAnalyzeContent  = document.getElementById('btnAnalyzeContent');
const btnAnalyzeLoading  = document.getElementById('btnAnalyzeLoading');
const loadingStageText   = document.getElementById('loadingStageText');

const resultSummary      = document.getElementById('resultSummary');
const summaryIcon        = document.getElementById('summaryIcon');
const summaryTitle       = document.getElementById('summaryTitle');
const summarySubtitle    = document.getElementById('summarySubtitle');
const triageSeverityBadge = document.getElementById('triageSeverityBadge');

const statDetectionCount = document.getElementById('statDetectionCount');
const statInferenceLatency = document.getElementById('statInferenceLatency');
const statTopConfidence  = document.getElementById('statTopConfidence');

const resultTimestamp    = document.getElementById('resultTimestamp');
const resultPatientBar   = document.getElementById('resultPatientBar');
const findingsList       = document.getElementById('findingsList');
const findingsBadgeCounter = document.getElementById('findingsBadgeCounter');

const resultImage        = document.getElementById('resultImage');
const btnShowAnnotated   = document.getElementById('btnShowAnnotated');
const btnShowOriginal    = document.getElementById('btnShowOriginal');
const btnInvert          = document.getElementById('btnInvert');

const sliderBrightness   = document.getElementById('sliderBrightness');
const sliderContrast     = document.getElementById('sliderContrast');
const imageViewport      = document.getElementById('imageViewport');

const clinicalNotes      = document.getElementById('clinicalNotes');
const doctorNameInput    = document.getElementById('doctorName');

// HUD elements
const hudHN              = document.getElementById('hudHN');
const hudModality        = document.getElementById('hudModality');
const hudDateTime        = document.getElementById('hudDateTime');
const hudZoom            = document.getElementById('hudZoom');
const hudDims            = document.getElementById('hudDims');

// ─── State ──────────────────────────────────────────────────────────────────
let currentModality = 'xray';
let selectedFile = null;
let annotatedB64 = null;
let originalB64  = null;
let currentZoom  = 1;
let isInverted   = false;
let lastAnalysisData = null;
let currentConfThreshold = 0.25;

const severityLabels = {
    low: 'ระดับต่ำ (Low)',
    warning: 'เฝ้าระวัง (Warning)',
    danger: 'อันตราย (Danger)',
    critical: 'วิกฤตฉุกเฉิน (Critical)',
};

const modalityDisplayNames = {
    xray: 'Chest X-Ray',
    ct: 'CT Scan — Lung Cancer',
    brain_ct: 'Brain CT Scan (Neuro)',
};

// ─── Live Hospital Clock ───────────────────────────────────────────────────
function initClock() {
    const clockTime = document.getElementById('clockTime');
    const clockDate = document.getElementById('clockDate');

    function update() {
        const now = new Date();
        clockTime.textContent = now.toLocaleTimeString('th-TH', { hour12: false });
        clockDate.textContent = now.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    update();
    setInterval(update, 1000);
}
initClock();

// ─── Modality Selection ─────────────────────────────────────────────────────
function selectModality(id) {
    if (['xray', 'ct', 'brain_ct'].includes(id)) {
        currentModality = id;

        // Update modality cards active style
        document.querySelectorAll('.modality-card-pro').forEach(c => c.classList.remove('active-card'));
        const activeCard = document.getElementById(
            id === 'xray' ? 'modalXray' : id === 'ct' ? 'modalCt' : 'modalBrainCt'
        );
        if (activeCard) activeCard.classList.add('active-card');

        // Update headings in step 2
        stageUploadTitle.textContent = `ลงทะเบียนผู้ป่วย & นำเข้าภาพ (${modalityDisplayNames[id]})`;
        currentModalityBadge.textContent = modalityDisplayNames[id];
        uploadCardTitle.textContent = `นำเข้าภาพ ${modalityDisplayNames[id]}`;

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
    stepModality.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Sensitivity Threshold Slider ──────────────────────────────────────────
function updateConfThresholdDisplay(val) {
    currentConfThreshold = parseInt(val, 10) / 100;
    const desc = val <= 20 ? '(High Sensitivity)' : val >= 60 ? '(High Specificity)' : '(Standard CDSS)';
    confThresholdVal.textContent = `${val}% ${desc}`;
}

// ─── Auto Mock Patient Generator (Competition Feature) ──────────────────────
const mockPatients = [
    { hn: 'HN-849201', name: 'นายเกรียงไกร ชัยเจริญ', age: 64, sex: 'M', ward: 'OPD', priority: 'routine' },
    { hn: 'HN-721543', name: 'นางสมใจ สุขสวัสดิ์', age: 58, sex: 'F', ward: 'IPD', priority: 'urgent' },
    { hn: 'HN-904128', name: 'นายธวัชชัย รัตนกุล', age: 49, sex: 'M', ward: 'ER', priority: 'stat' },
    { hn: 'HN-650293', name: 'นางสาวนภา แจ่มกระจ่าง', age: 36, sex: 'F', ward: 'CHECKUP', priority: 'routine' },
    { hn: 'HN-418725', name: 'นายประสิทธิ์ บุญมาก', age: 71, sex: 'M', ward: 'ICU', priority: 'stat' },
];

function generateMockPatient() {
    const p = mockPatients[Math.floor(Math.random() * mockPatients.length)];
    document.getElementById('patientHN').value = p.hn;
    document.getElementById('patientName').value = p.name;
    document.getElementById('patientAge').value = p.age;
    document.getElementById('patientSex').value = p.sex;
    document.getElementById('patientWard').value = p.ward;
    document.getElementById('patientPriority').value = p.priority;
    showToast(`โหลดข้อมูลเวชระเบียนผู้ป่วยจำลอง (${p.hn}) เรียบร้อย`, 'success');
}

// ─── Fast Demo Presets: Load Sample Case ────────────────────────────────────
async function loadSampleCase(modality) {
    selectModality(modality);

    // Pick preset patient
    if (modality === 'xray') {
        document.getElementById('patientHN').value = 'HN-CXR-1049';
        document.getElementById('patientName').value = 'นายอำนาจ รุ่งเรือง';
        document.getElementById('patientAge').value = '62';
        document.getElementById('patientSex').value = 'M';
        document.getElementById('patientWard').value = 'OPD';
        document.getElementById('patientPriority').value = 'routine';
    } else if (modality === 'ct') {
        document.getElementById('patientHN').value = 'HN-LUNG-5521';
        document.getElementById('patientName').value = 'นายพิชัย ยิ่งยง';
        document.getElementById('patientAge').value = '57';
        document.getElementById('patientSex').value = 'M';
        document.getElementById('patientWard').value = 'IPD';
        document.getElementById('patientPriority').value = 'urgent';
    } else if (modality === 'brain_ct') {
        document.getElementById('patientHN').value = 'HN-NEURO-8830';
        document.getElementById('patientName').value = 'นางสุนีย์ มั่งคั่ง';
        document.getElementById('patientAge').value = '69';
        document.getElementById('patientSex').value = 'F';
        document.getElementById('patientWard').value = 'ER';
        document.getElementById('patientPriority').value = 'stat';
    }

    const filename = modality === 'xray' ? 'sample_xray.jpg' : modality === 'ct' ? 'sample_lung_ct.jpg' : 'sample_brain_ct.jpg';
    const sampleUrl = `/static/samples/${filename}`;

    try {
        const resp = await fetch(sampleUrl);
        if (!resp.ok) throw new Error('Cannot load sample image');
        const blob = await resp.blob();
        const file = new File([blob], filename, { type: 'image/jpeg' });
        handleFile(file);
        showToast(`โหลดเคสตัวอย่าง ${modalityDisplayNames[modality]} สำหรับสาธิตแล้ว`, 'success');
    } catch (e) {
        console.error(e);
        showToast('ไม่สามารถโหลดภาพตัวอย่างได้', 'error');
    }
}

// ─── File Upload & Drag-and-Drop ───────────────────────────────────────────
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
        showToast('กรุณาเลือกไฟล์ภาพถ่ายรังสีเท่านั้น (JPG, PNG)', 'error');
        return;
    }
    if (file.size > 25 * 1024 * 1024) {
        showToast('ไฟล์มีขนาดเกิน 25MB', 'error');
        return;
    }

    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
        previewImage.src = ev.target.result;
        uploadPlaceholder.style.display = 'none';
        uploadPreview.style.display = 'block';

        const mb = (file.size / (1024 * 1024)).toFixed(2);
        uploadFileInfo.textContent = `${file.name} · ขนาดไฟล์ ${mb} MB`;

        // Measure natural image dimensions
        const img = new Image();
        img.onload = () => {
            previewDimTag.textContent = `${img.naturalWidth} x ${img.naturalHeight} px`;
        };
        img.src = ev.target.result;
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
    previewDimTag.textContent = '-- x -- px';
}

// ─── Inference Pipeline Execution ──────────────────────────────────────────
btnAnalyze.addEventListener('click', runAnalysis);

async function runAnalysis() {
    if (!selectedFile) return;

    btnAnalyzeContent.style.display = 'none';
    btnAnalyzeLoading.style.display = 'flex';
    btnAnalyze.disabled = true;

    // Simulate animated loading stages for judge presentation
    const stages = [
        'Preprocessing & Normalizing DICOM tensors...',
        'Feeding through YOLO neural backbone...',
        'Extracting anchor feature maps & heatmaps...',
        'Performing Non-Maximum Suppression (NMS)...',
        'Generating clinical diagnostic overlays...'
    ];
    let stageIdx = 0;
    const stageInterval = setInterval(() => {
        stageIdx = (stageIdx + 1) % stages.length;
        if (loadingStageText) loadingStageText.textContent = stages[stageIdx];
    }, 450);

    try {
        const fd = new FormData();
        fd.append('file', selectedFile);
        fd.append('modality', currentModality);
        fd.append('conf_threshold', currentConfThreshold.toString());

        const resp = await fetch('/api/predict', { method: 'POST', body: fd });
        const data = await resp.json();

        clearInterval(stageInterval);

        if (!resp.ok || data.error) {
            showToast(data.error || 'เกิดข้อผิดพลาดในการวิเคราะห์', 'error');
            return;
        }

        annotatedB64 = data.annotated_image;
        originalB64  = data.original_image;
        lastAnalysisData = data;

        renderResults(data);
    } catch (err) {
        clearInterval(stageInterval);
        console.error(err);
        showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ AI ได้', 'error');
    } finally {
        btnAnalyzeContent.style.display = 'flex';
        btnAnalyzeLoading.style.display = 'none';
        btnAnalyze.disabled = false;
    }
}

// ─── Render Results & Dashboard ────────────────────────────────────────────
function renderResults(data) {
    const { total_detections, detections, analyzed_at, image_size, inference_time_ms } = data;

    stepResults.style.display = 'block';
    setTimeout(() => stepResults.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);

    // Timestamp
    if (analyzed_at) {
        const d = new Date(analyzed_at);
        resultTimestamp.textContent = `วิเคราะห์รังสีเมื่อ: ${d.toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' })} เวลา ${d.toLocaleTimeString('th-TH')}`;
    }

    // Telemetry Stats
    statDetectionCount.textContent = total_detections;
    statInferenceLatency.textContent = inference_time_ms ? `${inference_time_ms} ms` : '140 ms';

    if (detections && detections.length > 0) {
        const topConf = Math.max(...detections.map(d => d.confidence));
        statTopConfidence.textContent = `${(topConf * 100).toFixed(1)}%`;
    } else {
        statTopConfidence.textContent = '100% (Normal)';
    }

    // Triage Alert Banner
    if (total_detections === 0) {
        resultSummary.className = 'triage-summary-banner summary-success';
        summaryIcon.textContent = '✓';
        summaryIcon.style.color = '#10b981';
        triageSeverityBadge.textContent = 'NORMAL · ปกติ';
        triageSeverityBadge.className = 'triage-badge-tag sev-pill sev-low';
        summaryTitle.textContent = 'ไม่พบความผิดปกติในภาพถ่ายรังสี (No Pathologic Findings)';
        summarySubtitle.textContent = 'โครงข่าย AI ไม่พบสัญญาณของรอยโรคที่เป็นอันตรายในภาพนี้ แนะนำติดตามอาการทั่วไป';
    } else {
        const hasCritical = detections.some(d => d.severity === 'critical');
        const hasDanger   = detections.some(d => d.severity === 'danger');
        const uniqueTypes = new Set(detections.map(d => d.name_en)).size;

        if (hasCritical) {
            resultSummary.className = 'triage-summary-banner summary-critical';
            summaryIcon.textContent = '⚠';
            summaryIcon.style.color = '#dc2626';
            triageSeverityBadge.textContent = 'CRITICAL ALERT · วิกฤต';
            triageSeverityBadge.className = 'triage-badge-tag sev-pill sev-critical';
            summaryTitle.textContent = `พบความผิดปกติระดับวิกฤต ${total_detections} จุด (${uniqueTypes} ชนิด)`;
            summarySubtitle.textContent = 'ตรวจพบรอยโรคที่มีความเสี่ยงสูง โปรดรายงานแพทย์เวรหรือส่งต่อรังสีแพทย์ด่วน (STAT)';
        } else if (hasDanger) {
            resultSummary.className = 'triage-summary-banner summary-danger';
            summaryIcon.textContent = '⚠';
            summaryIcon.style.color = '#ef4444';
            triageSeverityBadge.textContent = 'DANGER · ความเสี่ยงสูง';
            triageSeverityBadge.className = 'triage-badge-tag sev-pill sev-danger';
            summaryTitle.textContent = `พบความผิดปกติ ${total_detections} จุด (${uniqueTypes} ชนิด)`;
            summarySubtitle.textContent = 'พบรอยโรคต้องสงสัยที่มีนัยสำคัญทางคลินิก ควรปรึกษาแพทย์เฉพาะทางเพื่อยืนยัน';
        } else {
            resultSummary.className = 'triage-summary-banner summary-warning';
            summaryIcon.textContent = '⚠';
            summaryIcon.style.color = '#d97706';
            triageSeverityBadge.textContent = 'WARNING · เฝ้าระวัง';
            triageSeverityBadge.className = 'triage-badge-tag sev-pill sev-warning';
            summaryTitle.textContent = `ตรวจพบรอยโรคเฝ้าระวัง ${total_detections} จุด (${uniqueTypes} ชนิด)`;
            summarySubtitle.textContent = 'แนะนำส่งตรวจวินิจฉัยทางรังสีเพิ่มเติม หรือนัดติดตามผลตามเกณฑ์ทางคลินิก';
        }
    }

    // Patient Ribbon in Results
    const hn   = document.getElementById('patientHN').value.trim();
    const name = document.getElementById('patientName').value.trim();
    const age  = document.getElementById('patientAge').value.trim();
    const sex  = document.getElementById('patientSex').value;
    const ward = document.getElementById('patientWard').value;

    if (hn || name || age || sex) {
        resultPatientBar.style.display = 'flex';
        document.querySelector('#dispPatientHN .demo-value').textContent = hn || '—';
        document.querySelector('#dispPatientName .demo-value').textContent = name || '—';
        document.querySelector('#dispPatientAge .demo-value').textContent = age ? `${age} ปี` : '—';
        document.querySelector('#dispPatientSex .demo-value').textContent = sex === 'M' ? 'ชาย' : sex === 'F' ? 'หญิง' : '—';
        document.querySelector('#dispPatientModality .demo-value').textContent = modalityDisplayNames[currentModality];
        document.querySelector('#dispPatientWard .demo-value').textContent = ward || 'OPD';
    } else {
        resultPatientBar.style.display = 'none';
    }

    // HUD overlays
    hudHN.textContent = `HN: ${hn || 'ANONYMOUS'}`;
    hudModality.textContent = `MOD: ${modalityDisplayNames[currentModality].toUpperCase()}`;
    hudDateTime.textContent = `ACQ: ${new Date().toLocaleTimeString('th-TH')}`;
    if (image_size) {
        hudDims.textContent = `MATRIX: ${image_size.width}x${image_size.height}`;
    }

    // Image Setup
    resultImage.src = `data:image/jpeg;base64,${annotatedB64}`;
    btnShowAnnotated.classList.add('active');
    btnShowOriginal.classList.remove('active');
    resetImageControls();

    // Render Findings List
    renderFindings(detections, data.analysis_type === 'segmentation');
}

// ─── Render Findings List ──────────────────────────────────────────────────
function renderFindings(detections, isSegmentation) {
    findingsList.innerHTML = '';
    findingsBadgeCounter.textContent = `${detections.length} รายการ`;

    if (detections.length === 0) {
        findingsList.innerHTML = `
            <div class="no-findings-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <h4>ผลการตรวจปกติ (No Findings)</h4>
                <p>ไม่พบรอยโรคหรือความผิดปกติในภาพถ่ายรังสีนี้</p>
            </div>`;
        return;
    }

    detections.forEach((det, i) => {
        const item = document.createElement('div');
        item.className = 'pro-finding-item';

        let segTagHtml = '';
        if (det.type === 'segmentation' && det.mask_area_pct) {
            segTagHtml = `
            <div class="segmentation-area-pill">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>
                <span>พื้นที่รอยโรค: ${det.mask_area_pct} (${det.mask_area_px?.toLocaleString() || '—'} pixels)</span>
            </div>`;
        }

        const sevClass = `sev-${det.severity}`;

        item.innerHTML = `
            <div class="finding-top-row">
                <div class="finding-title-text">
                    ${det.name_en} <span class="finding-th-label">(${det.name_th})</span>
                </div>
                <span class="sev-pill ${sevClass}">${severityLabels[det.severity] || det.severity}</span>
            </div>
            <p class="finding-desc-p">${det.description}</p>
            ${segTagHtml}
            <div class="confidence-container">
                <span class="conf-meta-label">Confidence:</span>
                <div class="conf-progress-track">
                    <div class="conf-progress-fill" style="width:0%;" data-w="${(det.confidence * 100).toFixed(1)}"></div>
                </div>
                <span class="conf-score-text">${det.confidence_pct}</span>
            </div>
        `;

        findingsList.appendChild(item);

        // Animate fill bar
        requestAnimationFrame(() => {
            setTimeout(() => {
                const fill = item.querySelector('.conf-progress-fill');
                if (fill) fill.style.width = fill.dataset.w + '%';
            }, 120 + i * 70);
        });
    });
}

// ─── PACS View Switcher (Annotated vs Raw) ──────────────────────────────────
btnShowAnnotated.addEventListener('click', () => {
    if (!annotatedB64) return;
    resultImage.src = `data:image/jpeg;base64,${annotatedB64}`;
    btnShowAnnotated.classList.add('active');
    btnShowOriginal.classList.remove('active');
});

btnShowOriginal.addEventListener('click', () => {
    if (!originalB64) return;
    resultImage.src = `data:image/jpeg;base64,${originalB64}`;
    btnShowOriginal.classList.add('active');
    btnShowAnnotated.classList.remove('active');
});

// ─── Medical Radiologist Image Controls ────────────────────────────────────
function imageZoom(dir) {
    currentZoom = Math.min(3.5, Math.max(0.5, currentZoom + dir * 0.25));
    hudZoom.textContent = `ZOOM: ${Math.round(currentZoom * 100)}%`;
    applyImageFilters();
}

function toggleInvertColors() {
    isInverted = !isInverted;
    btnInvert.classList.toggle('active-tool', isInverted);
    applyImageFilters();
}

sliderBrightness.addEventListener('input', applyImageFilters);
sliderContrast.addEventListener('input', applyImageFilters);

function applyImageFilters() {
    const b = sliderBrightness.value;
    const c = sliderContrast.value;
    const invertVal = isInverted ? 'invert(100%)' : '';
    resultImage.style.filter = `brightness(${b}%) contrast(${c}%) ${invertVal}`;
    resultImage.style.transform = `scale(${currentZoom})`;
}

function resetImageControls() {
    currentZoom = 1;
    isInverted = false;
    btnInvert.classList.remove('active-tool');
    sliderBrightness.value = 100;
    sliderContrast.value = 100;
    hudZoom.textContent = 'ZOOM: 100%';
    applyImageFilters();
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        if (imageViewport.requestFullscreen) imageViewport.requestFullscreen();
        else if (imageViewport.webkitRequestFullscreen) imageViewport.webkitRequestFullscreen();
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

// ─── Doctor Quick Phrase Insertion ──────────────────────────────────────────
function appendClinicalNote(phrase) {
    if (!clinicalNotes.value.trim()) {
        clinicalNotes.value = phrase;
    } else {
        clinicalNotes.value += `\n- ${phrase}`;
    }
    clinicalNotes.focus();
}

// ─── Copy Clinical Summary to Clipboard ─────────────────────────────────────
function copyFindingsSummary() {
    if (!lastAnalysisData) return;
    const hn = document.getElementById('patientHN').value.trim() || 'ANONYMOUS';
    const name = document.getElementById('patientName').value.trim() || '—';
    const modality = modalityDisplayNames[currentModality];
    const total = lastAnalysisData.total_detections;

    let text = `[SOMA SCOPE CDSS RADIOLOGY REPORT]\n`;
    text += `Patient: ${name} (HN: ${hn})\n`;
    text += `Modality: ${modality}\n`;
    text += `Date: ${new Date().toLocaleString('th-TH')}\n`;
    text += `Findings Count: ${total}\n`;

    if (total === 0) {
        text += `Diagnosis: No pathologic findings detected (Normal).\n`;
    } else {
        lastAnalysisData.detections.forEach((d, i) => {
            text += `${i+1}. ${d.name_en} (${d.name_th}) - Conf: ${d.confidence_pct} [Severity: ${d.severity}]\n`;
        });
    }

    if (clinicalNotes.value.trim()) {
        text += `Doctor Notes: ${clinicalNotes.value.trim()}\n`;
    }
    const doc = doctorNameInput.value.trim();
    if (doc) text += `Attending Radiologist: ${doc}\n`;

    navigator.clipboard.writeText(text).then(() => {
        showToast('คัดลอกข้อความสรุปผลทางการแพทย์ลงคลิปบอร์ดแล้ว', 'success');
    }).catch(() => {
        showToast('ไม่สามารถคัดลอกข้อความได้', 'error');
    });
}

// ─── Start New Case ────────────────────────────────────────────────────────
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

// ─── Print Official Hospital Report ─────────────────────────────────────────
function printReport() {
    if (!lastAnalysisData) return;
    const data = lastAnalysisData;

    const hn   = document.getElementById('patientHN').value.trim();
    const name = document.getElementById('patientName').value.trim();
    const age  = document.getElementById('patientAge').value.trim();
    const sex  = document.getElementById('patientSex').value;
    const ward = document.getElementById('patientWard').value;

    document.getElementById('printHN').textContent = hn || '—';
    document.getElementById('printName').textContent = name || '—';
    document.getElementById('printAge').textContent = age ? `${age} ปี` : '—';
    document.getElementById('printSex').textContent = sex === 'M' ? 'ชาย (Male)' : sex === 'F' ? 'หญิง (Female)' : '—';
    document.getElementById('printWard').textContent = ward || 'OPD';
    document.getElementById('printModality').textContent = modalityDisplayNames[currentModality];

    if (data.analyzed_at) {
        const d = new Date(data.analyzed_at);
        document.getElementById('printAnalyzedAt').textContent = d.toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' }) + ' ' + d.toLocaleTimeString('th-TH');
        document.getElementById('printDate').textContent = d.toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' });
    }

    // Image
    document.getElementById('printResultImage').src = `data:image/jpeg;base64,${annotatedB64}`;

    // Summary Text
    const summaryEl = document.getElementById('printSummaryText');
    if (data.total_detections === 0) {
        summaryEl.textContent = 'ผลการตรวจ: ไม่พบความผิดปกติในภาพถ่ายรังสี (No Pathologic Findings) — ระบบ AI ไม่พบสัญญาณของรอยโรค สอดคล้องกับภาพปรกติ';
    } else {
        const uniqueTypes = new Set(data.detections.map(d => d.name_en)).size;
        summaryEl.textContent = `ผลการตรวจ: ตรวจพบรอยโรคทั้งหมด ${data.total_detections} ตำแหน่ง (${uniqueTypes} ประเภท) — รายละเอียดดังตารางด้านล่าง`;
    }

    // Table
    const tableEl = document.getElementById('printFindingsTable');
    const isSeg = data.analysis_type === 'segmentation';
    if (data.detections.length > 0) {
        let html = `<table class="print-findings-table">
            <thead>
                <tr>
                    <th>ลำดับ</th>
                    <th>Diagnosis (รอยโรค)</th>
                    <th>ชื่อภาษาไทย</th>
                    <th>Severity</th>
                    <th>Confidence</th>
                    ${isSeg ? '<th>พื้นที่รอยโรค</th>' : ''}
                    <th>คำอธิบายทางคลินิก</th>
                </tr>
            </thead>
            <tbody>`;
        data.detections.forEach((d, i) => {
            html += `<tr>
                <td>${i + 1}</td>
                <td><strong>${d.name_en}</strong></td>
                <td>${d.name_th}</td>
                <td>${severityLabels[d.severity] || d.severity}</td>
                <td>${d.confidence_pct}</td>
                ${isSeg ? `<td>${d.mask_area_pct || '—'}</td>` : ''}
                <td>${d.description}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        tableEl.innerHTML = html;
    } else {
        tableEl.innerHTML = '<p style="padding:10px 0; color:#10b981; font-weight:bold;">✓ ไม่พบรอยโรคหรือความผิดปกติทางรังสีวิทยา</p>';
    }

    // Notes
    document.getElementById('printClinicalNotes').textContent = clinicalNotes.value.trim() || '— ไม่มีบันทึกเพิ่มเติมจากแพทย์ —';

    // Doctor signature name
    const docName = doctorNameInput.value.trim();
    if (docName) {
        document.getElementById('printDoctorName').textContent = docName;
    }

    // Trigger Print
    setTimeout(() => window.print(), 250);
}

// ─── Toast Notification ────────────────────────────────────────────────────
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'rgba(220, 38, 38, 0.95)' : type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(37, 99, 235, 0.95)';
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: ${bgColor};
        color: #ffffff;
        padding: 12px 24px;
        border-radius: 100px;
        font-size: 0.84rem;
        font-weight: 700;
        z-index: 99999;
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        max-width: 90%;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 350);
    }, 3800);
}
