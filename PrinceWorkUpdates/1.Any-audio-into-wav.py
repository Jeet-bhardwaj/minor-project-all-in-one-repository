import os
import shutil
import tempfile
import urllib.request
from pathlib import Path
from zipfile import ZipFile

from pydub import AudioSegment
import pydub.exceptions

# --- Configuration ---
# SET THE TARGET DIRECTORY HERE
# The 'r' before the string is important. It's a "raw string"
# and prevents Python from misinterpreting the backslashes in a Windows path.
TARGET_DIRECTORY = r"E:\Minor Project\Minor-Project-For-Amity-Patna\PrinceWorkUpdates\audios"

# Add any other audio extensions you want to convert.
# .wav is excluded by default in the logic.
SUPPORTED_EXTENSIONS = [
    ".mp3", ".m4a", ".flac", ".ogg", ".aac", ".wma", ".aiff",
]
# ---------------------

FFMPEG_DOWNLOAD_URL = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
FFMPEG_CACHE_DIR = Path(__file__).with_suffix("").parent / ".ffmpeg"
# ---------------------

def _configure_audiosegment(ffmpeg_path: Path, ffprobe_path: Path) -> None:
    bin_dir = ffmpeg_path.parent
    os.environ["PATH"] = f"{bin_dir}{os.pathsep}{os.environ.get('PATH', '')}"
    AudioSegment.ffmpeg = str(ffmpeg_path)
    AudioSegment.converter = str(ffmpeg_path)
    AudioSegment.ffprobe = str(ffprobe_path)


def ensure_ffmpeg() -> bool:
    """
    Ensure FFmpeg binaries are available for pydub.
    1. Use system-installed ffmpeg/ffprobe if present.
    2. Otherwise download a portable build into .ffmpeg/ and configure pydub.

    Returns True if the binaries are ready, False otherwise.
    """
    FFmpegNames = ("ffmpeg.exe", "ffmpeg",)
    FFprobeNames = ("ffprobe.exe", "ffprobe",)

    def _which(candidates):
        for name in candidates:
            path = shutil.which(name)
            if path:
                return Path(path)
        return None

    ffmpeg_path = _which(FFmpegNames)
    ffprobe_path = _which(FFprobeNames)

    if ffmpeg_path and ffprobe_path:
        _configure_audiosegment(ffmpeg_path, ffprobe_path)
        return True

    cache_bin_dir = FFMPEG_CACHE_DIR / "bin"
    cached_ffmpeg = cache_bin_dir / "ffmpeg.exe"
    cached_ffprobe = cache_bin_dir / "ffprobe.exe"

    if cached_ffmpeg.exists() and cached_ffprobe.exists():
        _configure_audiosegment(cached_ffmpeg, cached_ffprobe)
        return True

    if os.name != "nt":
        print("[Error] Automatic FFmpeg download is currently implemented for Windows only.")
        return False

    print("[Setup] FFmpeg not detected. Attempting to download a portable build (first run only)...")
    try:
        FFMPEG_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp_file:
            tmp_path = Path(tmp_file.name)

        try:
            with urllib.request.urlopen(FFMPEG_DOWNLOAD_URL) as response, tmp_path.open("wb") as out_file:
                shutil.copyfileobj(response, out_file)
        except Exception as download_err:
            print(f"[Error] Failed to download FFmpeg: {download_err}")
            tmp_path.unlink(missing_ok=True)
            return False

        try:
            with ZipFile(tmp_path, "r") as zip_file:
                zip_file.extractall(FFMPEG_CACHE_DIR)
        finally:
            tmp_path.unlink(missing_ok=True)

        extracted_dirs = sorted(
            [p for p in FFMPEG_CACHE_DIR.iterdir() if p.is_dir() and (p / "bin").exists()],
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if not extracted_dirs:
            print("[Error] FFmpeg download did not contain the expected layout.")
            return False

        latest_dir = extracted_dirs[0] / "bin"
        cache_bin_dir.mkdir(parents=True, exist_ok=True)
        for exe_name in ("ffmpeg.exe", "ffprobe.exe"):
            src = latest_dir / exe_name
            if not src.exists():
                continue
            shutil.copy2(src, cache_bin_dir / exe_name)

        if cached_ffmpeg.exists() and cached_ffprobe.exists():
            _configure_audiosegment(cached_ffmpeg, cached_ffprobe)
            print("[Setup] FFmpeg ready.")
            return True

        print("[Error] Downloaded FFmpeg package did not include both ffmpeg and ffprobe executables.")
        return False
    except Exception as err:
        print(f"[Error] Unexpected issue while preparing FFmpeg: {err}")
        return False


def convert_audio_to_wav():
    """
    Scans the TARGET_DIRECTORY for audio files listed in SUPPORTED_EXTENSIONS,
    converts them to .wav format, and removes the original file.
    Files that are already in .wav format are skipped.
    """
    print(f"Starting audio conversion process in: {TARGET_DIRECTORY}")

    if not ensure_ffmpeg():
        print("Please install FFmpeg manually (https://ffmpeg.org/download.html) and re-run the script.")
        return
    
    # Check if the target directory exists
    if not os.path.isdir(TARGET_DIRECTORY):
        print(f"[Error] Directory not found: {TARGET_DIRECTORY}")
        print("Please check the TARGET_DIRECTORY path in the script.")
        return

    # Iterate over all files in the target directory
    for filename in os.listdir(TARGET_DIRECTORY):
        # Get the file extension
        file_root, file_ext = os.path.splitext(filename)
        file_ext_lower = file_ext.lower()
        
        # Full path of the original file
        input_file_path = os.path.join(TARGET_DIRECTORY, filename)
        
        # Skip sub-directories
        if not os.path.isfile(input_file_path):
            continue

        # Check if the file is one of the audio formats we want to convert
        if file_ext_lower in SUPPORTED_EXTENSIONS:
            
            # Define the output .wav file path
            output_file_path = os.path.join(TARGET_DIRECTORY, file_root + ".wav")
            
            print(f"\n[Found Audio] '{filename}'")
            
            try:
                # 1. Load the audio file
                # We can often let pydub figure out the format,
                # but specifying it can be more reliable.
                audio = AudioSegment.from_file(input_file_path, format=file_ext_lower[1:])
                
                # 2. Export the audio as .wav
                print(f"... Converting to '{os.path.basename(output_file_path)}'")
                audio.export(output_file_path, format="wav")
                
                # 3. Verify the new file was created
                if os.path.exists(output_file_path):
                    print(f"... Conversion successful.")
                    
                    # 4. Remove the original file
                    try:
                        os.remove(input_file_path)
                        print(f"... Removed original file: '{filename}'")
                    except OSError as e:
                        print(f"[Error] Could not remove original file '{filename}': {e}")
                else:
                    print(f"[Error] Failed to create .wav file for '{filename}'.")

            except pydub.exceptions.CouldntDecodeError:
                print(f"[Error] Could not decode '{filename}'. File may be corrupt.")
            except FileNotFoundError:
                print(f"[Error] FFmpeg not found. Please ensure it is installed and in your system's PATH.")
            except Exception as e:
                print(f"[Error] An unexpected error occurred with '{filename}': {e}")
                
        elif file_ext_lower == ".wav":
            # This is already a .wav file, so we skip it.
            print(f"\n[Skipping] '{filename}' is already a .wav file.")
            
    print("\n------------------------------")
    print("Audio conversion process finished.")

if __name__ == "__main__":
    # Ensure you have installed pydub (pip install pydub)
    # and FFmpeg (system-level install) before running.
    convert_audio_to_wav()