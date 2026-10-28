"""
Lung X-Ray Abnormality Detection - FastAPI Backend
===================================================
Serves a web UI and provides an API endpoint for YOLOv8 inference
on chest X-ray images to detect 14 types of lung abnormalities.
"""

import io
import base64
from pathlib import Path
from datetime import datetime

import cv2
import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Request, Form
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from ultralytics import YOLO

# ─── Configuration ────────────────────────────────────────────────────────────

MODEL_PATH = Path(__file__).parent / "model_xray.pt"
CT_MODEL_PATH = Path(__file__).parent / "model_ct.pt"
BRAIN_CT_MODEL_PATH = Path(__file__).parent / "model_brain_ct.pt"

# Mapping: model label string → disease info
# The model's internal names are strings '0'-'13'
DISEASE_MAP = {
    "0": {
        "name_en": "Atelectasis",
        "name_th": "ปอดแฟบ",
        "description": "ภาวะที่เนื้อปอดบางส่วนยุบตัวและไม่ขยายรับอากาศตามปกติ",
        "severity": "warning",
        "color": (0, 165, 255),   # Orange
    },
    "1": {
        "name_en": "Cardiomegaly",
        "name_th": "ภาวะหัวใจโต",
        "description": "ขนาดเงาหัวใจบนภาพ X-Ray โตเกินเกณฑ์มาตรฐาน",
        "severity": "danger",
        "color": (0, 0, 239),     # Red
    },
    "2": {
        "name_en": "Consolidation",
        "name_th": "เนื้อปอดแข็งแน่น",
        "description": "ช่องถุงลมปอดถูกแทนที่ด้วยของเหลว หนอง หรือเลือด",
        "severity": "danger",
        "color": (0, 69, 255),    # Red-Orange
    },
    "3": {
        "name_en": "Edema",
        "name_th": "ภาวะปอดบวมน้ำ",
        "description": "มีน้ำสะสมในถุงลมปอดหรือเนื้อเยื่อปอด",
        "severity": "danger",
        "color": (71, 99, 255),   # Coral
    },
    "4": {
        "name_en": "Effusion",
        "name_th": "น้ำในช่องเยื่อหุ้มปอด",
        "description": "มีของเหลวขังสะสมอยู่ในช่องเยื่อหุ้มปอด",
        "severity": "warning",
        "color": (0, 215, 255),   # Gold
    },
    "5": {
        "name_en": "Emphysema",
        "name_th": "โรคถุงลมโป่งพอง",
        "description": "ผนังถุงลมปอดถูกทำลาย ทำให้ปอดขยายตัวและมีอากาศค้างมากเกินไป",
        "severity": "warning",
        "color": (180, 130, 70),  # Steel Blue
    },
    "6": {
        "name_en": "Fibrosis",
        "name_th": "พังผืดในเนื้อปอด",
        "description": "เกิดรอยแผลเป็นหรือพังผืดเหนี่ยวรั้งในปอด",
        "severity": "warning",
        "color": (208, 224, 64),  # Turquoise
    },
    "7": {
        "name_en": "Hernia",
        "name_th": "ไส้เลื่อนกะบังลม",
        "description": "อวัยวะในช่องท้องดันผ่านกะบังลมขึ้นมาอยู่ในช่องอก",
        "severity": "danger",
        "color": (205, 0, 205),   # Magenta
    },
    "8": {
        "name_en": "Infiltration",
        "name_th": "เงาฝ้าซึมซาบในปอด",
        "description": "มีสารผิดปกติ เช่น เลือด หนอง หรือเซลล์อักเสบ ซึมอยู่ในเนื้อปอด",
        "severity": "warning",
        "color": (0, 252, 124),   # Spring Green
    },
    "9": {
        "name_en": "Mass",
        "name_th": "ก้อนเนื้อขนาดใหญ่",
        "description": "ก้อนเนื้อที่มีเส้นผ่านศูนย์กลาง ใหญ่กว่า 3 ซม.",
        "severity": "critical",
        "color": (0, 0, 200),     # Dark Red
    },
    "10": {
        "name_en": "Nodule",
        "name_th": "จุด/ก้อนเนื้อขนาดเล็ก",
        "description": "จุดหรือก้อนเนื้อที่มีเส้นผ่านศูนย์กลาง เล็กกว่า 3 ซม.",
        "severity": "warning",
        "color": (255, 191, 0),   # Deep Sky Blue
    },
    "11": {
        "name_en": "Pleural Thickening",
        "name_th": "เยื่อหุ้มปอดหนาตัว",
        "description": "รอยหนาตัวของเยื่อหุ้มปอดที่เกิดจากการอักเสบหรือรอยแผลเก่า",
        "severity": "low",
        "color": (147, 20, 255),  # Deep Pink
    },
    "12": {
        "name_en": "Pneumonia",
        "name_th": "ปอดอักเสบ/ปอดบวม",
        "description": "การติดเชื้อบริเวณเนื้อปอด",
        "severity": "danger",
        "color": (0, 140, 255),   # Dark Orange
    },
    "13": {
        "name_en": "Pneumothorax",
        "name_th": "ลมในช่องเยื่อหุ้มปอด",
        "description": "มีอากาศรั่วเข้าไปสะสมอยู่ในช่องระหว่างปอดกับผนังอก",
        "severity": "critical",
        "color": (60, 20, 220),   # Crimson
    },
}

CT_DISEASE_MAP = {
    "nodule": {
        "name_en": "Lung Nodule",
        "name_th": "ก้อนเนื้อขนาดเล็กในปอด",
        "description": "พบจุดหรือก้อนเนื้อขนาดเล็กในปอด ควรติดตามผลหรือตรวจเพิ่มเติมเพื่อประเมินความเสี่ยง",
        "severity": "warning",
        "color": (0, 165, 255),  # Orange
    }
}

BRAIN_CT_DISEASE_MAP = {
    "0": {
        "name_en": "Brain Tumor",
        "name_th": "เนื้องอกสมอง",
        "description": "พบก้อนเนื้อผิดปกติในสมอง อาจเป็นเนื้องอกชนิดไม่ร้ายแรงหรือมะเร็ง ควรตรวจเพิ่มเติม",
        "severity": "critical",
        "color": (0, 0, 200),     # Dark Red
    },
    "1": {
        "name_en": "Intracranial Hemorrhage",
        "name_th": "เลือดออกในสมอง",
        "description": "พบภาวะเลือดออกภายในกะโหลกศีรษะ อาจเกิดจากอุบัติเหตุ ความดันโลหิตสูง หรือหลอดเลือดผิดปกติ",
        "severity": "critical",
        "color": (60, 20, 220),   # Crimson
    },
    "2": {
        "name_en": "Ischemic Stroke",
        "name_th": "สมองขาดเลือด",
        "description": "พบบริเวณสมองที่ขาดเลือดไปเลี้ยง อาจเกิดจากลิ่มเลือดอุดตัน ต้องรักษาอย่างเร่งด่วน",
        "severity": "critical",
        "color": (0, 69, 255),    # Red-Orange
    },
    "3": {
        "name_en": "Hydrocephalus",
        "name_th": "ภาวะน้ำคั่งในสมอง",
        "description": "มีน้ำหล่อสมองสะสมมากผิดปกติ ทำให้โพรงสมองขยายตัว เพิ่มแรงดันในกะโหลกศีรษะ",
        "severity": "danger",
        "color": (71, 99, 255),   # Coral
    },
    "4": {
        "name_en": "Calcification",
        "name_th": "หินปูนเกาะในสมอง",
        "description": "พบจุดหินปูนสะสมในเนื้อสมอง อาจเป็นภาวะปกติตามอายุหรือสัญญาณของพยาธิสภาพ",
        "severity": "low",
        "color": (208, 224, 64),  # Turquoise
    },
    "5": {
        "name_en": "Midline Shift",
        "name_th": "สมองเบี้ยว/เลื่อน",
        "description": "โครงสร้างกลางสมองเลื่อนออกจากแนวปกติ อาจเกิดจากก้อนเนื้อ เลือดออก หรือบวมน้ำ ถือเป็นภาวะฉุกเฉิน",
        "severity": "critical",
        "color": (205, 0, 205),   # Magenta
    },
    "6": {
        "name_en": "Brain Edema",
        "name_th": "สมองบวม",
        "description": "มีของเหลวสะสมในเนื้อสมองมากผิดปกติ ทำให้สมองบวมและเพิ่มแรงดันในกะโหลก",
        "severity": "danger",
        "color": (0, 215, 255),   # Gold
    },
    "7": {
        "name_en": "Skull Fracture",
        "name_th": "กะโหลกศีรษะแตก",
        "description": "พบรอยแตกหรือหักของกระดูกกะโหลกศีรษะ อาจเกิดจากอุบัติเหตุหรือการกระแทก",
        "severity": "danger",
        "color": (0, 140, 255),   # Dark Orange
    },
}

# ─── App Setup ────────────────────────────────────────────────────────────────

app = FastAPI(title="LungScan AI", description="Lung X-Ray Abnormality Detection")

# Mount static files
static_dir = Path(__file__).parent / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Templates
templates_dir = Path(__file__).parent / "templates"
templates_dir.mkdir(exist_ok=True)
templates = Jinja2Templates(directory=str(templates_dir))

# Load model at startup
print("🔄 Loading YOLO models...")
model = YOLO(str(MODEL_PATH))
try:
    ct_model = YOLO(str(CT_MODEL_PATH))
    print(f"✅ CT Model loaded successfully! Classes: {ct_model.names}")
except Exception as e:
    ct_model = None
    print(f"⚠️ Failed to load CT model: {e}")
try:
    brain_ct_model = YOLO(str(BRAIN_CT_MODEL_PATH))
    print(f"✅ Brain CT Model loaded successfully! Classes: {brain_ct_model.names}")
except Exception as e:
    brain_ct_model = None
    print(f"⚠️ Failed to load Brain CT model: {e}")
print(f"✅ X-Ray Model loaded successfully! Classes: {model.names}")


# ─── Helper Functions ─────────────────────────────────────────────────────────

def get_disease_info(label_name: str, disease_map: dict) -> dict:
    """Get disease information from model label name string."""
    return disease_map.get(label_name, {
        "name_en": f"Unknown ({label_name})",
        "name_th": f"ไม่ทราบ ({label_name})",
        "description": "ไม่มีข้อมูล",
        "severity": "low",
        "color": (128, 128, 128),
    })

def draw_detections(image: np.ndarray, results: list, current_model, disease_map: dict) -> np.ndarray:
    """Draw bounding boxes and labels on the image."""
    annotated = image.copy()
    h, w = annotated.shape[:2]

    # Scale font and thickness based on image size
    scale = max(w, h) / 1000
    font_scale = max(0.5, 0.6 * scale)
    thickness = max(1, int(2 * scale))
    box_thickness = max(2, int(3 * scale))

    for result in results:
        boxes = result.boxes
        if boxes is None:
            continue

        for box in boxes:
            # Get box coordinates
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
            conf = float(box.conf[0].cpu().numpy())
            cls_idx = int(box.cls[0].cpu().numpy())

            # Get the label name from model
            label_name = current_model.names[cls_idx]
            disease = get_disease_info(label_name, disease_map)
            color = disease["color"]

            # Draw filled rectangle behind text
            label_text = f"{disease['name_en']} {conf:.0%}"
            (tw, th_text), baseline = cv2.getTextSize(
                label_text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness
            )

            # Draw bounding box
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, box_thickness)

            # Draw label background
            label_y1 = max(y1 - th_text - baseline - 10, 0)
            cv2.rectangle(
                annotated,
                (x1, label_y1),
                (x1 + tw + 10, y1),
                color,
                -1,
            )

            # Draw label text
            cv2.putText(
                annotated,
                label_text,
                (x1 + 5, y1 - baseline - 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                font_scale,
                (255, 255, 255),
                thickness,
                cv2.LINE_AA,
            )

    return annotated


def draw_segmentation(image: np.ndarray, results: list, current_model, disease_map: dict, alpha: float = 0.45) -> np.ndarray:
    """Draw segmentation masks with contours and labels on the image."""
    annotated = image.copy()
    overlay = image.copy()
    h, w = annotated.shape[:2]

    # Scale font and thickness based on image size
    scale = max(w, h) / 1000
    font_scale = max(0.5, 0.6 * scale)
    thickness = max(1, int(2 * scale))
    contour_thickness = max(2, int(3 * scale))

    for result in results:
        boxes = result.boxes
        masks = result.masks
        if boxes is None or masks is None:
            continue

        # Get mask data resized to original image size
        mask_data = masks.data.cpu().numpy()  # (N, mask_h, mask_w)

        for i, box in enumerate(boxes):
            conf = float(box.conf[0].cpu().numpy())
            cls_idx = int(box.cls[0].cpu().numpy())
            label_name = current_model.names[cls_idx]
            disease = get_disease_info(label_name, disease_map)
            color = disease["color"]

            # Resize mask to original image size
            mask = mask_data[i]
            mask_resized = cv2.resize(mask, (w, h), interpolation=cv2.INTER_LINEAR)
            binary_mask = (mask_resized > 0.5).astype(np.uint8)

            # Draw colored mask on overlay
            colored_mask = np.zeros_like(overlay)
            colored_mask[binary_mask == 1] = color
            overlay[binary_mask == 1] = colored_mask[binary_mask == 1]

            # Draw contours
            contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            cv2.drawContours(annotated, contours, -1, color, contour_thickness)

            # Draw label at the top of the mask bounding box
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
            label_text = f"{disease['name_en']} {conf:.0%}"
            (tw, th_text), baseline = cv2.getTextSize(
                label_text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness
            )
            label_y1 = max(y1 - th_text - baseline - 10, 0)
            cv2.rectangle(annotated, (x1, label_y1), (x1 + tw + 10, y1), color, -1)
            cv2.putText(
                annotated, label_text, (x1 + 5, y1 - baseline - 5),
                cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), thickness, cv2.LINE_AA,
            )

    # Blend overlay with annotated image
    annotated = cv2.addWeighted(overlay, alpha, annotated, 1 - alpha, 0)
    return annotated


def image_to_base64(image: np.ndarray) -> str:
    """Convert OpenCV image (BGR) to base64 JPEG string."""
    _, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return base64.b64encode(buffer).decode("utf-8")


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Serve the main page."""
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/api/predict")
async def predict(file: UploadFile = File(...), modality: str = Form("xray")):
    """Run YOLO inference on an uploaded X-ray or CT image."""
    try:
        # Read and decode the image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            return JSONResponse(
                status_code=400,
                content={"error": "ไม่สามารถอ่านไฟล์ภาพได้ กรุณาอัพโหลดไฟล์ภาพที่ถูกต้อง"},
            )

        # Select correct model
        if modality == "brain_ct":
            current_model = brain_ct_model
            disease_map = BRAIN_CT_DISEASE_MAP
        elif modality == "ct":
            current_model = ct_model
            disease_map = CT_DISEASE_MAP
        else:
            current_model = model
            disease_map = DISEASE_MAP

        if current_model is None:
            modality_names = {"ct": "CT Scan ปอด", "brain_ct": "CT Scan สมอง", "xray": "X-Ray"}
            return JSONResponse(status_code=500, content={"error": f"โมเดล {modality_names.get(modality, modality)} ยังไม่พร้อมใช้งาน"})

        # Run inference
        is_segmentation = (modality == "brain_ct")
        results = current_model.predict(source=image, conf=0.25, verbose=False)

        # Draw annotations on image
        if is_segmentation:
            annotated_image = draw_segmentation(image, results, current_model, disease_map)
        else:
            annotated_image = draw_detections(image, results, current_model, disease_map)
        annotated_b64 = image_to_base64(annotated_image)

        # Also send original image as base64
        original_b64 = image_to_base64(image)
        img_h, img_w = image.shape[:2]

        # Parse detections
        detections = []
        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue

            masks = result.masks if is_segmentation else None

            for i, box in enumerate(boxes):
                cls_idx = int(box.cls[0].cpu().numpy())
                conf = float(box.conf[0].cpu().numpy())
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().tolist()
                label_name = current_model.names[cls_idx]
                disease = get_disease_info(label_name, disease_map)

                det_entry = {
                    "class_id": label_name,
                    "name_en": disease["name_en"],
                    "name_th": disease["name_th"],
                    "description": disease["description"],
                    "severity": disease["severity"],
                    "confidence": round(conf, 4),
                    "confidence_pct": f"{conf:.1%}",
                    "bbox": {
                        "x1": round(x1, 1),
                        "y1": round(y1, 1),
                        "x2": round(x2, 1),
                        "y2": round(y2, 1),
                    },
                }

                # Add mask area info for segmentation
                if is_segmentation and masks is not None and i < len(masks.data):
                    mask = masks.data[i].cpu().numpy()
                    mask_resized = cv2.resize(mask, (img_w, img_h), interpolation=cv2.INTER_LINEAR)
                    pixel_area = int(np.sum(mask_resized > 0.5))
                    total_pixels = img_w * img_h
                    area_pct = round((pixel_area / total_pixels) * 100, 2)
                    det_entry["mask_area_px"] = pixel_area
                    det_entry["mask_area_pct"] = f"{area_pct}%"
                    det_entry["type"] = "segmentation"
                else:
                    det_entry["type"] = "detection"

                detections.append(det_entry)

        # Sort by confidence (highest first)
        detections.sort(key=lambda d: d["confidence"], reverse=True)

        return JSONResponse(content={
            "success": True,
            "total_detections": len(detections),
            "detections": detections,
            "annotated_image": annotated_b64,
            "original_image": original_b64,
            "image_size": {"width": image.shape[1], "height": image.shape[0]},
            "analyzed_at": datetime.now().isoformat(),
            "analysis_type": "segmentation" if is_segmentation else "detection",
        })

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"เกิดข้อผิดพลาดในการวิเคราะห์: {str(e)}"},
        )


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
