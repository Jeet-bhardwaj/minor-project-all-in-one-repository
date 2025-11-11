import os
from pydub import AudioSegment
import pydub.exceptions

# --- Configuration ---
# SET THE TARGET DIRECTORY HERE
# The 'r' before the string is important. It's a "raw string"
# and prevents Python from misinterpreting the backslashes in a Windows path.
TARGET_DIRECTORY = r"E:\Minor Project\Minor-Project-For-Amity-Patna\Datasets"

# Add any other audio extensions you want to convert.
# .wav is excluded by default in the logic.
SUPPORTED_EXTENSIONS = [
    ".mp3", ".m4a", ".flac", ".ogg", ".aac", ".wma", ".aiff",
]
# ---------------------

def convert_audio_to_wav():
    """
    Scans the TARGET_DIRECTORY for audio files listed in SUPPORTED_EXTENSIONS,
    converts them to .wav format, and removes the original file.
    Files that are already in .wav format are skipped.
    """
    print(f"Starting audio conversion process in: {TARGET_DIRECTORY}")
    
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