#!/usr/bin/env python3
"""
Prince's upgraded batch_audio_to_tiff_v2.py (with automatic cleanup)
--------------------------------------------------
Changes made:
- Automatically removes temporary chunk/flac folders after processing each source file
- Adds an optional `--keep-temp` CLI flag if you want to retain temp for debugging
- Safer cleanup (tries to remove temp even if some chunks failed)
- Fixed `global` usage bug (moved global declaration before using module-level names in defaults)
- Minor robustness improvements and clearer logging

Customized paths (unchanged):
Input audios  → E:\Minor Project\Minor-Project-For-Amity-Patna\PrinceWorkUpdates\audios
Output TIFFs → E:\Minor Project\Minor-Project-For-Amity-Patna\PrinceWorkUpdates\out_tiffs\out_tiffs
"""

import argparse
import subprocess
import json
import math
import tempfile
import hashlib
import sys
import shutil
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed
from multiprocessing import cpu_count
import numpy as np
import soundfile as sf
import librosa
from tifffile import TiffWriter
from tqdm import tqdm

# ============================================================
# ==== PATHS: YOUR PRESET FOLDERS ============================
# ============================================================

INPUT_DIR = Path(r"E:\Minor Project\Minor-Project-For-Amity-Patna\PrinceWorkUpdates\audios")
OUTPUT_DIR = Path(r"E:\Minor Project\Minor-Project-For-Amity-Patna\PrinceWorkUpdates\out_tiffs\out_tiffs")
TEMP_DIR   = OUTPUT_DIR / "tmp"

# ============================================================
# ==== CONFIGURATION (TUNEABLE IF NEEDED) ====================
# ============================================================

CHUNK_SECONDS = 21600  # 6 hours
PREVIEW_SR = 22050
PREVIEW_MAX_TOTAL = 90  # preview samples from ≤90 seconds total
PREVIEW_SAMPLE_SECONDS = 30
N_FFT = 2048
N_MELS = 128
WORKERS = max(1, min(4, cpu_count() // 2))

# ============================================================
# ==== HELPER FUNCTIONS ======================================
# ============================================================

def check_ffmpeg():
    try:
        subprocess.run(["ffmpeg", "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return True
    except Exception:
        return False


def ffprobe_duration(path):
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        return float(out.stdout.strip())
    except Exception:
        return None


def split_with_ffmpeg(src_path, dest_dir, chunk_seconds):
    dest_dir.mkdir(parents=True, exist_ok=True)
    template = str(dest_dir / "chunk_%06d.wav")
    # Using segment muxer. Note: some containers/inputs require re-encoding for safe splitting — keep an eye on your files.
    cmd = [
        "ffmpeg", "-y", "-i", str(src_path),
        "-f", "segment", "-segment_time", str(chunk_seconds),
        "-c", "copy", template
    ]
    subprocess.run(cmd, check=True)
    chunks = sorted(dest_dir.glob("chunk_*.wav"))
    records = []
    for i, p in enumerate(chunks):
        records.append({"path": p, "start_time": i * chunk_seconds})
    return records


def split_with_soundfile(src_path, dest_dir, chunk_seconds):
    dest_dir.mkdir(parents=True, exist_ok=True)
    info = sf.info(str(src_path))
    sr = info.samplerate
    total_frames = info.frames
    chunk_frames = int(chunk_seconds * sr)
    n_chunks = math.ceil(total_frames / chunk_frames)
    records = []
    with sf.SoundFile(str(src_path), 'r') as sf_in:
        for i in range(n_chunks):
            out_path = dest_dir / f"chunk_{i:06d}.wav"
            with sf.SoundFile(str(out_path), 'w', samplerate=sr, channels=sf_in.channels, subtype='PCM_16') as wf:
                # stream frames into the chunk until the chunk boundary
                frames_to_write = chunk_frames
                while frames_to_write > 0:
                    block = sf_in.read(min(1024 * 64, frames_to_write), dtype='float32', always_2d=False)
                    if block is None or len(block) == 0:
                        break
                    wf.write(block)
                    frames_to_write -= block.shape[0]
            records.append({"path": out_path, "start_time": i * chunk_seconds})
    return records


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def generate_preview_sampled(path):
    info = sf.info(str(path))
    total_sec = info.frames / info.samplerate
    segs = min(3, math.ceil(PREVIEW_MAX_TOTAL / PREVIEW_SAMPLE_SECONDS))
    samples = []
    for i in range(segs):
        # choose start times spread across the file but clamped
        t0 = 0.0
        if segs == 1:
            t0 = 0.0
        else:
            t0 = min(max(0.0, (i / max(1, segs - 1)) * total_sec), max(0.0, total_sec - PREVIEW_SAMPLE_SECONDS))
        with sf.SoundFile(str(path), 'r') as sf_in:
            sf_in.seek(int(t0 * info.samplerate))
            data = sf_in.read(int(PREVIEW_SAMPLE_SECONDS * info.samplerate), dtype='float32', always_2d=False)
            if data is None or len(data) == 0:
                continue
            if data.ndim > 1:
                data = np.mean(data, axis=1)
            if info.samplerate != PREVIEW_SR:
                data = librosa.resample(data, orig_sr=info.samplerate, target_sr=PREVIEW_SR)
            samples.append(data)
    if not samples:
        y = np.zeros(PREVIEW_SR, dtype=np.float32)
    else:
        y = np.concatenate(samples)
    S = librosa.feature.melspectrogram(y=y, sr=PREVIEW_SR, n_fft=N_FFT, hop_length=N_FFT // 4, n_mels=N_MELS)
    S_db = librosa.power_to_db(S, ref=np.max)
    S_norm = (S_db - S_db.min()) / (S_db.max() - S_db.min() + 1e-9)
    img = (S_norm * 255.0).astype(np.uint8)
    return np.flipud(img), {'sr': PREVIEW_SR, 'n_fft': N_FFT, 'n_mels': N_MELS}


def encode_to_flac(chunk_path, flac_path):
    data, sr = sf.read(str(chunk_path), dtype='float32')
    # ensure directory exists
    flac_path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(flac_path), data, sr, format='FLAC')
    return flac_path


def write_tiff(out_path, preview_img, flac_path, metadata):
    flac_size = flac_path.stat().st_size
    # memory-map the flac file for efficient reading without loading into RAM
    mm = np.memmap(str(flac_path), dtype='uint8', mode='r', shape=(flac_size,))
    arr = mm.reshape((1, flac_size))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with TiffWriter(str(out_path), bigtiff=False) as tw:
        tw.write(preview_img, photometric='minisblack',
                 description=json.dumps({'metadata': metadata}))
        tw.write(arr, photometric='minisblack',
                 description=json.dumps({'embedded_flac_bytes': True}))
    # delete memmap object reference so file can be removed by cleanup
    del mm


def process_chunk(rec, out_dir, temp_dir):
    chunk = Path(rec['path'])
    start_t = rec['start_time']
    cid = chunk.stem
    out_tiff = out_dir / f"{cid}.tiff"

    # create preview
    preview_img, preview_meta = generate_preview_sampled(chunk)

    # encode chunk to FLAC in the given temp_dir
    flac_path = temp_dir / (cid + ".flac")
    encode_to_flac(chunk, flac_path)
    flac_sha = sha256_file(flac_path)

    metadata = {
        'chunk_id': cid,
        'start_time_seconds': start_t,
        'sample_rate': int(sf.info(str(chunk)).samplerate),
        'encoding': 'FLAC',
        'preview_meta': preview_meta
    }

    write_tiff(out_tiff, preview_img, flac_path, metadata)
    return {
        'chunk_id': cid,
        'tiff_path': str(out_tiff),
        'flac_sha256': flac_sha,
        'start_time_seconds': start_t,
        'size_bytes': int(out_tiff.stat().st_size)
    }

# ============================================================
# ==== MAIN ORCHESTRATOR =====================================
# ============================================================

def process_audio(src_path, output_dir, temp_dir, keep_temp=False):
    # Each source file gets its own temporary working directory
    temp_root = temp_dir / f"temp_{src_path.stem}"
    chunk_dir = temp_root / "chunks"
    flac_dir = temp_root / "flac"
    temp_root.mkdir(parents=True, exist_ok=True)
    flac_dir.mkdir(parents=True, exist_ok=True)

    dur = ffprobe_duration(src_path)
    if dur is None:
        print(f"⚠️ Could not read duration for {src_path.name}, skipping.")
        # attempt cleanup even if duration couldn't be read
        if not keep_temp:
            try:
                shutil.rmtree(temp_root)
            except Exception:
                pass
        return []

    try:
        if dur > CHUNK_SECONDS:
            print(f"⏱ Splitting {src_path.name} ({dur/3600:.1f}h) into 6-hour chunks...")
            if check_ffmpeg():
                chunks = split_with_ffmpeg(src_path, chunk_dir, CHUNK_SECONDS)
            else:
                chunks = split_with_soundfile(src_path, chunk_dir, CHUNK_SECONDS)
        else:
            chunks = [{'path': src_path, 'start_time': 0}]

        results = []
        with ProcessPoolExecutor(max_workers=WORKERS) as ex:
            futs = {ex.submit(process_chunk, c, output_dir, flac_dir): c for c in chunks}
            for f in tqdm(as_completed(futs), total=len(futs), desc=f"Processing {src_path.name}"):
                try:
                    results.append(f.result())
                except Exception as e:
                    print("⚠️ Chunk failed:", e)

        results = sorted(results, key=lambda x: x['start_time_seconds'])

        return results

    finally:
        # Cleanup: remove temporary folder unless user requested to keep it
        if keep_temp:
            print(f"ℹ️ Keeping temporary files at: {temp_root}")
        else:
            try:
                if temp_root.exists():
                    shutil.rmtree(temp_root)
                    print(f"🧹 Cleaned up temporary files: {temp_root}")
            except Exception as e:
                print(f"⚠️ Cleanup failed for {temp_root}: {e}")


def main():
    # declare globals before using the module-level defaults in CLI help/defaults
    global INPUT_DIR, OUTPUT_DIR, TEMP_DIR

    parser = argparse.ArgumentParser(description='Batch audio -> TIFF (with embedded FLAC)')
    parser.add_argument('--input', '-i', type=str, default=str(INPUT_DIR), help='Input directory')
    parser.add_argument('--output', '-o', type=str, default=str(OUTPUT_DIR), help='Output directory')
    parser.add_argument('--keep-temp', action='store_true', help='Do not delete temporary files (for debugging)')
    args = parser.parse_args()

    INPUT_DIR = Path(args.input)
    OUTPUT_DIR = Path(args.output)
    TEMP_DIR = OUTPUT_DIR / "tmp"

    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TEMP_DIR.mkdir(parents=True, exist_ok=True)

    manifest = {'input_dir': str(INPUT_DIR), 'chunk_seconds': CHUNK_SECONDS, 'files': []}
    manifest_path = OUTPUT_DIR / "manifest.json"

    audio_files = sorted([p for p in INPUT_DIR.glob("*.*") if p.is_file()])
    if not audio_files:
        print("❌ No audio files found in", INPUT_DIR)
        return

    for af in audio_files:
        print(f"\n🎧 Processing file: {af.name}")
        entries = process_audio(af, OUTPUT_DIR, TEMP_DIR, keep_temp=args.keep_temp)
        manifest['files'].append({'source_file': str(af), 'chunks': entries})
        with open(manifest_path, 'w', encoding='utf8') as f:
            json.dump(manifest, f, indent=2)

    print("\n✅ All Done!")
    print("📄 Manifest saved at:", manifest_path)
    print("📁 Output TIFFs in:", OUTPUT_DIR)

if __name__ == "__main__":
    main()
