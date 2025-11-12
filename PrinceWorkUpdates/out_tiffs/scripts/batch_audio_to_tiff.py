#!/usr/bin/env python3
"""
batch_audio_to_tiff_reconstructable_anyfmt.py

- Accepts arbitrary audio formats (mp3, mp4/m4a, wav, flac, etc.) by using ffmpeg when needed.
- Produces an RGB mel-spectrogram heatmap preview (colorful) as TIFF page 0.
- Embeds compressed FLAC bytes as TIFF page 1 for reconstructability.
- Adaptive size control to try keeping TIFF smaller than original audio file.
- CLI: --workers, --keep-temp, --no-flac, --max-image-dim, --minify-loop
"""

import argparse
import subprocess
import json
import math
import traceback
import hashlib
import sys
import shutil
import tempfile
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed
from multiprocessing import cpu_count
import numpy as np
import soundfile as sf
from tifffile import TiffWriter
from tqdm import tqdm
from PIL import Image
import matplotlib
matplotlib.use('Agg')
import matplotlib.cm as cm

# Optional: librosa if available (higher quality)
_librosa_available = False
try:
    import importlib
    if importlib.util.find_spec("librosa") is not None:
        _librosa_available = True
except Exception:
    _librosa_available = False

# ------------------ Config ------------------
INPUT_DIR = Path(r"E:\Minor Project\Minor-Project-For-Amity-Patna\PrinceWorkUpdates\audios")
OUTPUT_DIR = Path(r"E:\Minor Project\Minor-Project-For-Amity-Patna\PrinceWorkUpdates\out_tiffs\out_tiffs")
TEMP_DIR = OUTPUT_DIR / "tmp"

CHUNK_SECONDS = 21600
PREVIEW_SR = 22050
PREVIEW_MAX_TOTAL = 90
PREVIEW_SAMPLE_SECONDS = 30
N_FFT = 2048
N_MELS = 128
DEFAULT_WORKERS = max(1, min(4, cpu_count() // 2))
DEFAULT_CMAP = "magma"  # colorful heatmap

# ------------------ Utilities ------------------
def check_ffmpeg():
    try:
        subprocess.run(["ffmpeg", "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return True
    except Exception:
        return False

def sha256_file(path: Path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def ffprobe_duration(path):
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        return float(out.stdout.strip())
    except Exception:
        return None

def get_duration_multimethod(path):
    p = Path(path)
    try:
        info = sf.info(str(p))
        if info and info.frames and info.samplerate:
            dur = info.frames / info.samplerate
            if dur > 0:
                return dur, "soundfile"
    except Exception:
        pass
    if _librosa_available:
        try:
            import librosa as _lib
            dur = _lib.get_duration(filename=str(p))
            if dur and dur > 0:
                return float(dur), "librosa"
        except Exception:
            pass
    try:
        dur = ffprobe_duration(p)
        if dur and dur > 0:
            return float(dur), "ffprobe"
    except Exception:
        pass
    return None, None

# ------------------ Read arbitrary audio ------------------
def ensure_wav_for_path(src_path: str, tmp_dir: Path):
    """
    Ensure a WAV PCM file exists for arbitrary input. Returns (wav_path, cleanup_flag)
    If input is already readable by soundfile as PCM, returns (src_path, False).
    Otherwise uses ffmpeg to write a temporary wav and returns (tmp_wav, True).
    """
    src = Path(src_path)
    # try reading header with soundfile
    try:
        _ = sf.info(str(src))
        # soundfile supports it — return original path (may still be compressed but readable)
        return str(src), False
    except Exception:
        # need ffmpeg convert
        tmp_dir.mkdir(parents=True, exist_ok=True)
        tmp_wav = tmp_dir / (src.stem + "_ffconv.wav")
        cmd = ["ffmpeg", "-y", "-i", str(src), "-vn", "-acodec", "pcm_s16le", "-ar", str(PREVIEW_SR), str(tmp_wav)]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return str(tmp_wav), True

# ------------------ Mel spectrogram (librosa or fallback) ------------------
def hz_to_mel(hz):
    return 2595.0 * np.log10(1.0 + hz / 700.0)
def mel_to_hz(mel):
    return 700.0 * (10**(mel / 2595.0) - 1.0)

def mel_filterbank(sr, n_fft, n_mels, fmin=0.0, fmax=None):
    if fmax is None:
        fmax = sr/2.0
    mel_points = np.linspace(hz_to_mel(fmin), hz_to_mel(fmax), n_mels+2)
    hz_points = mel_to_hz(mel_points)
    fft_freqs = np.linspace(0, sr/2.0, n_fft//2 + 1)
    fb = np.zeros((n_mels, len(fft_freqs)), dtype=np.float32)
    for m in range(1, n_mels+1):
        f_left = hz_points[m-1]; f_center = hz_points[m]; f_right = hz_points[m+1]
        left = (fft_freqs >= f_left) & (fft_freqs <= f_center)
        right = (fft_freqs >= f_center) & (fft_freqs <= f_right)
        if np.any(left):
            fb[m-1,left] = (fft_freqs[left] - f_left) / (f_center - f_left + 1e-9)
        if np.any(right):
            fb[m-1,right] = (f_right - fft_freqs[right]) / (f_right - f_center + 1e-9)
    # normalization
    enorm = 2.0 / (hz_points[2:n_mels+2] - hz_points[:n_mels])
    fb *= enorm[:,None]
    return fb

def stft_power(y, n_fft=N_FFT, hop_length=None, window=np.hanning):
    if hop_length is None:
        hop_length = n_fft//4
    y = np.asarray(y, dtype=np.float32)
    if y.ndim != 1:
        y = np.mean(y, axis=1)
    if len(y) < n_fft:
        y = np.pad(y, (0, n_fft-len(y)))
    pad = n_fft - (len(y)-n_fft) % hop_length if len(y) >= n_fft else n_fft - len(y)
    if pad > 0:
        y = np.pad(y, (0,pad))
    n_frames = 1 + (len(y)-n_fft) // hop_length
    window_vals = window(n_fft)
    frames = np.lib.stride_tricks.as_strided(y, shape=(n_frames, n_fft), strides=(y.strides[0]*hop_length, y.strides[0])).copy()
    frames *= window_vals[None,:]
    S = np.fft.rfft(frames, n=n_fft, axis=1)
    P = (np.abs(S)**2).T
    return P

def compute_mel_spectrogram_fallback(y, sr, n_fft=N_FFT, n_mels=N_MELS, hop_length=None):
    P = stft_power(y, n_fft=n_fft, hop_length=hop_length)
    fb = mel_filterbank(sr, n_fft, n_mels)
    mel_spec = np.dot(fb, P)
    return mel_spec

def melspectrogram_to_rgb(S_db, cmap_name=DEFAULT_CMAP):
    S_db = np.array(S_db, dtype=np.float32)
    if not np.isfinite(S_db).all():
        finite = S_db[np.isfinite(S_db)]
        if finite.size == 0:
            S_db = np.zeros_like(S_db)
        else:
            S_db = np.nan_to_num(S_db, nan=float(np.min(finite)), posinf=float(np.max(finite)), neginf=float(np.min(finite)))
    mn, mx = float(np.min(S_db)), float(np.max(S_db))
    if mx - mn < 1e-9:
        norm = np.zeros_like(S_db, dtype=np.float32)
    else:
        norm = (S_db - mn) / (mx - mn)
    cmap = cm.get_cmap(cmap_name)
    rgba = cmap(norm)
    rgb = (rgba[:,:,:3] * 255.0).astype(np.uint8)
    rgb = np.flipud(rgb)
    return rgb

def generate_colored_mel_preview(path, preview_sr=PREVIEW_SR, n_fft=N_FFT, n_mels=N_MELS, cmap=DEFAULT_CMAP):
    """
    Returns (rgb_uint8, preview_meta)
    Uses librosa if available; fallback to pure-NumPy compute.
    """
    # ensure we have a WAV-like readable path; prefer reading original if soundfile supports it
    tmp_dir = Path(tempfile.mkdtemp(prefix="preview_conv_"))
    wav_path, created_tmp = ensure_wav_for_path(path, tmp_dir)
    try:
        info = sf.info(str(wav_path))
        sr_in = info.samplerate
        total_sec = info.frames / info.samplerate if info.frames and info.samplerate else 0.0
    except Exception:
        sr_in = preview_sr
        total_sec = 0.0

    segs = min(3, max(1, math.ceil(PREVIEW_MAX_TOTAL / PREVIEW_SAMPLE_SECONDS)))
    samples = []
    for i in range(segs):
        if segs == 1:
            t0 = 0.0
        else:
            t0 = min(max(0.0, (i / max(1,segs-1))*total_sec), max(0.0, total_sec - PREVIEW_SAMPLE_SECONDS))
        try:
            with sf.SoundFile(str(wav_path), 'r') as sf_in:
                sr_read = sf_in.samplerate
                try:
                    sf_in.seek(int(t0 * sr_read))
                except Exception:
                    sf_in.seek(0)
                data = sf_in.read(int(PREVIEW_SAMPLE_SECONDS * sr_read), dtype='float32', always_2d=False)
        except Exception:
            data = None
        if data is None or len(data)==0:
            continue
        if data.ndim > 1:
            data = np.mean(data, axis=1)
        # resample to preview_sr
        if sr_read != preview_sr:
            if _librosa_available:
                try:
                    import librosa as _lib
                    data = _lib.resample(data, orig_sr=sr_read, target_sr=preview_sr)
                except Exception:
                    # coarse fallback
                    if len(data) < preview_sr:
                        data = np.pad(data, (0, preview_sr - len(data)))
                    else:
                        factor = int(max(1, round(sr_read/preview_sr)))
                        data = data[::factor][:preview_sr]
            else:
                if len(data) < preview_sr:
                    data = np.pad(data, (0, preview_sr - len(data)))
                else:
                    factor = int(max(1, round(sr_read/preview_sr)))
                    data = data[::factor][:preview_sr]
        samples.append(data)

    if not samples:
        y = np.zeros(preview_sr, dtype=np.float32)
    else:
        y = np.concatenate(samples)
    if len(y) < max(1, preview_sr//4):
        y = np.pad(y, (0, max(0, preview_sr//4 - len(y))))

    S_db = None
    if _librosa_available:
        try:
            import librosa as _lib
            S = _lib.feature.melspectrogram(y=y, sr=preview_sr, n_fft=n_fft, hop_length=n_fft//4, n_mels=n_mels, power=2.0)
            S_db = _lib.power_to_db(S, ref=np.max) if np.max(np.abs(S)) != 0 else np.zeros_like(S)
        except Exception:
            S_db = None

    if S_db is None:
        mel_spec = compute_mel_spectrogram_fallback(y, preview_sr, n_fft=n_fft, n_mels=n_mels, hop_length=n_fft//4)
        with np.errstate(divide='ignore'):
            S_db = 10.0 * np.log10(np.maximum(mel_spec, 1e-20))
        if np.max(np.abs(S_db)) == 0:
            S_db = np.zeros_like(S_db)

    rgb = melspectrogram_to_rgb(S_db, cmap_name=cmap)
    preview_meta = {'sr': preview_sr, 'n_fft': n_fft, 'n_mels': n_mels, 'duration_preview_sec': len(y)/preview_sr, 'created_tmp_wav': created_tmp}
    # cleanup tmp wav if we created one
    try:
        if created_tmp and Path(wav_path).exists():
            Path(wav_path).unlink()
        tmp_dir.rmdir()
    except Exception:
        pass
    return rgb, preview_meta

# ------------------ Flac encode & TIFF write ------------------
def encode_to_flac(chunk_path: str, flac_path: Path):
    data, sr = sf.read(str(chunk_path), dtype='float32')
    flac_path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(flac_path), data, sr, format='FLAC')
    return flac_path

def write_tiff_with_embedded_flac(out_tiff: Path, preview_rgb: np.ndarray, flac_path: Path, metadata: dict, compression='zlib'):
    out_tiff.parent.mkdir(parents=True, exist_ok=True)
    # preview_rgb expected HxWx3 uint8
    with TiffWriter(str(out_tiff), bigtiff=False) as tw:
        tw.write(preview_rgb, photometric='rgb', compression=compression, description=json.dumps({'metadata': metadata, 'preview': True}))
        flac_size = flac_path.stat().st_size
        mm = np.memmap(str(flac_path), dtype='uint8', mode='r', shape=(flac_size,))
        arr = mm.reshape((1, flac_size))
        tw.write(arr, photometric='minisblack', compression=compression, description=json.dumps({'embedded_flac_bytes': True}))
        del mm

def write_tiff_only_flac(out_tiff: Path, flac_path: Path, metadata: dict, compression='zlib'):
    out_tiff.parent.mkdir(parents=True, exist_ok=True)
    with TiffWriter(str(out_tiff), bigtiff=False) as tw:
        flac_size = flac_path.stat().st_size
        mm = np.memmap(str(flac_path), dtype='uint8', mode='r', shape=(flac_size,))
        arr = mm.reshape((1, flac_size))
        tw.write(arr, photometric='minisblack', compression=compression, description=json.dumps({'embedded_flac_bytes': True, 'metadata': metadata}))
        del mm

# ------------------ process chunk -> tiff ------------------
def process_chunk_to_tiff(rec, out_dir: Path, temp_dir: Path, max_image_dim=256, minify_loop=True, keep_temp=False, cmap=DEFAULT_CMAP):
    chunk_path = Path(rec['path'])
    start_t = rec.get('start_time', 0)
    cid = chunk_path.stem
    out_tiff = out_dir / f"{cid}.tiff"
    temp_dir.mkdir(parents=True, exist_ok=True)
    flac_path = temp_dir / (cid + ".flac")

    # generate colorful mel preview (RGB)
    try:
        rgb, preview_meta = generate_colored_mel_preview(str(chunk_path), preview_sr=PREVIEW_SR, n_fft=N_FFT, n_mels=N_MELS, cmap=cmap)
    except Exception as e:
        rgb = np.zeros((128,128,3), dtype=np.uint8)
        preview_meta = {'error': str(e)}

    # downscale preview to max_image_dim (maintain aspect ratio)
    img_pil = Image.fromarray(rgb)
    w,h = img_pil.size
    max_dim = max(w,h)
    if max_dim > max_image_dim:
        scale = max_image_dim / float(max_dim)
        new_w = max(1,int(round(w*scale))); new_h = max(1,int(round(h*scale)))
        img_pil = img_pil.resize((new_w,new_h), resample=Image.BILINEAR)
    preview_rgb_uint8 = np.array(img_pil)

    # encode chunk to flac in temp
    try:
        encode_to_flac(chunk_path, flac_path)
        flac_sha = sha256_file(flac_path)
    except Exception as e:
        return {'chunk_id': cid, 'error': f"FLAC encode failed: {e}", 'start_time_seconds': start_t}

    metadata = {
        'chunk_id': cid,
        'start_time_seconds': start_t,
        'sample_rate': int(sf.info(str(chunk_path)).samplerate) if (chunk_path.exists() and sf.info(str(chunk_path)).samplerate) else PREVIEW_SR,
        'encoding': 'FLAC',
        'preview_meta': preview_meta
    }

    # try writing tiff with both pages
    try:
        write_tiff_with_embedded_flac(out_tiff, preview_rgb_uint8, flac_path, metadata, compression='zlib')
    except Exception as e:
        try:
            write_tiff_with_embedded_flac(out_tiff, preview_rgb_uint8, flac_path, metadata, compression=None)
        except Exception as e2:
            return {'chunk_id': cid, 'error': f"TIFF write failed: {e} / {e2}", 'start_time_seconds': start_t}

    # size adapt: if TIFF >= source audio size, try shrink then drop preview
    try:
        tiff_size = out_tiff.stat().st_size
        src_size = chunk_path.stat().st_size if chunk_path.exists() else None
    except Exception:
        tiff_size = out_tiff.stat().st_size
        src_size = None

    preview_included = True
    if src_size is not None and tiff_size >= src_size:
        if minify_loop:
            # progressive reductions
            dims = [max_image_dim//2, max_image_dim//3, 128, 64]
            reduced = False
            orig_preview = img_pil
            for d in dims:
                try:
                    if d <= 0: continue
                    s = max(1, int(round(min(orig_preview.size) * d / max(orig_preview.size))))
                    small = orig_preview.resize((max(1,int(round(orig_preview.size[0]*d/max(orig_preview.size)))), max(1, int(round(orig_preview.size[1]*d/max(orig_preview.size))))), resample=Image.BILINEAR)
                    write_tiff_with_embedded_flac(out_tiff, np.array(small), flac_path, metadata, compression='zlib')
                    tiff_size = out_tiff.stat().st_size
                    if tiff_size < src_size:
                        preview_included = True
                        reduced = True
                        break
                except Exception:
                    continue
            if not reduced:
                # rewrite with only flac
                try:
                    write_tiff_only_flac(out_tiff, flac_path, metadata, compression='zlib')
                    preview_included = False
                except Exception:
                    preview_included = True
        else:
            try:
                write_tiff_only_flac(out_tiff, flac_path, metadata, compression='zlib')
                preview_included = False
            except Exception:
                preview_included = True

    entry = {
        'chunk_id': cid,
        'tiff_path': str(out_tiff),
        'flac_sha256': flac_sha,
        'start_time_seconds': start_t,
        'size_bytes': int(out_tiff.stat().st_size) if out_tiff.exists() else 0,
        'preview_included': preview_included
    }

    # remove temp flac unless keep_temp True
    if not keep_temp:
        try:
            if flac_path.exists():
                flac_path.unlink()
        except Exception:
            pass

    return entry

# ------------------ Orchestrator ------------------
def process_audio(src_path, output_dir, temp_dir, workers=DEFAULT_WORKERS, keep_temp=False, no_flac=False, max_image_dim=256, minify_loop=True, cmap=DEFAULT_CMAP):
    temp_root = Path(temp_dir) / f"temp_{Path(src_path).stem}"
    chunk_dir = temp_root / "chunks"
    flac_dir = temp_root / "flac"
    temp_root.mkdir(parents=True, exist_ok=True)
    flac_dir.mkdir(parents=True, exist_ok=True)

    dur, method = get_duration_multimethod(src_path)
    if dur is None:
        chunks = [{'path': src_path, 'start_time': 0}]
    else:
        if dur > CHUNK_SECONDS:
            # split using ffmpeg to reliable PCM segments
            chunk_dir.mkdir(parents=True, exist_ok=True)
            template = str(chunk_dir / "chunk_%06d.wav")
            subprocess.run(["ffmpeg", "-y", "-i", str(src_path), "-f", "segment", "-segment_time", str(CHUNK_SECONDS), "-c:a", "pcm_s16le", template], check=True)
            chunk_files = sorted(chunk_dir.glob("chunk_*.wav"))
            chunks = [{'path': p, 'start_time': i*CHUNK_SECONDS} for i,p in enumerate(chunk_files)]
        else:
            chunks = [{'path': src_path, 'start_time': 0}]

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    results = []

    if workers <= 1 or len(chunks) == 1:
        for c in tqdm(chunks, desc=f"Processing {Path(src_path).name} (sequential)"):
            entry = process_chunk_to_tiff(c, output_dir, flac_dir, max_image_dim=max_image_dim, minify_loop=minify_loop, keep_temp=keep_temp and not no_flac, cmap=cmap)
            results.append(entry)
    else:
        with ProcessPoolExecutor(max_workers=workers) as ex:
            futs = {ex.submit(process_chunk_to_tiff, c, output_dir, flac_dir, max_image_dim, minify_loop, keep_temp and not no_flac, cmap): c for c in chunks}
            for f in tqdm(as_completed(futs), total=len(futs), desc=f"Processing {Path(src_path).name}"):
                try:
                    results.append(f.result())
                except Exception as e:
                    tb = traceback.format_exc()
                    cid = Path(futs[f]['path']).stem if futs[f].get('path') else 'unknown'
                    results.append({'chunk_id': cid, 'error': str(e), 'traceback': tb})

    # cleanup chunk_dir if not keeping temp
    if not keep_temp:
        try:
            if chunk_dir.exists():
                shutil.rmtree(chunk_dir)
        except Exception:
            pass
    else:
        print(f"Kept chunk temp at: {chunk_dir}")

    return results

# ------------------ Main ------------------
def main():
    parser = argparse.ArgumentParser(description="Batch audio -> TIFF (embedded FLAC, colorful mel preview).")
    parser.add_argument("--input", "-i", type=str, default=str(INPUT_DIR))
    parser.add_argument("--output", "-o", type=str, default=str(OUTPUT_DIR))
    parser.add_argument("--keep-temp", action="store_true")
    parser.add_argument("--no-flac", action="store_true", help="Do not keep FLAC copies in temp (FLAC still embedded in TIFF).")
    parser.add_argument("--workers", "-w", type=int, default=DEFAULT_WORKERS)
    parser.add_argument("--max-image-dim", type=int, default=256)
    parser.add_argument("--minify-loop", action="store_true", default=True)
    parser.add_argument("--cmap", type=str, default=DEFAULT_CMAP, help="Matplotlib colormap for preview (e.g. magma, viridis, plasma)")
    args = parser.parse_args()

    input_dir = Path(args.input)
    output_dir = Path(args.output)
    temp_root = output_dir / "tmp"

    input_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    temp_root.mkdir(parents=True, exist_ok=True)

    manifest = {'input_dir': str(input_dir), 'chunk_seconds': CHUNK_SECONDS, 'files': []}
    manifest_path = output_dir / "manifest.json"

    audio_files = sorted([p for p in input_dir.glob("*.*") if p.is_file()])
    if not audio_files:
        print("No audio files found in", input_dir)
        return

    if not check_ffmpeg():
        print("⚠️ ffmpeg not found in PATH — some input formats may fail. Install ffmpeg to support mp3/m4a/etc.")

    for af in audio_files:
        print(f"\nProcessing {af.name} ...")
        entries = process_audio(str(af), output_dir, temp_root, workers=args.workers, keep_temp=args.keep_temp, no_flac=args.no_flac, max_image_dim=args.max_image_dim, minify_loop=args.minify_loop, cmap=args.cmap)
        manifest['files'].append({'source_file': str(af), 'chunks': entries})
        with open(manifest_path, 'w', encoding='utf8') as f:
            json.dump(manifest, f, indent=2)

    print("\nAll done.")
    print("Manifest:", manifest_path)
    print("TIFFs in:", output_dir)

if __name__ == "__main__":
    main()
