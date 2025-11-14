### Backend System Pipeline — 3-Model Stego-Audio Platform

This README describes the end-to-end system design for robust, secure audio transmission via images across untrusted platforms. The system comprises three models and a secure user-data pipeline with encryption and error-correction. It is optimized for perceptual audio quality and resilience against platform attacks like JPEG recompression and resizing.

- **Model 1 (Neural Audio Enhancement)**: Denoises and dereverberates the input audio using a complex-valued U-Net (DCCRN) trained with a multi-metric GAN objective (PESQ/STOI).
- **Model 2 (Steganographic Encoder)**: Hides the enhanced audio payload inside a cover image using an invertible neural network (INN), with optional ECC and encryption.
- **Model 3 (Steganographic Decoder)**: Recovers the payload from possibly attacked images (post platform sharing), and reconstructs the original audio using ECC decode and decryption.

---

### Diagram 1: The Overall 3-Model System Pipeline

This high-level diagram shows the complete, end-to-end journey of the audio data from the sender (User 1) to the receiver (User 2).

```text
          (User 1: Sender)
                    |
                    V
             (Raw Audio File)
                    |
  +-------------------------------------+
  | MODEL 1: NEURAL AUDIO ENHANCEMENT  |
  |             (e.g., DCCRN)          |
  |  - Removes background noise        |
  |  - Separates interfering voices    |
  +-------------------------------------+
                    |
                    V
          (Clean Audio Payload)
                    |
  +-------------------------------------+
  |      MODEL 2: STEGANOGRAPHIC       |
  |             ENCODER                 |
  | (INN Forward-Pass + ECC + Encrypt) |
  |  - Hides audio in cover image       |
  +-------------------------------------+
                    |
                    V
         (Stego Image, e.g., image.png)
                    |
  ===============================================
  |           "PLATFORM SHARING" ATTACK         |
  |       (JPEG compression, resizing, etc.)    |
  ===============================================
                    |
                    V
     (Attacked Stego Image, e.g., image.jpg)
                    |
  +-------------------------------------+
  |      MODEL 3: STEGANOGRAPHIC       |
  |             DECODER                 |
  | (INN Reverse-Pass + ECC + Decrypt) |
  |  - Recovers audio from image        |
  +-------------------------------------+
                    |
                    V
        (Reconstructed Clean Audio)
                    |
                    V
           (User 2: Receiver)
```

---

### Diagram 2: Model 1 — Architecture & Training (DCCRN + MetricGAN)

This design shows the two-part system for Model 1: (A) the U-Net architecture that enhances the audio, and (B) the advanced GAN-based training loop used to optimize for human-perceived quality (PESQ/STOI).

#### 2a. Model 1 Architecture (DCCRN)

The U-Net architecture is built with complex-valued layers to process both the magnitude and phase of the audio spectrogram, which is critical for high-fidelity enhancement.

```text
Input (Noisy Complex Spectrogram)
              |
              V
  +----------[Complex Encoder]-----------+
  | (Complex Conv2D -> Complex BN ->     |
  |               PReLU)                 |
  |     |                                |
  |     V (Downsample)        (Skip)     |
  |  +--------[Complex Encoder]-------+  |
  |  | (Complex Conv2D -> C-BN ->     |  |
  |  |             PReLU)             |  |
  |  |    |                           |  |
  |  |    V (Downsample)     (Skip)   |  |
  |  |  +---------------------------+ |  |
  |  |  |   (2-Layer Complex LSTM)  | |  |
  |  |  +---------------------------+ |  |
  |  |               |                |  |
  |  |               V (Upsample)     |  |
  |  +----------------+---------------+  |
  |                   |                   |
  |     (Complex Deconv -> C-BN -> PReLU) <---+
  |                   |                          
  |                   V (Upsample)               
  +-------------------+--------------------+
                      |                    |
            (Complex Deconv -> C-BN -> PReLU) <---+
                      |
                      V
    Output (Clean Complex Spectrogram)
```

Key properties:
- **Complex-valued ops**: jointly model magnitude and phase.
- **Skip connections**: preserve fine-grained spectral detail.
- **Complex LSTM bottleneck**: sequence modeling across time.

#### 2b. Model 1 Training Loop (Multi-MetricGAN)

Instead of a simple MSE loss, the generator (DCCRN) is trained to fool a discriminator that has been taught to predict the actual PESQ and STOI scores.

```text
                       +-------------------------+
(A) GENERATOR TRAINING |   Target: "High Score"  |
   (Trains Model 1)    +-------------------------+
             ^                 | (Loss_G)
             |                 |
  +----------+----------+      |
  |    GENERATOR        |  (Enhanced Audio)
  |      DCCRN          +----->+-------------------------+
  +---------------------+      |     DISCRIMINATOR       |
       (Noisy Audio)           |   (Metric Predictor)    |
                               |  - Predicts PESQ & STOI |
                               +-------------------------+
                                       |        |
                                       |        | (True Score)
                                       |        V
                                       |   +-------------+
                                       |   |  TRUE       |
                                       +-->|  METRIC     |
                                           | (PESQ/STOI) |
                                           +-------------+

(B) DISCRIMINATOR TRAINING
   (Trains the Predictor)
         ^
         | (Loss_D)
         |
    (Clean Audio)   (Enhanced Audio)
```

Training targets:
- **Generator loss**: adversarial objective aligned with higher predicted PESQ/STOI.
- **Discriminator loss**: regression/classification toward true metric scores.

---

### Diagram 3: Models 2 & 3 — User Data Pipeline (Inference)

This shows the user's data flow for hiding and recovering the audio after the models are trained. It highlights the critical pre-processing (Encryption, ECC) and post-processing (ECC decode, Decryption) steps required to achieve the lossless and secure goals.

```text
=========================
|     SENDER (USER 1)   |
=========================
       (Clean Audio)
              |
              V
        +-------------+
        |  AES-256    |
        | ENCRYPTION  |  [8, 9]
        +-------------+
              |
              V
       (Encrypted Bits)
              |
              V
        +-----------------+
        | ERROR CORRECTION|
        | ENCODE (BCH)    |  [11]
        +-----------------+
              |
              V
     (Redundant Payload)            (Cover Image)
               |                          |
               +-----------+  +-----------+
                           V  V
                     +---------------+
                     |  MODEL 2      |
                     |   (INN)       |
                     | Forward Pass  |
                     +---------------+
                           |
                           V
                       (Stego Image) --> To Platform

=========================
|    RECEIVER (USER 2)   |
=========================
 (Attacked Image) <-- From Platform
              |
              V
        +---------------+
        |   MODEL 3     |
        |    (INN)      |
        | Reverse Pass  |
        +---------------+
              |
              V
       (Corrupted Payload)
              |
              V
        +-----------------+
        | ERROR CORRECTION|
        |  DECODE (BCH)   |  [11]
        +-----------------+
              |
              V
 (Corrected Encrypted Bits)
              |
              V
        +-------------+
        |  AES-256    |
        | DECRYPTION  |  [9]
        +-------------+
              |
              V
     (Original Clean Audio)
```

Key guarantees:
- **Confidentiality**: AES-256 encryption protects payload contents.
- **Reliability**: ECC (e.g., BCH) repairs bit errors due to platform attacks.
- **Robustness**: INN learns to embed and recover under differentiable attack simulation.

---

### Diagram 4: Models 2 & 3 — Advanced Training Loop (Adversarial Autoencoder)

The INN is trained adversarially with a discriminator while a differentiable JPEG/attack layer simulates platform corruption. The system jointly optimizes perceptual, payload, and adversarial losses.

```text
(Input: Cover Image) ----+---------------------------+---- (Input: Audio Payload)
                         |                           |
                         V                           |
                   +-------------------+             |
                   |   G_INN (Gen)     |             |
                   |  Models 2 & 3     |             |
                   | + Attention Mod.  |  [26, 27]   |
                   +-------------------+             |
                         |                           |
                         V                           |
                     (Stego Image)                   |
                         |                           |
     +-------------------+---------------------------+--------------------+
     |                   |                           |                    |
     V                   V                           V                    V
 +-----------------+  +-------------------+   +-----------------------+  |
 | LPIPS Loss      |  | D_STEG (Disc.)    |   | DIFF-JPEG NOISE LAYER |  |
 | (VGG Percept.)  |  | (Real/Fake)       |   | (Differentiable Attack)|  |
 +-----------------+  +-------------------+   +-----------------------+  |
         |                  ^     |                      |               |
         |   (Compares)     |     +------ (Predicts) ---+               |
         +------------------+-------------------------------+            |
                            |                                            |
                            | (Target: REAL)                              |
                            V                                            |
                      +---------------+                                   |
                      |   D_STEG      |  (L_DISCR)                        |
                      +---------------+                                   |
                            ^                                            |
                            | (Target: FAKE)                              |
                            |                                            |
                            +------------------+                         |
                                               V                         |
                                        (Attacked Stego Image)           |
                                               |                         |
                                               V                         |
                                         +-----------+                   |
                                         |  G_INN    |  Reverse Pass     |
                                         +-----------+                   |
                                               |                         |
                                               V                         |
                                        (Corrupted Payload) <------------+
                                                |
                                                V
                                       (L_PAYLOAD vs Target Payload)

Optimized losses:
- L_PERCEPTUAL (e.g., LPIPS/VGG) — trains G_INN for imperceptible embedding.
- L_ADVERSARIAL — trains G_INN against D_STEG for realism.
- L_DISCRIMINATOR — trains D_STEG to distinguish real vs stego.
- L_PAYLOAD — trains G_INN to preserve payload under attack.
```

---

### Implementation Notes

- **Audio Frontend**: STFT/ISTFT with complex-valued processing; consider 20–40 ms windows with 50–75% overlap.
- **Encryption**: AES-256 (GCM recommended) before ECC; manage keys via secure KMS or user-provided secrets.
- **ECC**: BCH/LDPC tuned to expected channel noise (JPEG quality range, resize aggressiveness).
- **Differentiable Attacks**: differentiable JPEG, blur, resize; curriculum from weak to strong.
- **Attention Modules**: spatial-channel attention can improve capacity/robustness.
- **Metrics**: PESQ/STOI/Si-SDR for audio; LPIPS/SSIM/PSNR for images; BER for payload.

---

### Threat Model & Goals

- **Threats**: platform recompression (JPEG), rescaling, minor crops, light filtering.
- **Goals**:
  - Maintain perceptual cover quality (low LPIPS, high SSIM/PSNR)
  - Achieve near-lossless audio recovery after ECC
  - Preserve confidentiality of payload via encryption

---

### References

- [8, 9] AES-256 and GCM best practices (cryptography engineering texts)
- [11] BCH/LDPC error correction coding
- [16, 25] Adversarial training for steganography
- [23] LPIPS perceptual similarity
- [26, 27] Attention mechanisms for robustness/capacity


