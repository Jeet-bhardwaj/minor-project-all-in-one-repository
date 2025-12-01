# AudioImageCarrier Backend - Architecture Documentation

## 🏗️ Project Architecture Overview

```
AudioImageCarrier-Backend/
│
├── 📁 api/                          # Vercel Serverless Entry Points
│   ├── index.py                     # Main ASGI handler for Vercel
│   └── test.py                      # Minimal test endpoint
│
├── 📁 app/                          # Core Application (FastAPI)
│   ├── __init__.py
│   ├── main.py                      # 🚀 FastAPI Application Entry Point
│   │
│   ├── 📁 api/                      # API Layer (Routes & Dependencies)
│   │   ├── __init__.py
│   │   ├── dependencies.py          # Dependency injection (API key validation)
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── encode.py            # POST /api/v1/encode endpoint
│   │       └── decode.py            # POST /api/v1/decode endpoint
│   │
│   ├── 📁 core/                     # Core Business Logic
│   │   ├── __init__.py
│   │   ├── config.py                # Configuration management (Pydantic Settings)
│   │   ├── security.py              # API key validation
│   │   └── audio_processor.py       # Audio ↔ Image conversion engine
│   │
│   ├── 📁 models/                   # Data Models (Pydantic)
│   │   ├── __init__.py
│   │   ├── requests.py              # Request schemas (EncodeRequest, DecodeRequest)
│   │   └── responses.py             # Response schemas (EncodeResponse, DecodeResponse)
│   │
│   ├── 📁 services/                 # Business Logic Layer
│   │   ├── __init__.py
│   │   ├── encode_service.py        # Encode orchestration logic
│   │   └── decode_service.py        # Decode orchestration logic
│   │
│   └── 📁 utils/                    # Utility Functions
│       ├── __init__.py
│       ├── file_handler.py          # File operations (temp files, cleanup)
│       └── validators.py            # Input validation helpers
│
├── 📁 tests/                        # Unit & Integration Tests
│   ├── __init__.py
│   ├── conftest.py                  # Pytest configuration & fixtures
│   ├── test_encode.py               # Encode endpoint tests
│   └── test_decode.py               # Decode endpoint tests
│
├── 📁 scripts/                      # Original Encryption Script
│   └── audio_image_chunked.py       # Original standalone script
│
├── 📁 storage/                      # Runtime Storage
│   ├── uploads/                     # Uploaded audio files (temporary)
│   └── temp/                        # Processing temporary files
│
├── 📁 docs/                         # Documentation
│   ├── API_DOCUMENTATION.md
│   ├── USER_GUIDE.md
│   └── WORKFLOW.md
│
├── 📄 requirements.txt              # Python dependencies
├── 📄 vercel.json                   # Vercel deployment configuration
├── 📄 Dockerfile                    # Docker container definition
├── 📄 docker-compose.yml            # Docker orchestration
├── 📄 .env.example                  # Environment variables template
├── 📄 API_USAGE_GUIDE.md            # Complete API usage guide
└── 📄 README.md                     # Project overview
```

---

## 🔄 Request Flow Architecture

### Encode Flow (Audio → Encrypted Images)

```
User Request
    ↓
[1] POST /api/v1/encode
    ↓
[2] app/api/routes/encode.py
    ├── Validate API Key (dependencies.py)
    ├── Validate request data (Pydantic models)
    ├── Check file type & size (validators.py)
    └── Save uploaded file (file_handler.py)
    ↓
[3] app/services/encode_service.py
    ├── Read audio file
    ├── Validate master_key format
    └── Call audio processor
    ↓
[4] app/core/audio_processor.py
    ├── Derive encryption key from master_key + user_id (HKDF)
    ├── Optional: Compress audio data (zstd)
    ├── Encrypt data (AES-256-GCM)
    ├── Convert encrypted bytes to PNG images
    └── Create metadata.json
    ↓
[5] app/utils/file_handler.py
    ├── Create ZIP file
    ├── Add PNG images to ZIP
    ├── Add metadata.json to ZIP
    └── Return ZIP as response
    ↓
[6] Response: encrypted_images.zip
    └── Cleanup temporary files
```

### Decode Flow (Encrypted Images → Audio)

```
User Request
    ↓
[1] POST /api/v1/decode
    ↓
[2] app/api/routes/decode.py
    ├── Validate API Key (dependencies.py)
    ├── Validate request data (Pydantic models)
    └── Save uploaded ZIP file (file_handler.py)
    ↓
[3] app/services/decode_service.py
    ├── Extract ZIP file
    ├── Read metadata.json
    ├── Load PNG images
    └── Call audio processor
    ↓
[4] app/core/audio_processor.py
    ├── Derive decryption key from master_key + user_id (HKDF)
    ├── Convert PNG images to encrypted bytes
    ├── Decrypt data (AES-256-GCM)
    └── Optional: Decompress audio data (zstd)
    ↓
[5] app/utils/file_handler.py
    ├── Save recovered audio file
    └── Return audio file as response
    ↓
[6] Response: recovered_audio.mp3
    └── Cleanup temporary files
```

---

## 🧩 Component Details

### 1. **API Entry Point** (`api/index.py`)

**Purpose**: Vercel serverless function handler

```python
# Adds parent directory to Python path
# Imports FastAPI app from app.main
# Exports for Vercel deployment
```

**Key Features**:
- Path manipulation for Vercel environment
- ASGI app export
- Serverless compatibility

---

### 2. **FastAPI Application** (`app/main.py`)

**Purpose**: Main application setup and configuration

**Components**:
- FastAPI instance creation
- CORS middleware configuration
- Router registration
- Startup event (directory creation)
- Global exception handler
- Health check endpoints

**Endpoints**:
- `GET /` - API info
- `GET /health` - Health check
- `POST /api/v1/encode` - Encode audio
- `POST /api/v1/decode` - Decode audio

---

### 3. **Configuration** (`app/core/config.py`)

**Purpose**: Centralized configuration management

**Settings (Pydantic BaseSettings)**:
```python
- app_name: "AudioImageCarrier API"
- app_version: "2.0.0"
- api_key: Environment variable (X-API-Key)
- upload_dir: Uploaded files location
- temp_dir: Temporary processing files
- max_upload_size_mb: 500 MB default
- cors_origins: Allowed origins for CORS
- Environment detection (VERCEL flag)
```

**Features**:
- Environment variable loading (.env)
- Auto-detection of Vercel environment
- Dynamic path configuration (/tmp on Vercel)

---

### 4. **Security** (`app/core/security.py`)

**Purpose**: Authentication and authorization

**Functions**:
- `verify_api_key()`: Validates X-API-Key header
- Constant-time comparison (timing attack prevention)
- Raises HTTPException if invalid

**Usage**: Dependency injection in routes

---

### 5. **Audio Processor** (`app/core/audio_processor.py`)

**Purpose**: Core encryption/decryption engine

**Key Functions**:

#### `audio_to_encrypted_images()`
- **Input**: Audio file bytes, user_id, master_key
- **Process**:
  1. Derive encryption key using HKDF
  2. Optional zstd compression
  3. AES-256-GCM encryption
  4. Convert bytes to PNG images
  5. Create metadata
- **Output**: List of PNG images + metadata

#### `decrypt_images_to_audio()`
- **Input**: PNG images, metadata, user_id, master_key
- **Process**:
  1. Derive decryption key using HKDF
  2. Convert PNG images to bytes
  3. AES-256-GCM decryption
  4. Optional zstd decompression
- **Output**: Original audio bytes

**Encryption Details**:
- **Algorithm**: AES-256-GCM (Authenticated Encryption)
- **Key Derivation**: HKDF-SHA256
- **Salt**: Random 16 bytes per encryption
- **Nonce**: Random 12 bytes (GCM standard)
- **Chunk Size**: Configurable (default 50MB)

**Image Format**:
- **Format**: PNG (lossless)
- **Color**: RGB (3 channels)
- **Encoding**: Encrypted bytes mapped to pixel values

---

### 6. **Services Layer**

#### `encode_service.py`
**Purpose**: Orchestrate encode workflow

**Functions**:
- `encode_audio_file()`: Main encode orchestrator
  - File validation
  - Call audio processor
  - Create ZIP archive
  - Error handling
  - Cleanup

#### `decode_service.py`
**Purpose**: Orchestrate decode workflow

**Functions**:
- `decode_audio_file()`: Main decode orchestrator
  - ZIP extraction
  - Metadata parsing
  - Call audio processor
  - Return audio file
  - Error handling
  - Cleanup

---

### 7. **Routes Layer**

#### `encode.py`
**Endpoint**: `POST /api/v1/encode`

**Request** (multipart/form-data):
- `audio_file`: File upload
- `user_id`: String
- `master_key`: 64-char hex string
- `compress`: Boolean (optional)
- `max_chunk_bytes`: Integer (optional)
- `max_width`: Integer (optional)

**Response**: ZIP file (application/zip)

**Dependencies**:
- API key validation
- File type validation
- Size limit check

#### `decode.py`
**Endpoint**: `POST /api/v1/decode`

**Request** (multipart/form-data):
- `encrypted_zip`: File upload
- `user_id`: String
- `master_key`: 64-char hex string
- `output_filename`: String (optional)

**Response**: Audio file (audio/*)

**Dependencies**:
- API key validation
- ZIP file validation

---

### 8. **Models (Pydantic)**

#### `requests.py`
**Data validation schemas**:

```python
class EncodeRequest:
    user_id: str
    master_key: str (64 hex chars)
    compress: bool = True
    max_chunk_bytes: int = 52428800
    max_width: int = 8192

class DecodeRequest:
    user_id: str
    master_key: str (64 hex chars)
    output_filename: Optional[str] = None
```

#### `responses.py`
**Response schemas** (not currently used, for future API versioning)

---

### 9. **Utilities**

#### `file_handler.py`
**Purpose**: File operations and temporary file management

**Functions**:
- `save_upload_file()`: Save UploadFile to disk
- `create_temp_file()`: Create temporary file with UUID
- `cleanup_temp_files()`: Delete temporary files
- `create_zip_archive()`: Create ZIP from files
- `extract_zip_archive()`: Extract ZIP contents

**Features**:
- Automatic cleanup
- UUID-based naming (avoid collisions)
- Path validation
- Exception handling

#### `validators.py`
**Purpose**: Input validation

**Functions**:
- `validate_audio_file()`: Check file extension
- `validate_file_size()`: Check size limits
- `validate_master_key()`: Validate hex format
- `validate_zip_file()`: Check ZIP validity

**Supported Audio Formats**:
- MP3, WAV, M4A, FLAC, OGG, AAC

---

## 🔐 Security Architecture

### Defense Layers

```
┌─────────────────────────────────────┐
│  1. API Key Authentication          │ ← X-API-Key header
├─────────────────────────────────────┤
│  2. Input Validation                │ ← Pydantic models
├─────────────────────────────────────┤
│  3. File Type Validation            │ ← Extension whitelist
├─────────────────────────────────────┤
│  4. File Size Limits                │ ← Max 500 MB
├─────────────────────────────────────┤
│  5. Master Key Validation           │ ← 64 hex chars
├─────────────────────────────────────┤
│  6. Cryptographic Key Derivation    │ ← HKDF-SHA256
├─────────────────────────────────────┤
│  7. Authenticated Encryption        │ ← AES-256-GCM
├─────────────────────────────────────┤
│  8. Temporary File Cleanup          │ ← Auto-delete
└─────────────────────────────────────┘
```

### Encryption Flow

```
Master Key (64 hex chars) + User ID
            ↓
    HKDF-SHA256 Key Derivation
            ↓
    AES-256-GCM Encryption Key
            ↓
    Encrypt Audio Data + Generate Auth Tag
            ↓
    Store: [Salt][Nonce][Ciphertext][Auth Tag]
            ↓
    Convert to PNG Images
```

### Key Features
- **Per-user encryption keys** (user_id + master_key)
- **Random salt per encryption** (prevents rainbow tables)
- **Authenticated encryption** (prevents tampering)
- **Secure key derivation** (HKDF-SHA256)
- **Constant-time comparisons** (prevents timing attacks)

---

## 📦 Dependencies

### Core Framework
- **FastAPI** (0.104.1): Web framework
- **Uvicorn** (0.24.0): ASGI server
- **Pydantic** (2.5.0): Data validation

### Cryptography
- **cryptography** (41.0.7): AES-256-GCM, HKDF
- **zstandard** (0.22.0): Compression

### Image Processing
- **Pillow** (10.1.0): PNG creation
- **NumPy** (1.26.2): Array operations

### Utilities
- **aiofiles** (23.2.1): Async file operations
- **python-multipart** (0.0.6): File uploads

### Testing
- **pytest** (7.4.3): Testing framework
- **httpx** (0.25.2): API testing client

---

## 🚀 Deployment Architecture

### Vercel Serverless

```
GitHub Repository
      ↓
  Git Push
      ↓
Vercel Auto-Deploy
      ↓
Build Process:
  1. Install Python 3.9
  2. Install dependencies (requirements.txt)
  3. Build serverless function (api/index.py)
      ↓
Deployment:
  - Region: Global CDN
  - Runtime: Python 3.9
  - Timeout: 60 seconds
  - Memory: Default
  - Storage: /tmp (ephemeral)
      ↓
Production URL:
  https://minor-project-all-in-one-repository.vercel.app
```

### Environment Variables (Vercel)
```
VERCEL=1                              # Auto-set by Vercel
API_KEY=x7kX9jb8LyzVmJ5Dvy06n9yl...  # Set in dashboard
```

---

## 🧪 Testing Architecture

### Test Structure
```
tests/
├── conftest.py          # Fixtures (test client, test files)
├── test_encode.py       # Encode endpoint tests
└── test_decode.py       # Decode endpoint tests
```

### Test Coverage
- Unit tests for core functions
- Integration tests for API endpoints
- End-to-end encode/decode workflow
- Error handling tests
- Security validation tests

### Run Tests
```bash
pytest                    # Run all tests
pytest -v                 # Verbose output
pytest tests/test_encode.py  # Specific test file
```

---

## 📊 Data Flow Diagram

```
┌──────────┐    Audio File     ┌──────────┐
│  Client  │ ─────────────────→│   API    │
│          │                    │  Route   │
└──────────┘                    └────┬─────┘
                                     │
                                     ↓
                              ┌──────────┐
                              │ Service  │
                              │  Layer   │
                              └────┬─────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ↓              ↓              ↓
            ┌───────────┐  ┌───────────┐  ┌───────────┐
            │Validation │  │   Audio   │  │   File    │
            │  Utils    │  │ Processor │  │  Handler  │
            └───────────┘  └─────┬─────┘  └───────────┘
                                 │
                    ┌────────────┼────────────┐
                    ↓            ↓            ↓
            ┌───────────┐ ┌──────────┐ ┌──────────┐
            │ Compress  │ │ Encrypt  │ │ Convert  │
            │  (zstd)   │ │(AES-GCM) │ │ to PNG   │
            └───────────┘ └──────────┘ └──────────┘
                                 │
                                 ↓
                         ┌───────────────┐
                         │ ZIP Archive   │
                         │ chunk_0.png   │
                         │ chunk_1.png   │
                         │ metadata.json │
                         └───────┬───────┘
                                 │
                                 ↓
                         ┌──────────────┐
                         │   Response   │
                         │   to Client  │
                         └──────────────┘
```

---

## 🎯 Design Patterns Used

1. **Dependency Injection**: API key validation, settings
2. **Service Layer Pattern**: Business logic separation
3. **Repository Pattern**: File operations abstraction
4. **Factory Pattern**: Temporary file creation
5. **Strategy Pattern**: Compression/encryption algorithms
6. **Singleton Pattern**: Configuration settings
7. **Middleware Pattern**: CORS, exception handling

---

## 🔧 Configuration Files

### `vercel.json`
```json
{
  "version": 2,
  "builds": [{"src": "api/index.py", "use": "@vercel/python"}],
  "routes": [{"src": "/(.*)", "dest": "api/index.py"}],
  "env": {"VERCEL": "1"}
}
```

### `.env` (Local Development)
```ini
API_KEY=x7kX9jb8LyzVmJ5Dvy06n9yl0lSxB4Ut9ZidUWAZ0dk
DEBUG=True
ENVIRONMENT=development
```

### `requirements.txt`
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
cryptography==41.0.7
Pillow==10.1.0
numpy==1.26.2
# ... other dependencies
```

---

## 📝 Summary

The AudioImageCarrier backend follows a **clean architecture** with:

- **Clear separation of concerns** (routes → services → core)
- **Dependency injection** for testability
- **Pydantic models** for type safety
- **Async operations** for performance
- **Comprehensive error handling**
- **Security-first design**
- **Serverless deployment** ready
- **Extensive documentation**

The architecture is **scalable**, **maintainable**, and **production-ready**.
