import os
from io import BytesIO

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image
from rembg import remove

APP_MODEL = os.getenv("REMBG_MODEL", "u2net")

app = FastAPI(title="Poster Maker rembg Tool", version="1.0.0")


@app.get("/health")
def health():
    return {"ok": True, "model": APP_MODEL, "modelLoaded": True}


@app.post("/remove-background")
async def remove_background(
    image: UploadFile = File(...),
    model: str = Form(default=APP_MODEL),
    trim: bool = Form(default=True),
    alphaMatting: bool = Form(default=False),
    foregroundThreshold: int | None = Form(default=None),
    backgroundThreshold: int | None = Form(default=None),
    erodeSize: int | None = Form(default=None),
):
    try:
        input_bytes = await image.read()
        if not input_bytes:
            raise HTTPException(status_code=400, detail="Image file is empty")

        kwargs = {}
        if alphaMatting:
            kwargs["alpha_matting"] = True
        if foregroundThreshold is not None:
            kwargs["alpha_matting_foreground_threshold"] = foregroundThreshold
        if backgroundThreshold is not None:
            kwargs["alpha_matting_background_threshold"] = backgroundThreshold
        if erodeSize is not None:
            kwargs["alpha_matting_erode_size"] = erodeSize

        output = remove(input_bytes, **kwargs)
        if trim:
            output = trim_transparent(output)
        return Response(content=output, media_type="image/png")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def trim_transparent(image_bytes: bytes, padding: int = 8) -> bytes:
    img = Image.open(BytesIO(image_bytes)).convert("RGBA")
    bbox = img.getbbox()
    if not bbox:
        return image_bytes
    left = max(0, bbox[0] - padding)
    upper = max(0, bbox[1] - padding)
    right = min(img.width, bbox[2] + padding)
    lower = min(img.height, bbox[3] + padding)
    cropped = img.crop((left, upper, right, lower))
    buf = BytesIO()
    cropped.save(buf, format="PNG")
    return buf.getvalue()
