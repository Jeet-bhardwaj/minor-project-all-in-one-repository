#!/usr/bin/env python3
"""
extract_and_reconstruct_v2.py

Extract embedded FLAC bytes from TIFFs created by batch_audio_to_tiff_v2.py,
verify against manifest.json, and optionally reconstruct contiguous WAVs.

Pre-configured paths (change if needed):
 - INPUT_TIFF_DIR : where your TIFFs and manifest.json are (output_dir)
 - OUT_FLAC_DIR   : where extracted FLAC chunks will be written
 - OUT_WAV_DIR    : where reconstructed per-source WAVs will be written

Usage:
  python extract_and_reconstruct_v2.py           # runs with defaults
  python extract_and_reconstruct_v2.py --reconstruct  # also reconstruct WAV per source
  python extract_and_reconstruct_v2.py --workers 3

Dependencies:
  pip install numpy soundfile tifffile tqdm librosa
  (ffmpeg optional for advanced concat; recommended but not required)
"""
import argparse
import json
import hashlib
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from multiprocessing import cpu_count
import numpy as np
import soundfile as sf
import librosa
from tifffile import imread
from tqdm import tqdm
import os
import subprocess

# ---------------------------
# Pre-configured paths (user)
# ---------------------------
INPUT_TIFF_DIR = Path(r"E:\Minor Project\Minor-Project-For-Amity-Patna\PrinceWorkUpdates\out_tiffs\out_tiffs")
OUT_FLAC_DIR   = Path(r"E:\Minor Project\Minor-Project-For-Amity-Patna\PrinceWorkUpdates\recovered_flacs")
OUT_WAV_DIR    = Path(r"E:\Minor Project\Minor-Project-For-Amity-Patna\PrinceWorkUpdates\reconstructed")
# ---------------------------

# Defaults
DEFAULT_WORKERS = max(1, min(4, cpu_count()//2))
CHUNK_READ_BLOCK = 1 << 20  # 1 MB read/write block

def load_manifest(manifest_path: Path):
    if not manifest_path.exists():
        raise FileNotFoundError(f"manifest.json not found at {manifest_path}")
    with manifest_path.open('r', encoding='utf8') as f:
        manifest = json.load(f)
    return manifest

def sha256_of_streaming_file(path: Path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(CHUNK_READ_BLOCK), b''):
            h.update(chunk)
    return h.hexdigest()

def extract_flac_from_tiff_stream(tiff_path: Path, out_flac_path: Path, memmap=True):
    """
    Extract page 1 of the TIFF (embedded raw uint8 bytes) to a .flac file.
    Uses imread(..., memmap=True) when possible to avoid loading everything into RAM.
    Writes out in streaming manner.
    """
    # Ensure parent exists
    out_flac_path.parent.mkdir(parents=True, exist_ok=True)

    # Attempt memmap read of page 1 (key=1). tifffile.imread supports memmap=True.
    try:
        arr = imread(str(tiff_path), key=1, memmap=memmap)  # returns a numpy array or memmap; shape (1, N)
        # flatten view (no copy if memmap)
        flat = np.ravel(arr)
        # write in chunks from memmap to avoid extra memory copy
        with out_flac_path.open('wb') as out_f:
            # If it's a memmap, slicing will be efficient; still iterate in blocks
            total = flat.size
            idx = 0
            block = CHUNK_READ_BLOCK
            # flat is uint8 array; view its buffer
            while idx < total:
                end = idx + min(block, total - idx)
                chunk = flat[idx:end].tobytes()
                out_f.write(chunk)
                idx = end
    except Exception as e:
        # fallback: read whole array then write (less memory-efficient, but should rarely hit)
        print(f"⚠️  memmap/read fallback for {tiff_path.name}: {e}")
        arr_full = imread(str(tiff_path), key=1)
        flat = np.ravel(arr_full)
        out_flac_path.write_bytes(flat.tobytes())

def extract_single_entry(entry: dict, out_flac_dir: Path, tiff_base_dir: Path, resume=True):
    """
    entry: dict containing at least 'tiff' (path string) and 'flac_sha256' (expected)
    returns tuple (status, info) where status in {'ok','skipped','mismatch','error'}
    """
    tiff_rel = entry.get('tiff') or entry.get('tiff_path') or entry.get('tiffPath')
    if not tiff_rel:
        return ('error', f"No tiff path in manifest entry: {entry}")
    tiff_path = Path(tiff_rel)
    # If tiff path is relative, join with base dir
    if not tiff_path.is_absolute():
        tiff_path = (tiff_base_dir / tiff_path).resolve()

    if not tiff_path.exists():
        return ('error', f"TIFF not found: {tiff_path}")

    # output flac file path (named by tiff stem)
    out_flac_path = out_flac_dir / (tiff_path.stem + ".flac")
    expected_sha = entry.get('flac_sha256') or entry.get('sha256') or entry.get('flac_sha')

    # Resume check: if file exists and checksum matches, skip
    if out_flac_path.exists() and resume:
        try:
            cur_sha = sha256_of_streaming_file(out_flac_path)
            if expected_sha and cur_sha == expected_sha:
                return ('skipped', f"{out_flac_path.name} (already present & checksum ok)")
            # else continue to re-extract (overwrite)
        except Exception as e:
            print("⚠️  checksum failed during resume check:", e)

    try:
        # Extract flac bytes from tiff (streamed)
        extract_flac_from_tiff_stream(tiff_path, out_flac_path, memmap=True)
        # Verify sha
        cur_sha = sha256_of_streaming_file(out_flac_path)
        if expected_sha and cur_sha != expected_sha:
            return ('mismatch', f"Checksum mismatch for {out_flac_path.name}: expected {expected_sha}, got {cur_sha}")
        return ('ok', str(out_flac_path))
    except Exception as e:
        return ('error', f"Extraction error for {tiff_path}: {e}")

def reconstruct_wav_for_source(source_entry: dict, out_flac_dir: Path, out_wav_dir: Path, use_ffmpeg_if_available=True):
    """
    Given a manifest 'source' entry with 'chunks' list that includes tiff_path & start_time_seconds,
    reconstruct a single WAV by streaming each corresponding .flac in order and writing sequentially.
    The implementation decodes each FLAC to PCM using soundfile in streaming manner and appends into one WAV.
    """
    chunks = sorted(source_entry.get('chunks', []), key=lambda x: x.get('start_time_seconds', 0))
    if not chunks:
        return ('error', 'No chunks for this source')

    # Prepare output wav path (use source filename stem)
    src_file = Path(source_entry.get('source_file', 'unknown_source'))
    out_wav_dir.mkdir(parents=True, exist_ok=True)
    out_wav_path = out_wav_dir / (src_file.stem + "_reconstructed.wav")

    # If ffmpeg is available and user prefers it, we could use it to concat decoded wavs - but we'll do pure-python streaming
    # We'll open soundfile writer with parameters matching first chunk's FLAC sample rate & channels
    # Read metadata from first flac to set writer
    first_chunk = chunks[0]
    first_flac = out_flac_dir / (Path(first_chunk.get('tiff')).stem + ".flac")
    if not first_flac.exists():
        return ('error', f"Missing first FLAC at {first_flac}")

    # Determine sample rate and channels
    with sf.SoundFile(str(first_flac)) as sf1:
        sr = sf1.samplerate
        channels = sf1.channels
        subtype = 'PCM_16'  # output wav subtype; adjust if you want higher bit depth

    # Open output file for writing (stream)
    with sf.SoundFile(str(out_wav_path), mode='w', samplerate=sr, channels=channels, subtype=subtype) as out_sf:
        # iterate chunks
        for c in chunks:
            flac_name = Path(c.get('tiff')).stem + ".flac"
            flac_path = out_flac_dir / flac_name
            if not flac_path.exists():
                return ('error', f"Missing FLAC chunk {flac_path}")
            # stream read and write
            with sf.SoundFile(str(flac_path), mode='r') as inf:
                # If sample rate differs, resample (rare). Do simple check.
                if inf.samplerate != sr or inf.channels != channels:
                    # Use librosa for resampling a chunk in blocks (less memory safe) — but such mismatch should be uncommon.
                    data = inf.read(dtype='float32')
                    # convert channels if needed
                    if data.ndim > 1 and channels == 1:
                        data = data.mean(axis=1)
                    if inf.samplerate != sr:
                        data = librosa.resample(data.T, orig_sr=inf.samplerate, target_sr=sr).T
                    out_sf.write(data)
                else:
                    for block in inf.blocks(blocksize=CHUNK_READ_BLOCK, dtype='float32'):
                        out_sf.write(block)
    return ('ok', str(out_wav_path))

def main():
    parser = argparse.ArgumentParser(description="Extract FLAC from TIFFs and optionally reconstruct WAVs.")
    parser.add_argument("--input-dir", default=str(INPUT_TIFF_DIR), help="Directory containing TIFFs and manifest.json")
    parser.add_argument("--out-flac-dir", default=str(OUT_FLAC_DIR), help="Where to write extracted FLAC files")
    parser.add_argument("--out-wav-dir", default=str(OUT_WAV_DIR), help="Where to write reconstructed WAVs")
    parser.add_argument("--workers", type=int, default=DEFAULT_WORKERS, help="Number of parallel workers for extraction")
    parser.add_argument("--resume", action='store_true', help="Skip already-extracted chunks whose checksum matches manifest")
    parser.add_argument("--reconstruct", action='store_true', help="After extraction, reconstruct WAVs per source using manifest")
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    out_flac_dir = Path(args.out_flac_dir)
    out_wav_dir = Path(args.out_wav_dir)
    workers = max(1, args.workers)

    manifest_path = input_dir / "manifest.json"
    try:
        manifest = load_manifest(manifest_path)
    except Exception as e:
        print("Fatal: cannot load manifest:", e)
        sys.exit(1)

    # Build flattened list of chunk entries (each with tiff path & expected sha)
    all_entries = []
    for file_entry in manifest.get('files', []):
        for chunk in file_entry.get('chunks', []):
            # chunk may have 'tiff' or 'tiff_path' keys
            tiff_key = chunk.get('tiff') or chunk.get('tiff_path') or chunk.get('tiffPath')
            if not tiff_key:
                continue
            entry = {
                'tiff': tiff_key,
                'flac_sha256': chunk.get('flac_sha256') or chunk.get('sha256'),
                'source_file': file_entry.get('source_file'),
                'start_time_seconds': chunk.get('start_time_seconds')
            }
            all_entries.append(entry)

    if not all_entries:
        print("No chunks found in manifest.")
        sys.exit(0)

    out_flac_dir.mkdir(parents=True, exist_ok=True)

    # Parallel extraction using threads (I/O bound)
    print(f"Starting extraction of {len(all_entries)} chunks with {workers} workers...")
    results = []
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = {ex.submit(extract_single_entry, ent, out_flac_dir, input_dir, args.resume): ent for ent in all_entries}
        for fut in tqdm(as_completed(futures), total=len(futures), desc="Extracting chunks"):
            ent = futures[fut]
            try:
                status, info = fut.result()
                results.append((status, info, ent))
                if status == 'ok':
                    pass  # ok
                elif status == 'skipped':
                    pass
                elif status == 'mismatch':
                    print("⚠️  Checksum mismatch:", info)
                else:
                    print("⚠️  Extraction problem:", info)
            except Exception as e:
                print("⚠️  Worker exception:", e)

    # Summary
    ok_count = sum(1 for r in results if r[0] == 'ok')
    skip_count = sum(1 for r in results if r[0] == 'skipped')
    err_count = sum(1 for r in results if r[0] in ('mismatch','error'))
    print(f"\nExtraction complete — ok: {ok_count}, skipped: {skip_count}, errors/mismatches: {err_count}")

    # Optional reconstruction
    if args.reconstruct:
        print("\nReconstructing per-source WAVs (streaming)...")
        for file_entry in manifest.get('files', []):
            status, info = reconstruct_wav_for_source(file_entry, out_flac_dir, out_wav_dir)
            if status == 'ok':
                print("Reconstructed WAV:", info)
            else:
                print("Reconstruction problem:", info)

    print("\nAll finished. Extracted FLACs:", out_flac_dir)
    if args.reconstruct:
        print("Reconstructed WAVs:", out_wav_dir)
    print("Tip: use ffplay or ffmpeg to play/convert the recovered .flac or .wav files")
    return

if __name__ == "__main__":
    main()
