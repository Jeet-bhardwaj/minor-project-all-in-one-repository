## Backend Integration: 3-Model AI Steganography System

This document visualizes a complex, multi-stage AI system that transmits an audio payload from a sender to a receiver by enhancing, hiding, and robustly recovering the audio through real-world platform transformations. It presents four diagrams covering the overall flow and the specific training loops for each model.

### Diagram 1: The Overall 3-Model System Pipeline

``` 
            (User 1: Sender)
                     |
                     V
              (Raw Audio File)
                     |
 +-----------------------------------------------+
 |        MODEL 1: NEURAL AUDIO ENHANCEMENT      |
 |              (e.g., DCCRN) [1, 2]             |
 | - Removes background noise                    |
 | - Separates interfering voices                |
 +-----------------------------------------------+
                     |
                     V
            (Clean Audio Payload)
                     |
 +-----------------------------------------------+
 |         MODEL 2: STEGANOGRAPHIC ENCODER       |
 |   (INN Forward-Pass + ECC + Encrypt) [3,4,5] |
 | - Hides audio payload in cover image          |
 +-----------------------------------------------+
                     |
                     V
          (Stego Image, e.g., image.png)
                     |
    =============================================
    |           "PLATFORM SHARING" ATTACK        |
    |   e.g., JPEG compression, resizing [6]     |
    =============================================
                     |
                     V
       (Attacked Stego Image, e.g., image.jpg)
                     |
 +-----------------------------------------------+
 |         MODEL 3: STEGANOGRAPHIC DECODER       |
 |   (INN Reverse-Pass + ECC + Decrypt) [3,4,5] |
 | - Recovers audio from image                   |
 +-----------------------------------------------+
                     |
                     V
        (Perfectly Reconstructed Audio)
                     |
                     V
              (User 2: Receiver)
```

### Diagram 2: Model 1 — Architecture & Training (DCCRN + MetricGAN)

2a. Model 1 Architecture (DCCRN)

This U-Net style architecture uses complex-valued layers to process both the magnitude and phase of the spectrogram for high-fidelity enhancement.

```
Input (Noisy Complex Spectrogram)
             |
             V
 +--------------------[ Complex Encoder ]--------------------+
 |  (Complex Conv2D -> Complex BN -> PReLU)                  |
 |   ↓ (Downsample)             (Skip)                       |
 |  +----------------[ Complex Encoder ]----------------+    |
 |  | (Complex Conv2D -> C-BN -> PReLU)                |    |
 |  |   ↓ (Downsample)                                 |    |
 |  |  +------------------+                            |    |
 |  |  | (2-Layer Complex | LSTM)                      |    |
 |  |  +------------------+                            |    |
 |  |   ↑ (Upsample)                                    |    |
 |  +---------------------+                             |    |
 |           |                                          |    |
 |  (Complex Deconv -> C-BN -> PReLU) <-----------------+    |
 |           ↑ (Upsample)                                     |
 +------------------------------------------------------------+
             |
             V
Output (Clean Complex Spectrogram)
```

2b. Model 1 Training Loop (Multi-MetricGAN)

The generator (DCCRN) is trained to optimize human-perceived quality by fooling a discriminator trained to predict PESQ/STOI.

```
                 +---------------------------+
   (A) G step -> |   Target: "High Score"   |
   (Train DCCRN) +---------------------------+
         ^                   |  (Loss_G)
         |                   |
   +-----------+    (Enhanced Audio)   +---------------------+
   | GENERATOR | --------------------> |   DISCRIMINATOR     |
   |  DCCRN    |                      | (Metric Predictor)   |
   +-----------+                      | - Predicts PESQ/STOI |
        ^                              +---------------------+
        |                                      ^
 (Noisy Audio)                                  |  (True Score)
        |                                      |
        V                                      |
 (B) D step: (Train the Predictor)             |
   +------------------+                        |
   |  CALCULATE TRUE  | <----------------------+
   |  METRIC (PESQ/   |
   |  STOI) using     |
   |  Clean Audio     |
   +------------------+
                 |
                 V
        (Loss_D; target: True Score)
```

### Diagram 3: Models 2 & 3 — User Data Pipeline (Inference)

This shows the inference-time data flow for hiding and recovering the audio with pre-/post-processing for security and robustness.

```
=========================
|      SENDER (U1)      |
=========================
 (Clean Audio)
        |
        V
 +----------------+
 |   AES-256      |
 |  ENCRYPTION    |
 +----------------+
        |
        V
 (Encrypted Bits)
        |
        V
 +----------------+
 |  ERROR         |
 | CORRECTION     |
 | ENCODE (BCH)   | [5,23,24,25]
 +----------------+
        |
        V
 (Redundant Payload)         (Cover Image)
        |                         |
        +-----------+     +-------+
                    V     V
              +-----------------+
              |  MODEL 2 (INN)  |
              |  Forward Pass   |
              +-----------------+
                    |
                    V
               (Stego Image)  --> To Platform

=========================
|     RECEIVER (U2)     |
=========================
 (Attacked Image)  <-- From Platform
        |
        V
 +-----------------+
 |  MODEL 3 (INN)  |
 |  Reverse Pass   |
 +-----------------+
        |
        V
 (Corrupted Payload)
        |
        V
 +----------------+
 |  ERROR         |
 | CORRECTION     |
 |  DECODE (BCH)  |
 +----------------+
        |
        V
 (Corrected Encrypted Bits)
        |
        V
 +----------------+
 |   AES-256      |
 |  DECRYPTION    | [21,22]
 +----------------+
        |
        V
 (Original Clean Audio)
```

### Diagram 4: Models 2 & 3 — Advanced Training Loop (Adversarial Autoencoder)

An INN is trained with a discriminator and a differentiable JPEG attack, optimizing perceptual similarity, payload fidelity, and adversarial realism simultaneously.

```
(Input: Cover Image) ---+----------------------------+--- (Input: Audio Payload)
                        |                            |
                        V                            |
                 +-------------------+               |
                 |  G_INN (Generator)|               |
                 | (Models 2 & 3)    |               |
                 | + Attention       | [33–36]       |
                 +-------------------+               |
                        |                            |
                        V                            |
                    (Stego Image)                    |
                        |                            |
 +----------------------+----------------------------+--------------------------+
 |                      |                            |                          |
 V                      V                            V                          V
 +----------------+   +-------------------+   +-----------------------+   +-------------------------+
 | LPIPS          |   | D_STEG            |   | DIFF-JPEG NOISE LAYER |   |  (Target: REAL)        |
 | Perceptual     |   | (Discriminator)   |   | (Differentiable Attack|   +-------------------------+
 | Loss (e.g.VGG) |   +-------------------+   +-----------------------+               |
 +----------------+        ^         |                 |                              |
         ^                 | (Real/  |                 | L_ADVERSARIAL                |
         |                 | Fake?)  |                 | (trains G_INN)               |
         |  (Compares)     |         |                 V                              |
         +-----------------+---------+---------> (Attacked Stego Image)               |
         |      L_PERCEPTUAL (trains G_INN) [37,38]                                   |
         |                                                                           |
         |                          +-------------------+                             |
         |                          |  G_INN (Reverse)  | <---------------------------+
         |                          +-------------------+
         |                                      |
         |                                      V
         |                               (Corrupted Payload)
         |                                      |
         |                                      V
         +------------------------------ L_PAYLOAD (target: original payload)
                                                (trains G_INN)

L_DISCRIMINATOR (trains D_STEG) [27,39]
```

### Notes on Components

- **Model 1 (DCCRN)**: Complex-valued U-Net for speech enhancement; paired with a metric-predicting discriminator for perceptual optimization.
- **Models 2 & 3 (INN)**: Invertible network enabling both embedding (forward) and extraction (reverse) of payloads.
- **ECC (e.g., BCH)**: Adds redundancy to survive compression/resizing; decoded to correct bit errors post-attack.
- **AES-256**: End-to-end security of payload bits during transport.
- **Differentiable JPEG**: Simulates platform artifacts in training to learn robust embeddings.
- **LPIPS**: Perceptual similarity loss to maintain cover image fidelity.

### References (placeholders)

1. DCCRN: Deep Complex Convolution Recurrent Network for speech enhancement
2. DCCRN variants and complex-valued U-Nets
3. INN-based steganography/autoencoders
4. Invertible neural networks (forward/reverse consistency)
5. Error correction coding for robust watermarking/steganography (e.g., BCH)
6. JPEG compression and common platform transforms
7. MetricGAN/MetricGAN+ for PESQ/STOI-guided training
16. Perceptual speech metrics (PESQ, STOI)
18. PESQ metric computation
19. STOI metric computation
21. AES-256 encryption (GCM/CTR)
22. AES-256 decryption (GCM/CTR)
23. BCH codes overview
24. ECC design trade-offs (rate vs. resilience)
25. Practical ECC decoders for bitstreams
27. Adversarial training for steganalysis resistance
33–36. Attention mechanisms in encoder–decoder models
37–38. LPIPS perceptual similarity
39. Discriminator objectives for real/fake stego detection


