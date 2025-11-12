#!/usr/bin/env python3
"""
extract_and_reconstruct_v2.py (patched manifest parsing)

Extract embedded FLAC bytes from TIFFs created by batch_audio_to_tiff_v2.py,
verify against manifest.json, and optionally reconstruct contiguous WAVs.

This version contains a robust manifest scanner that will find chunk entries
even if the manifest format varies slightly (different key names or structure).
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
import traceback

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
    out_flac_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        arr = imread(str(tiff_path), key=1, memmap=memmap)
        flat = np.ravel(arr)
        with out_flac_path.open('wb') as out_f:
            total = flat.size
            idx = 0
            block = CHUNK_READ_BLOCK
            while idx < total:
                end = idx + min(block, total - idx)
                chunk = flat[idx:end].tobytes()
                out_f.write(chunk)
                idx = end
    except Exception as e:
        # fallback: read whole array then write
        print(f"⚠️  memmap/read fallback for {tiff_path.name}: {e}")
        arr_full = imread(str(tiff_path), key=1)
        flat = np.ravel(arr_full)
        out_flac_path.write_bytes(flat.tobytes())

def extract_single_entry(entry: dict, out_flac_dir: Path, tiff_base_dir: Path, resume=True):
    tiff_rel = entry.get('tiff') or entry.get('tiff_path') or entry.get('tiffPath') or entry.get('tiffFile') or entry.get('tiff_file')
    if not tiff_rel:
        return ('error', f"No tiff path in manifest entry: {entry}")
    tiff_path = Path(tiff_rel)
    if not tiff_path.is_absolute():
        tiff_path = (tiff_base_dir / tiff_path).resolve()

    if not tiff_path.exists():
        return ('error', f"TIFF not found: {tiff_path}")

    out_flac_path = out_flac_dir / (tiff_path.stem + ".flac")
    expected_sha = entry.get('flac_sha256') or entry.get('sha256') or entry.get('flac_sha') or entry.get('sha')

    if out_flac_path.exists() and resume:
        try:
            cur_sha = sha256_of_streaming_file(out_flac_path)
            if expected_sha and cur_sha == expected_sha:
                return ('skipped', f"{out_flac_path.name} (already present & checksum ok)")
        except Exception as e:
            print("⚠️  checksum failed during resume check:", e)

    try:
        extract_flac_from_tiff_stream(tiff_path, out_flac_path, memmap=True)
        cur_sha = sha256_of_streaming_file(out_flac_path)
        if expected_sha and cur_sha != expected_sha:
            return ('mismatch', f"Checksum mismatch for {out_flac_path.name}: expected {expected_sha}, got {cur_sha}")
        return ('ok', str(out_flac_path))
    except Exception as e:
        tb = traceback.format_exc()
        return ('error', f"Extraction error for {tiff_path}: {e}\n{tb}")

def reconstruct_wav_for_source(source_entry: dict, out_flac_dir: Path, out_wav_dir: Path, use_ffmpeg_if_available=True):
    chunks = sorted(source_entry.get('chunks', []), key=lambda x: x.get('start_time_seconds', 0))
    if not chunks:
        return ('error', 'No chunks for this source')
    src_file = Path(source_entry.get('source_file', 'unknown_source'))
    out_wav_dir.mkdir(parents=True, exist_ok=True)
    out_wav_path = out_wav_dir / (src_file.stem + "_reconstructed.wav")
    first_chunk = chunks[0]
    first_flac = out_flac_dir / (Path(first_chunk.get('tiff') or first_chunk.get('tiff_path') or first_chunk.get('tiffPath')).stem + ".flac")
    if not first_flac.exists():
        return ('error', f"Missing first FLAC at {first_flac}")
    with sf.SoundFile(str(first_flac)) as sf1:
        sr = sf1.samplerate
        channels = sf1.channels
        subtype = 'PCM_16'
    with sf.SoundFile(str(out_wav_path), mode='w', samplerate=sr, channels=channels, subtype=subtype) as out_sf:
        for c in chunks:
            tiff_str = c.get('tiff') or c.get('tiff_path') or c.get('tiffPath') or c.get('tiffFile') or c.get('tiff_file')
            flac_name = Path(tiff_str).stem + ".flac"
            flac_path = out_flac_dir / flac_name
            if not flac_path.exists():
                return ('error', f"Missing FLAC chunk {flac_path}")
            with sf.SoundFile(str(flac_path), mode='r') as inf:
                if inf.samplerate != sr or inf.channels != channels:
                    data = inf.read(dtype='float32')
                    if data.ndim > 1 and channels == 1:
                        data = data.mean(axis=1)
                    if inf.samplerate != sr:
                        data = librosa.resample(data.T, orig_sr=inf.samplerate, target_sr=sr).T
                    out_sf.write(data)
                else:
                    for block in inf.blocks(blocksize=CHUNK_READ_BLOCK, dtype='float32'):
                        out_sf.write(block)
    return ('ok', str(out_wav_path))

# -------------------
# Robust manifest scanning
# -------------------
def find_chunk_like_objects(manifest: dict):
    """
    Return list of normalized chunk dicts:
      {'tiff': <path str>, 'flac_sha256': <maybe>, 'source_file': <maybe>, 'start_time_seconds': <maybe>}
    This function is tolerant to different manifest shapes.
    """
    found = []

    # Helper to normalize a candidate dict or string
    def normalize_candidate(candidate, source_file=None):
        if candidate is None:
            return None
        if isinstance(candidate, str):
            if candidate.lower().endswith(('.tif', '.tiff')):
                return {'tiff': candidate, 'source_file': source_file}
            else:
                return None
        if isinstance(candidate, dict):
            # find any key that looks like a tiff path
            tiff_val = None
            for k, v in candidate.items():
                if 'tiff' in k.lower() or (isinstance(v, str) and v.lower().endswith(('.tif', '.tiff'))):
                    # prefer explicit keys containing 'tiff'
                    tiff_val = v if isinstance(v, str) else None
                    # if v is not a string maybe the key name itself is the path in some odd manifests -> skip
                    if tiff_val:
                        break
            if not tiff_val:
                # secondary search: any string value that ends with .tif/.tiff
                for k, v in candidate.items():
                    if isinstance(v, str) and v.lower().endswith(('.tif', '.tiff')):
                        tiff_val = v
                        break
            # if no tiff found, try to find nested chunk-like dicts or list inside
            if tiff_val:
                normalized = {
                    'tiff': tiff_val,
                    'flac_sha256': candidate.get('flac_sha256') or candidate.get('sha256') or candidate.get('flac_sha') or candidate.get('sha'),
                    'source_file': source_file,
                    'start_time_seconds': candidate.get('start_time_seconds') or candidate.get('start') or candidate.get('start_time') or candidate.get('start_seconds')
                }
                return normalized
            # else not a chunk-like dict
            return None
        return None

    # 1) Common pattern: manifest['files'] -> list of file entries -> each file entry has 'chunks'
    files = manifest.get('files')
    if isinstance(files, list):
        for f in files:
            source_file = f.get('source_file') or f.get('source') or f.get('input_file')
            chunks = f.get('chunks') or f.get('entries') or f.get('pieces')
            if isinstance(chunks, list) and len(chunks) > 0:
                for c in chunks:
                    n = normalize_candidate(c, source_file=source_file)
                    if n:
                        found.append(n)
                    else:
                        # try if c itself is a string path
                        if isinstance(c, str) and c.lower().endswith(('.tif', '.tiff')):
                            found.append({'tiff': c, 'source_file': source_file})
            else:
                # maybe chunks are stored under odd keys in this file entry
                # scan entire file entry values for chunk-like dicts
                for v in f.values():
                    if isinstance(v, (list, tuple)):
                        for item in v:
                            n = normalize_candidate(item, source_file=source_file)
                            if n:
                                found.append(n)
                    else:
                        n = normalize_candidate(v, source_file=source_file)
                        if n:
                            found.append(n)

    # 2) Top-level 'chunks' (some manifests may have direct chunk lists)
    top_chunks = manifest.get('chunks') or manifest.get('entries')
    if isinstance(top_chunks, list):
        for c in top_chunks:
            n = normalize_candidate(c, source_file=None)
            if n:
                found.append(n)

    # 3) Last resort: scan all dicts recursively for any string ending with .tif/.tiff
    if not found:
        def walk_and_collect(obj, source_file_hint=None):
            if isinstance(obj, dict):
                # if dict itself looks like a chunk, normalize
                n = normalize_candidate(obj, source_file=source_file_hint)
                if n:
                    found.append(n)
                    return
                for k, v in obj.items():
                    # pass down a source_file hint if we find one
                    new_hint = source_file_hint
                    if k.lower() in ('source_file', 'source', 'input_file', 'sourcefile'):
                        if isinstance(v, str):
                            new_hint = v
                    walk_and_collect(v, source_file_hint=new_hint)
            elif isinstance(obj, list):
                for item in obj:
                    walk_and_collect(item, source_file_hint)
            elif isinstance(obj, str):
                if obj.lower().endswith(('.tif', '.tiff')):
                    found.append({'tiff': obj, 'source_file': source_file_hint})
        walk_and_collect(manifest, source_file_hint=None)

    # Deduplicate by (tiff, start_time_seconds)
    seen = set()
    normalized = []
    for e in found:
        key = (e.get('tiff'), e.get('start_time_seconds'))
        if key not in seen:
            seen.add(key)
            normalized.append(e)
    return normalized

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

    # Use robust scanner to find chunk entries
    all_entries = find_chunk_like_objects(manifest)

    if not all_entries:
        print("No chunks found in manifest (after robust scan). Here is a brief dump of manifest keys to help debug:")
        print("Top-level keys:", list(manifest.keys()))
        # print a short sample to help user (do not dump huge manifests)
        sample = json.dumps({k: manifest[k] for k in list(manifest.keys())[:5]}, indent=2, default=str)
        print("Manifest sample (first 5 keys):", sample)
        sys.exit(0)

    # Add optional source_file if missing (best-effort)
    for e in all_entries:
        if 'source_file' not in e or not e['source_file']:
            e['source_file'] = manifest.get('source_file') or None

    out_flac_dir.mkdir(parents=True, exist_ok=True)

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
                    pass
                elif status == 'skipped':
                    pass
                elif status == 'mismatch':
                    print("⚠️  Checksum mismatch:", info)
                else:
                    print("⚠️  Extraction problem:", info)
            except Exception as e:
                print("⚠️  Worker exception:", e)

    ok_count = sum(1 for r in results if r[0] == 'ok')
    skip_count = sum(1 for r in results if r[0] == 'skipped')
    err_count = sum(1 for r in results if r[0] in ('mismatch','error'))
    print(f"\nExtraction complete — ok: {ok_count}, skipped: {skip_count}, errors/mismatches: {err_count}")

    # Optional reconstruction
    if args.reconstruct:
        print("\nReconstructing per-source WAVs (streaming)...")
        # Here we try to map back to the manifest 'files' structure for reconstruction.
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
