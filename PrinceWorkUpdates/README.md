# 🎵 Audio-to-TIFF Archival System

> **Bit-perfect archival of audio files inside TIFF image containers with lossless FLAC encoding**

A robust Python toolkit for archiving large audio files (multi-hour or multi-day recordings) by embedding losslessly compressed FLAC audio into multi-page TIFF files. Each TIFF contains a visual mel-spectrogram preview and the embedded audio bytes, enabling both human-readable identification and bit-perfect reconstruction.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Why TIFF + FLAC?](#why-tiff--flac)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Storage & Performance](#storage--performance)
- [File Structure](#file-structure)
- [Usage](#usage)
- [Integrity & Verification](#integrity--verification)
- [Advanced Usage](#advanced-usage)
- [Limitations](#limitations)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)

---

## 🎯 Overview

This repository contains two main tools designed for efficient, bit-perfect archival of audio data:

### **`batch_audio_to_tiff.py`**
Splits large audio files into manageable chunks, encodes each chunk losslessly into FLAC, generates a mel-spectrogram preview image, and embeds the FLAC bytes into a multi-page TIFF (preview image + embedded bytes). Produces a `manifest.json` describing all chunks and checksums.

### **`extract_flac_from_tiff.py`**
Extracts the embedded FLAC bytes from the TIFFs (streaming, memory-mapped where possible), verifies SHA-256 checksums against `manifest.json`, and optionally reconstructs original WAVs (streaming decode + append) per source file.

**Key Design Principles:**
- ✅ **Bit-perfect reconstruction** — Lossless FLAC encoding ensures exact audio recovery
- ✅ **Streaming I/O** — Handles multi-day recordings without loading entire files into memory
- ✅ **Chunked processing** — Default 6-hour chunks for manageable file sizes
- ✅ **Integrity verification** — SHA-256 checksums for every embedded chunk
- ✅ **Human-readable preview** — Mel-spectrogram images for quick identification

---

## 🤔 Why TIFF + FLAC?

### **TIFF (Tagged Image File Format)**

**Why TIFF?**
- TIFF is a robust, well-supported container capable of storing multiple pages (images) and arbitrary binary blobs in image pages
- Using TIFF allows a single file to contain a visual preview (mel-spectrogram) and the raw embedded audio bytes (as a second page stored as a uint8 array)
- TIFF supports large files (bigtiff when needed) and is supported widely across tools and libraries (e.g., `tifffile`, `libtiff`, image editors)

**Advantages:**
- 🖼️ Human-readable preview (spectrogram) for quick identification
- 📦 Embedding binary bytes as an image page keeps the archive portable and easy to index/search via standard image tools
- 📝 Keeps metadata (JSON) in TIFF image descriptions for traceability

### **FLAC (Free Lossless Audio Codec)**

**Why FLAC?**
- FLAC is lossless and well-supported: decoding yields bit-for-bit identical PCM back from the FLAC stream
- It reduces storage compared to raw PCM WAV while preserving full fidelity
- Very fast encode/decode with libraries (`libFLAC` / `soundfile`) and supports streaming

**Role in the pipeline:**
- Chunks are encoded to FLAC to compress audio without loss; these FLAC bytes are what get embedded into TIFF pages
- A SHA-256 checksum of each FLAC chunk is stored in `manifest.json` to guarantee integrity

---

## ✨ Features

- 🔄 **Lossless Conversion** — Bit-perfect audio reconstruction
- 📊 **Visual Previews** — Mel-spectrogram images for each chunk
- 🔒 **Integrity Checks** — SHA-256 checksums for verification
- ⚡ **Streaming Processing** — Memory-efficient handling of large files
- 🔀 **Chunked Archival** — Splits large files into manageable pieces
- 🚀 **Parallel Processing** — Multi-core support for faster processing
- 📝 **Manifest Tracking** — JSON manifest with metadata and checksums
- 🛡️ **Resilient Extraction** — Resume capability for failed extractions

---

## 📦 Installation

### Prerequisites

- Python 3.7+
- `ffmpeg` (optional but recommended for faster splitting)

### Install Dependencies

```bash
pip install numpy librosa soundfile tifffile tqdm
```

### Install FFmpeg (Optional)

**Windows:**
- Download from [ffmpeg.org](https://ffmpeg.org/download.html)
- Add to system PATH

**Linux:**
```bash
sudo apt-get install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

---

## 🚀 Quick Start

### 1. Convert Audio Files to TIFF

```bash
python batch_audio_to_tiff.py --input "/path/to/audios" --output "/path/to/out_tiffs"
```

**Options:**
- `--input` — Directory containing audio files (WAV, MP3, FLAC, etc.)
- `--output` — Output directory for TIFF files and manifest
- `--keep-temp` — Retain intermediate WAV/FLAC files for debugging

### 2. Extract FLACs and Reconstruct WAVs

```bash
python extract_flac_from_tiff.py --input-dir "/path/to/out_tiffs" --out-flac-dir "./recovered_flacs" --reconstruct
```

**Options:**
- `--input-dir` — Directory containing TIFF files and manifest.json
- `--out-flac-dir` — Output directory for extracted FLAC files
- `--reconstruct` — Reconstruct original WAV files from FLAC chunks
- `--resume` — Skip already extracted chunks

---

## 🔧 How It Works

### **Audio → Image Pipeline**

1. **Chunking**: Large audio files are split into fixed-duration chunks (default: 6 hours)
2. **FLAC Encoding**: Each chunk is encoded losslessly to FLAC format
3. **Spectrogram Generation**: A mel-spectrogram preview is generated from a downsampled version
4. **TIFF Creation**: 
   - Page 1: Mel-spectrogram preview image
   - Page 2: Raw FLAC bytes embedded as uint8 array
5. **Checksum Calculation**: SHA-256 hash computed for each FLAC chunk
6. **Manifest Generation**: JSON manifest records all chunks, checksums, and metadata

### **Image → Audio Pipeline**

1. **TIFF Reading**: Memory-mapped reading of TIFF pages (streaming)
2. **FLAC Extraction**: Raw bytes extracted from second TIFF page
3. **Checksum Verification**: SHA-256 compared against manifest.json
4. **FLAC Decoding**: Lossless decode to PCM samples
5. **WAV Reconstruction**: Concatenate decoded chunks in order to reconstruct original file

### **Why It's "Perfect"**

Because the FLAC is lossless and the pipeline embeds raw bytes, the reconstructed audio is **bit-for-bit identical** to the encoded FLAC stream. When decoded, the PCM samples match the originals (modulo any metadata changes). The `manifest.json` + SHA-256 protects against bit-rot or tampering.

---

## 💾 Storage & Performance

### **Storage Comparison**

**Example: 1 hour stereo @ 44.1 kHz, 16-bit PCM**

| Format | Size | Notes |
|--------|------|-------|
| Raw WAV | ~635 MB | `44,100 samples/s × 3600 s × 2 channels × 2 bytes/sample` |
| FLAC | ~350 MB | ~55% of original (depends on audio complexity) |
| TIFF (embedded) | ~352 MB | FLAC bytes + minimal TIFF headers + preview image |

### **Size Optimization Strategies**

1. **Chunking**: Splitting into fixed-duration chunks (6 hours) bounds maximum working set
2. **Streaming I/O**: Uses `soundfile` block reads/writes and memory-mapping to prevent full-file RAM loads
3. **FLAC Compression**: Lossless compression reduces storage by ~40-60% without sacrificing fidelity
4. **Temporary File Cleanup**: Intermediate files deleted by default (use `--keep-temp` to retain)

### **Performance Features**

- **Parallel Processing**: Bounded worker processes for chunk processing
- **Memory-Mapped I/O**: Uses `numpy.memmap` and `tifffile` with `memmap=True`
- **FFmpeg Integration**: Fast, optimized splitting when available
- **Streaming Decode**: Reconstructs WAVs by streaming decode + append

---

## 📁 File Structure

### **Output Directory Layout**

```
out_tiffs/
├── manifest.json          # Chunk metadata and checksums
├── temp/                  # Temporary files (deleted by default)
├── <source>_chunk_000000.tiff
├── <source>_chunk_000001.tiff
└── ...
```

### **Manifest Structure**

```json
{
  "input_dir": "/path/to/input",
  "chunk_seconds": 21600,
  "files": [
    {
      "source_file": "/path/to/longrecording.wav",
      "chunks": [
        {
          "chunk_id": "chunk_000000",
          "tiff_path": "chunk_000000.tiff",
          "flac_sha256": "abc123...",
          "start_time_seconds": 0,
          "size_bytes": 12345678
        }
      ]
    }
  ]
}
```

---

## 📖 Usage

### **Producing TIFFs**

```bash
# Basic usage
python batch_audio_to_tiff.py --input "/path/to/audios" --output "/path/to/out_tiffs"

# Keep temporary files for debugging
python batch_audio_to_tiff.py --input "/path/to/audios" --output "/path/to/out_tiffs" --keep-temp
```

### **Extracting FLACs and Reconstructing WAVs**

```bash
# Extract FLACs only
python extract_flac_from_tiff.py --input-dir "/path/to/out_tiffs" --out-flac-dir "./recovered_flacs"

# Extract FLACs and reconstruct WAVs
python extract_flac_from_tiff.py --input-dir "/path/to/out_tiffs" --out-flac-dir "./recovered_flacs" --reconstruct

# Resume extraction (skip already extracted chunks)
python extract_flac_from_tiff.py --input-dir "/path/to/out_tiffs" --out-flac-dir "./recovered_flacs" --reconstruct --resume
```

---

## 🔒 Integrity & Verification

### **Checksum Verification**

Every embedded FLAC chunk receives a **SHA-256 checksum** that is:
- Computed during encoding
- Stored in `manifest.json`
- Verified during extraction

### **Verification Process**

During extraction, the tool:
1. Extracts FLAC bytes from TIFF
2. Computes SHA-256 of recovered FLAC
3. Compares against manifest.json
4. Reports mismatches if integrity check fails

### **Best Practices**

- ✅ Store `manifest.json` separately or sign it cryptographically
- ✅ Use checksums to verify archival integrity over time
- ✅ Consider storing checksums in a separate ledger for tamper-evidence
- ✅ Use `--resume` to skip already verified chunks during re-extraction

---

## 🎛️ Advanced Usage

### **Performance Tuning**

- **Increase Workers**: Adjust `WORKERS` constant in scripts if you have sufficient CPU and I/O bandwidth
- **FFmpeg Usage**: Prefer `ffmpeg` for splitting large or odd container files
- **Network Storage**: Use local temp storage and move final TIFFs to network storage

### **Long-Term Archival**

- Store TIFFs on durable storage (cold storage backups)
- Optionally sign `manifest.json` or store checksums separately
- Consider `bigtiff` if files may exceed 4GB limit

### **Metadata & Search**

- TIFF description field includes JSON with sample rate and preview metadata
- Spectrogram images enable quick visual browsing in image galleries
- Index TIFF descriptions for search UI integration

---

## ⚠️ Limitations

### **Known Limitations**

1. **Spectrogram is Preview-Only**: The mel-spectrogram is not used for reconstruction; it's a human-friendly preview
2. **Chunk Boundaries**: When recombining chunks, ensure exact order and matching sample rates & channel counts
3. **FLAC Container Quirks**: `ffmpeg` segmenting with `-c copy` may not produce perfectly aligned FLAC files for all input types
4. **TIFF Page Formats**: The implementation embeds raw uint8 arrays as a page — tools expecting only images may mis-handle the second page

### **Gotchas**

- Chunk boundaries must be maintained for perfect reconstruction
- Use same decoding library (FLAC decode is deterministic)
- Don't alter embedded bytes — any modification will break checksums

---

## 🧪 Testing

### **Round-Trip Test**

Test bit-perfect reconstruction:

```bash
# 1. Convert a short WAV to TIFF
python batch_audio_to_tiff.py --input "./test_audio.wav" --output "./test_output"

# 2. Extract and reconstruct
python extract_flac_from_tiff.py --input-dir "./test_output" --out-flac-dir "./test_recovered" --reconstruct

# 3. Compare original and reconstructed WAV (byte-by-byte or sample-by-sample)
```

### **Checksum Test**

Verify integrity checking:

```bash
# 1. Manually alter one TIFF's embedded bytes
# 2. Run extraction
python extract_flac_from_tiff.py --input-dir "./out_tiffs" --out-flac-dir "./recovered"
# 3. Confirm mismatch is reported
```

### **Large-File Stress Test**

Test memory efficiency:

```bash
# Process a multi-hour file and monitor RAM usage
python batch_audio_to_tiff.py --input "./long_recording.wav" --output "./out_tiffs"
# Verify temp folder is removed (unless --keep-temp)
```

---

## 📂 Project Structure

```
.
├── README.md
├── requirements.txt
├── batch_audio_to_tiff.py          # Main encoding script
├── extract_flac_from_tiff.py        # Main extraction script
├── audios/                          # Input audio files
├── out_tiffs/                       # Output TIFF files (gitignored)
│   ├── manifest.json
│   ├── tmp/                         # Temporary files (gitignored)
│   └── *.tiff
├── recovered_flacs/                 # Extracted FLAC files
└── examples/                        # Example audio files (optional)
```

**Note:** Add `out_tiffs/` and `out_tiffs/tmp/` to `.gitignore`.

---

## 🔮 Future Enhancements

### **Planned Features**

- [ ] `--sign-manifest` option to cryptographically sign the manifest
- [ ] Support embedding multiple metadata fields (speaker, location, tags) inside TIFF description
- [ ] Indexer that stores spectrogram thumbnails and timestamps into SQLite database for quick search
- [ ] Optional `bigtiff` flag to support extremely large embedded files
- [ ] Web UI for browsing and searching archived audio
- [ ] Batch verification tool for checking integrity of entire archives

---

## 👤 Contributing

Created by **Prince** — part of the PrinceWorkUpdates project.

For issues, questions, or contributions, please open an issue or submit a pull request.

---

## 📄 License

[N/A]

---

## 🙏 Acknowledgments

- `librosa` for audio processing and spectrogram generation
- `soundfile` for efficient audio I/O
- `tifffile` for TIFF file handling
- `ffmpeg` for fast audio splitting (when available)

---

