# Frontend Conversion Integration Guide

## Overview

This guide explains how to connect the Frontend to the backend conversion API endpoints.

---

## 1. Update API Service

**File**: `Frontend/services/api.ts`

Add these functions:

```typescript
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

// Audio to Image Conversion
export async function convertAudioToImage(
  audioFile: DocumentPicker.DocumentPickerAsset,
  userId: string,
  options?: {
    compress?: boolean;
    deleteSource?: boolean;
    masterKeyHex?: string;
  }
): Promise<any> {
  const formData = new FormData();
  
  // Convert file URI to blob
  const response = await fetch(audioFile.uri);
  const blob = await response.blob();
  formData.append('audioFile', blob, audioFile.name);
  formData.append('userId', userId);
  
  if (options?.compress) {
    formData.append('compress', 'true');
  }
  if (options?.deleteSource) {
    formData.append('deleteSource', 'true');
  }
  if (options?.masterKeyHex) {
    formData.append('masterKeyHex', options.masterKeyHex);
  }

  const response2 = await fetch(`${API_BASE_URL}/convert/audio-to-image`, {
    method: 'POST',
    body: formData,
    headers: {
      // Don't set Content-Type, let FormData handle it
    }
  });

  if (!response2.ok) {
    const error = await response2.json();
    throw new Error(error.message || 'Conversion failed');
  }

  return response2.json();
}

// Image to Audio Conversion
export async function convertImageToAudio(
  imageDirPath: string,
  outputFileName: string,
  userId: string,
  options?: {
    masterKeyHex?: string;
  }
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/convert/image-to-audio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      imageDirPath,
      outputFileName,
      userId,
      ...options
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Conversion failed');
  }

  return response.json();
}

// List Conversions
export async function listConversions(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/conversions`, {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error('Failed to list conversions');
  }

  return response.json();
}

// Get Conversion Status
export async function getConversionStatus(conversionId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/conversions/${conversionId}`, {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error('Conversion not found');
  }

  return response.json();
}

// Download File
export async function downloadConversionFile(
  conversionId: string,
  fileName: string,
  saveLocation: string
): Promise<void> {
  const fileUri = `${API_BASE_URL}/conversions/${conversionId}/${fileName}`;
  
  const downloadResumable = FileSystem.createDownloadResumable(
    fileUri,
    saveLocation
  );

  try {
    const result = await downloadResumable.downloadAsync();
    if (!result || !result.uri) {
      throw new Error('Download failed');
    }
  } catch (e) {
    throw new Error(`Failed to download file: ${e}`);
  }
}
```

---

## 2. Update Audio-to-Image Tab

**File**: `Frontend/app/(tabs)/audio-to-image-tab.tsx`

Update the conversion function:

```typescript
import { convertAudioToImage } from '@/services/api';
import * as DocumentPicker from 'expo-document-picker';

export default function AudioToImageTab() {
  const [isLoading, setIsLoading] = useState(false);
  const [conversionId, setConversionId] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAudioSelection = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
      });

      if (result.type === 'success') {
        await convertAudio(result.assets[0]);
      }
    } catch (err) {
      setError('Failed to select audio file');
      console.error(err);
    }
  };

  const convertAudio = async (audioFile: any) => {
    try {
      setIsLoading(true);
      setError(null);

      // Call conversion API
      const response = await convertAudioToImage(
        audioFile,
        'user-' + Date.now(), // Simple user ID
        {
          compress: true,
          deleteSource: false
        }
      );

      if (response.success) {
        setConversionId(response.conversionId);
        setImages(response.images);
        showSuccessMessage(`Converted to ${response.imageCount} image(s)`);
      } else {
        setError(response.message || 'Conversion failed');
      }
    } catch (err: any) {
      setError(err.message || 'Conversion failed');
      console.error('Conversion error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio to Image</Text>

      {!conversionId ? (
        <>
          <Button
            title={isLoading ? 'Converting...' : 'Select Audio File'}
            onPress={handleAudioSelection}
            disabled={isLoading}
          />
          {error && <Text style={styles.error}>{error}</Text>}
        </>
      ) : (
        <>
          <Text style={styles.successText}>✅ Conversion Complete!</Text>
          <Text style={styles.detailsText}>Conversion ID: {conversionId}</Text>
          <Text style={styles.detailsText}>Images: {images.length}</Text>
          
          <ScrollView style={styles.imagesList}>
            {images.map((img, idx) => (
              <View key={idx} style={styles.imageItem}>
                <Text>{img}</Text>
                <Button
                  title="Download"
                  onPress={() => downloadImage(conversionId, img)}
                />
              </View>
            ))}
          </ScrollView>

          <Button
            title="Convert Another Audio"
            onPress={() => {
              setConversionId(null);
              setImages([]);
            }}
          />
        </>
      )}
    </View>
  );
}

async function downloadImage(conversionId: string, fileName: string) {
  try {
    const saveLocation = `${FileSystem.documentDirectory}${fileName}`;
    await downloadConversionFile(conversionId, fileName, saveLocation);
    showSuccessMessage(`Downloaded ${fileName}`);
  } catch (err: any) {
    console.error('Download error:', err);
  }
}
```

---

## 3. Update Image-to-Audio Tab

**File**: `Frontend/app/(tabs)/image-to-audio-tab.tsx`

Update the conversion function:

```typescript
import { convertImageToAudio } from '@/services/api';
import * as DocumentPicker from 'expo-document-picker';

export default function ImageToAudioTab() {
  const [isLoading, setIsLoading] = useState(false);
  const [conversionPath, setConversionPath] = useState<string | null>(null);
  const [outputFileName, setOutputFileName] = useState('recovered_audio.wav');
  const [recoveredAudio, setRecoveredAudio] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelection = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
      });

      if (result.type === 'success') {
        // In a real app, you would need the conversion path
        // For now, show a dialog to enter the conversion ID
        showConversionIdPrompt();
      }
    } catch (err) {
      setError('Failed to select image file');
      console.error(err);
    }
  };

  const convertImages = async (imageDirPath: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await convertImageToAudio(
        imageDirPath,
        outputFileName,
        'user-' + Date.now()
      );

      if (response.success) {
        setConversionPath(response.outputPath);
        setRecoveredAudio(response.outputFile);
        showSuccessMessage('Images converted back to audio!');
      } else {
        setError(response.message || 'Conversion failed');
      }
    } catch (err: any) {
      setError(err.message || 'Conversion failed');
      console.error('Conversion error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Image to Audio</Text>

      {!recoveredAudio ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter conversion ID or image directory path"
            onChangeText={setConversionPath}
            editable={!isLoading}
          />
          <TextInput
            style={styles.input}
            placeholder="Output audio filename"
            value={outputFileName}
            onChangeText={setOutputFileName}
            editable={!isLoading}
          />
          <Button
            title={isLoading ? 'Converting...' : 'Convert Images to Audio'}
            onPress={() => convertImages(conversionPath || '')}
            disabled={isLoading || !conversionPath}
          />
          {error && <Text style={styles.error}>{error}</Text>}
        </>
      ) : (
        <>
          <Text style={styles.successText}>✅ Recovery Complete!</Text>
          <Text style={styles.detailsText}>Audio: {recoveredAudio}</Text>
          <Button
            title="Download Audio"
            onPress={() => downloadAudio(conversionPath, recoveredAudio)}
          />
          <Button
            title="Convert More Images"
            onPress={() => {
              setRecoveredAudio(null);
              setConversionPath(null);
            }}
          />
        </>
      )}
    </View>
  );
}

async function downloadAudio(conversionPath: string, fileName: string) {
  try {
    const saveLocation = `${FileSystem.documentDirectory}${fileName}`;
    await downloadConversionFile(
      conversionPath.split('/')[conversionPath.split('/').length - 2],
      fileName,
      saveLocation
    );
    showSuccessMessage(`Downloaded ${fileName}`);
  } catch (err: any) {
    console.error('Download error:', err);
  }
}
```

---

## 4. Test Integration

1. **Start Backend**:
   ```bash
   cd Mobile_App/Backend
   npm run dev
   ```

2. **Start Frontend**:
   ```bash
   cd Mobile_App/Frontend
   npm start
   ```

3. **Test Audio-to-Image**:
   - Tap "Audio to Image" tab
   - Select an audio file (mp3, wav, etc.)
   - Wait for conversion
   - See results displayed
   - Download generated images

4. **Test Image-to-Audio**:
   - Tap "Image to Audio" tab
   - Enter conversion ID from step 3
   - Click convert
   - Download recovered audio

---

## 5. Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| Network error | Backend not running | Start backend with `npm run dev` |
| File type error | Invalid audio file | Use .mp3, .wav, .flac, or .m4a |
| File too large | >500MB | Use smaller audio file |
| Conversion failed | Python script error | Check server logs |
| Path not found | Invalid conversion ID | Copy correct ID from results |

---

## 6. Features to Add

- [ ] Show conversion progress with percentage
- [ ] Add metadata display (duration, file size)
- [ ] Implement encryption key input
- [ ] Add compression toggle
- [ ] Show conversion history
- [ ] Cache results locally
- [ ] Background upload/download

---

## 7. Testing with Sample Data

Create a test audio file to use:

```bash
# Using ffmpeg (if installed)
ffmpeg -f lavfi -i sine=f=440:d=5 -q:a 9 -acodec libmp3lame test_audio.mp3
```

Or download a sample MP3 file to use for testing.

---

**Status**: Ready for frontend integration  
**Backend API**: Running on http://localhost:3000  
**Next**: Implement frontend components
