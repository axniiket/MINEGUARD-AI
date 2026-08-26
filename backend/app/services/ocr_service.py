import os
import shutil
from typing import Tuple
from PIL import Image
import pytesseract
from pypdf import PdfReader

# Configure Tesseract binary path
TESSERACT_BIN = shutil.which("tesseract") or "/opt/homebrew/bin/tesseract" or "/usr/local/bin/tesseract"
if os.path.exists(TESSERACT_BIN):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_BIN


def extract_text_from_file(file_path: str, content_type: str = "") -> Tuple[str, str]:
    """
    Extract text from an image or PDF document.
    Returns (extracted_text, status) where status is 'success', 'no_text_found', or 'failed'.
    """
    if not os.path.exists(file_path):
        return "", "failed"

    ext = os.path.splitext(file_path)[1].lower()

    # 1. PDF Text Extraction
    if ext == ".pdf" or "pdf" in content_type:
        try:
            reader = PdfReader(file_path)
            extracted_pages = []
            for idx, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    extracted_pages.append(f"--- Page {idx + 1} ---\n{page_text.strip()}")

            full_text = "\n\n".join(extracted_pages).strip()
            if full_text:
                return full_text, "success"
            else:
                return "PDF document contains no readable digital text layer (scanned PDF).", "no_text_found"
        except Exception as e:
            return f"Error extracting text from PDF: {str(e)}", "failed"

    # 2. Image OCR Extraction (JPEG, PNG, WEBP, TIFF, BMP)
    elif ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif"] or "image" in content_type:
        try:
            with Image.open(file_path) as img:
                # Convert to RGB for pytesseract if needed
                if img.mode not in ("L", "RGB"):
                    img = img.convert("RGB")
                text = pytesseract.image_to_string(img)
                cleaned_text = text.strip()
                if cleaned_text:
                    return cleaned_text, "success"
                else:
                    return "No legible text could be recognized in the provided image.", "no_text_found"
        except Exception as e:
            return f"OCR processing error: {str(e)}", "failed"

    else:
        return "Unsupported file format. Please upload a PDF or an image (JPG, PNG, WEBP).", "failed"
