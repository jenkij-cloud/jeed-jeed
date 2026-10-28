# Soma Scope — Clinical Decision Support System (CDSS)

แพลตฟอร์มวิเคราะห์ภาพถ่ายทางการแพทย์อัจฉริยะ (Clinical Diagnostic Platform) ด้วย Deep Learning (YOLO) และ FastAPI

---

## 🌟 ฟีเจอร์หลัก (Key Features)

- **Chest X-Ray Analysis**: ตรวจจับความผิดปกติของปอดและช่องอก 14 ชนิด (เช่น Pneumothorax, Consolidation, Cardiomegaly, Infiltration, Effusion ฯลฯ)
- **CT Scan — Lung Cancer**: ตรวจจับจุดและก้อนเนื้อผิดปกติในปอด (Lung Nodule) จากภาพถ่ายเอกซเรย์คอมพิวเตอร์
- **Brain CT Scan**: ตรวจจับรอยโรคในสมอง (Stroke Lesion, Hemorrhage, Tumor ฯลฯ) ด้วยระบบ Segmentation พร้อมคำนวณพื้นที่รอยโรค
- **Interactive Medical Viewer**: แสดงภาพแบบ Side-by-Side (ภาพต้นฉบับ vs ภาพวิเคราะห์), ซูม, ปรับความคมชัด, พร้อม Bounding Box และ Mask สรุปความผิดปกติ
- **Clinical Report & Notes**: สรุปข้อมูลสถิติ ความเสี่ยง และสามารถพิมพ์/ส่งออกรายงานผลได้

---

## 🛠 เทคโนโลยีที่ใช้ (Tech Stack)

- **Backend**: FastAPI, Uvicorn, Jinja2 Templates
- **Computer Vision & AI**: Ultralytics YOLOv8/YOLOv11, OpenCV, PyTorch, PIL, NumPy
- **Frontend**: HTML5, CSS3 (Modern Glassmorphism & Medical Dark Theme), Vanilla JavaScript
- **Version Control & Large Files**: Git, Git LFS (สำหรับไฟล์โมเดล `.pt`)

---

## 📦 โครงสร้างโปรเจกต์ (Project Structure)

```text
lung/
├── app.py                  # FastAPI Backend & Inference Pipeline
├── model_brain_ct.pt       # โมเดล Brain CT (Git LFS)
├── model_ct.pt             # โมเดล Lung CT (Git LFS)
├── model_xray.pt           # โมเดล Chest X-Ray (Git LFS)
├── static/
│   ├── css/style.css       # สไตล์ UI
│   └── js/script.js        # Logic Frontend, Drag & Drop, API Call
├── templates/
│   └── index.html          # หน้าจอหลัก
├── run_app.bat             # สคริปต์รันโปรแกรมสำหรับ Windows
├── requirements.txt        # รายการแพ็กเกจที่ต้องติดตั้ง
├── .gitignore
├── .gitattributes          # ตั้งค่า Git LFS
└── README.md
```

---

## 🚀 วิธีการติดตั้งและรันระบบ (Getting Started)

### 1. ติดตั้ง Python และ Dependencies

```bash
# ติดตั้งแพ็กเกจที่จำเป็น
pip install -r requirements.txt
```

### 2. รันแอปพลิเคชัน

#### สำหรับ Windows:
ดับเบิลคลิกที่ไฟล์ `run_app.bat` หรือเปิด PowerShell / Terminal:
```bash
python app.py
```

#### การเข้าใช้งาน:
เปิดเว็บบราวเซอร์ไปที่:
👉 **[http://localhost:8000](http://localhost:8000)** หรือ **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## 📌 ข้อจำกัดความรับผิดชอบ (Disclaimer)

ระบบนี้พัฒนาขึ้นเพื่อเป็น **เครื่องมือสนับสนุนการตัดสินใจทางคลินิก (Clinical Decision Support System - CDSS)** สำหรับการวิจัยและการแข่งขัน ผลลัพธ์ไม่สามารถทดแทนการวินิจฉัยโดยแพทย์หรือรังสีแพทย์ผู้เชี่ยวชาญได้
