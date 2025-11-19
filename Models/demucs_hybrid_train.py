#!/usr/bin/env python3
"""
Demucs-style hybrid waveform denoiser + training script (single-file)

- PyTorch implementation (single-file) for training a high-quality speech enhancement model.
- Architecture: U-Net style encoder/decoder (1D conv) with Transformer encoder in the bottleneck.
- Losses: SI-SDR + Multi-resolution STFT magnitude loss + L1 waveform loss.
- Dataset: on-the-fly mixture creation from clean speech and noise folders (supports RIR convolution if provided).
- Saves checkpoints and exports an ONNX for inference.

Usage example:
  python demucs_hybrid_train.py --clean_dir /path/to/clean --noise_dir /path/to/noise --out_dir ./checkpoints --sr 16000 --batch 8 --epochs 200

Requires: torch, torchaudio, numpy, tqdm
"""
from pathlib import Path
from glob import glob
import argparse
import math
import os
import random
import sys

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchaudio
from torch.utils.data import Dataset, DataLoader
from tqdm import tqdm

# ----------------------------- Utilities -----------------------------

def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def load_wav(path, sr):
    wav, r = torchaudio.load(path)
    if r != sr:
        wav = torchaudio.functional.resample(wav, r, sr)
    # to mono
    if wav.shape[0] > 1:
        wav = wav.mean(dim=0, keepdim=True)
    return wav.squeeze(0)


# ----------------------------- Dataset -----------------------------
class OnTheFlyMixtureDataset(Dataset):
    """Constructs noisy mixtures on the fly from clean and noise pools.
    Expects folders of wavs (clean) and wavs (noise). Optionally RIRs.
    """

    def __init__(self, clean_dir, noise_dir, sr=16000, seg_len=4.0, rir_dir=None, min_snr=-5, max_snr=20):
        super().__init__()
        self.clean_files = glob(os.path.join(clean_dir, "**", "*.wav"), recursive=True)
        self.noise_files = glob(os.path.join(noise_dir, "**", "*.wav"), recursive=True)
        assert len(self.clean_files) > 0, f"No clean files found in {clean_dir}"
        assert len(self.noise_files) > 0, f"No noise files found in {noise_dir}"
        self.sr = sr
        self.seg_samples = int(seg_len * sr)
        self.rir_files = glob(os.path.join(rir_dir, "**", "*.wav"), recursive=True) if rir_dir else []
        self.min_snr = min_snr
        self.max_snr = max_snr

    def __len__(self):
        # effectively infinite — data created on the fly
        return 10_000_000

    def _random_crop(self, wav, length):
        if wav.numel() <= length:
            # pad both sides
            pad = length - wav.numel()
            left = pad // 2
            right = pad - left
            return F.pad(wav, (left, right))
        else:
            start = random.randint(0, wav.numel() - length)
            return wav[start:start + length]

    def _maybe_apply_rir(self, wav):
        if len(self.rir_files) > 0 and random.random() < 0.5:
            rir = load_wav(random.choice(self.rir_files), self.sr)
            # normalize RIR energy
            rir = rir / (torch.norm(rir) + 1e-9)
            # conv1d expects (B, C, T) for input and (out_ch, in_ch, k) for kernel
            # here we treat both as single-channel
            wav_unsq = wav.unsqueeze(0).unsqueeze(0)  # (1,1,T)
            rir_kernel = rir.flip(0).unsqueeze(0).unsqueeze(0)  # (1,1,K)
            conv = F.conv1d(wav_unsq, rir_kernel, padding=rir.numel() - 1)
            return conv.squeeze()
        return wav

    def __getitem__(self, idx):
        # sample clean
        clean_path = random.choice(self.clean_files)
        clean = load_wav(clean_path, self.sr)
        clean = self._random_crop(clean, self.seg_samples)
        clean = self._maybe_apply_rir(clean)

        # sample noise
        noise_path = random.choice(self.noise_files)
        noise = load_wav(noise_path, self.sr)
        # ensure noise long enough
        if noise.numel() < self.seg_samples:
            n_repeat = math.ceil(self.seg_samples / max(1, noise.numel()))
            noise = noise.repeat(n_repeat)
        noise = self._random_crop(noise, self.seg_samples)

        # pick SNR
        snr = random.uniform(self.min_snr, self.max_snr)
        # scale noise to achieve SNR
        clean_rms = torch.sqrt(torch.mean(clean ** 2) + 1e-9)
        noise_rms = torch.sqrt(torch.mean(noise ** 2) + 1e-9)
        desired_noise_rms = clean_rms / (10 ** (snr / 20))
        noise = noise * (desired_noise_rms / (noise_rms + 1e-9))

        # mixture
        noisy = clean + noise
        # normalize to avoid clipping too much
        peak = noisy.abs().max()
        if peak > 0.999:
            noisy = noisy / peak * 0.999
            clean = clean / peak * 0.999

        return noisy.unsqueeze(0).float(), clean.unsqueeze(0).float()


# ----------------------------- Model -----------------------------
class ConvBlock(nn.Module):
    def __init__(self, in_ch, out_ch, kernel_size=15, stride=1, padding=None):
        super().__init__()
        if padding is None:
            padding = kernel_size // 2
        self.conv = nn.Conv1d(in_ch, out_ch, kernel_size, stride=stride, padding=padding)
        self.bn = nn.BatchNorm1d(out_ch)
        self.act = nn.PReLU()

    def forward(self, x):
        return self.act(self.bn(self.conv(x)))


class ResidualConvBlock(nn.Module):
    def __init__(self, ch, kernel_size=3):
        super().__init__()
        self.conv1 = nn.Conv1d(ch, ch, kernel_size, padding=kernel_size // 2)
        self.bn1 = nn.BatchNorm1d(ch)
        self.act = nn.ReLU()
        self.conv2 = nn.Conv1d(ch, ch, kernel_size, padding=kernel_size // 2)
        self.bn2 = nn.BatchNorm1d(ch)

    def forward(self, x):
        out = self.act(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        return self.act(out + x)


class EncoderBlock(nn.Module):
    def __init__(self, in_ch, out_ch, kernel_size=15, downsample=4):
        super().__init__()
        self.conv = ConvBlock(in_ch, out_ch, kernel_size=kernel_size, stride=downsample if downsample > 1 else 1, padding=kernel_size // 2)
        self.res = ResidualConvBlock(out_ch)

    def forward(self, x):
        y = self.conv(x)
        y = self.res(y)
        return y


class DecoderBlock(nn.Module):
    def __init__(self, in_ch, out_ch, kernel_size=15, upsample=4):
        super().__init__()
        if upsample > 1:
            self.up = nn.ConvTranspose1d(in_ch, out_ch, kernel_size=upsample, stride=upsample)
        else:
            # when upsample==1, use 1x1 conv to map channels
            self.up = nn.Conv1d(in_ch, out_ch, kernel_size=1)
        self.res = ResidualConvBlock(out_ch)

    def forward(self, x, skip=None):
        y = self.up(x)
        if skip is not None:
            # crop or pad skip to y
            if skip.size(-1) > y.size(-1):
                skip = skip[..., :y.size(-1)]
            elif skip.size(-1) < y.size(-1):
                skip = F.pad(skip, (0, y.size(-1) - skip.size(-1)))
            y = y + skip
        y = self.res(y)
        return y


class TransformerBottleneck(nn.Module):
    def __init__(self, channels, n_heads=8, n_layers=4, dropout=0.1):
        super().__init__()
        # Project to embed dim (keep same channels to simplify)
        self.proj_in = nn.Conv1d(channels, channels, kernel_size=1)
        encoder_layer = nn.TransformerEncoderLayer(d_model=channels, nhead=min(n_heads, channels), dropout=dropout, batch_first=True)
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)
        self.proj_out = nn.Conv1d(channels, channels, kernel_size=1)

    def forward(self, x):
        # x: (B, C, T)
        x = self.proj_in(x)
        x = x.permute(0, 2, 1)  # (B, T, C)
        x = self.transformer(x)
        x = x.permute(0, 2, 1)
        x = self.proj_out(x)
        return x


class DemucsHybrid(nn.Module):
    def __init__(self, in_channels=1, base_channels=48, depth=5, kernel_size=15, downsample=4, transformer_layers=4):
        super().__init__()
        self.encoders = nn.ModuleList()
        self.decoders = nn.ModuleList()
        ch = in_channels
        channels = []
        # encoder stack
        for i in range(depth):
            out_ch = base_channels * (2 ** i)
            ds = downsample if i > 0 else 1
            self.encoders.append(EncoderBlock(ch, out_ch, kernel_size=kernel_size, downsample=ds))
            channels.append(out_ch)
            ch = out_ch

        # bottleneck transformer
        self.bottleneck = TransformerBottleneck(channels[-1], n_layers=transformer_layers)

        # decoder stack (reverse)
        for i in reversed(range(depth)):
            in_ch = channels[i]
            out_ch = channels[i - 1] if i > 0 else base_channels
            us = downsample if i > 0 else 1
            self.decoders.append(DecoderBlock(in_ch, out_ch, kernel_size=kernel_size, upsample=us))

        # final conv to one channel
        self.final = nn.Conv1d(base_channels, 1, kernel_size=1)

    def forward(self, x):
        # x: (B, 1, T)
        skips = []
        out = x
        for enc in self.encoders:
            out = enc(out)
            skips.append(out)
        out = self.bottleneck(out)
        for dec_idx, dec in enumerate(self.decoders):
            # matching skip from encoder
            skip = skips[-(dec_idx + 1)] if dec_idx < len(skips) else None
            out = dec(out, skip)
        out = self.final(out)
        # residual connection (match length)
        if out.size(-1) != x.size(-1):
            if out.size(-1) > x.size(-1):
                out = out[..., :x.size(-1)]
            else:
                out = F.pad(out, (0, x.size(-1) - out.size(-1)))
        return out + x


# ----------------------------- Losses -----------------------------
def si_sdr(pred, target, eps=1e-8):
    # pred, target: (B, T)
    pred = pred - pred.mean(dim=-1, keepdim=True)
    target = target - target.mean(dim=-1, keepdim=True)
    # projection
    s_target = (torch.sum(pred * target, dim=-1, keepdim=True) * target) / (torch.sum(target ** 2, dim=-1, keepdim=True) + eps)
    e_noise = pred - s_target
    si_sdr_val = 10 * torch.log10((torch.sum(s_target ** 2, dim=-1) + eps) / (torch.sum(e_noise ** 2, dim=-1) + eps) + eps)
    return -si_sdr_val.mean()


class MultiResolutionSTFTLoss(nn.Module):
    def __init__(self, fft_sizes=[512, 1024, 2048], hop_sizes=[50, 120, 240], win_lengths=[240, 600, 1200]):
        super().__init__()
        assert len(fft_sizes) == len(hop_sizes) == len(win_lengths)
        self.fft_sizes = fft_sizes
        self.hop_sizes = hop_sizes
        self.win_lengths = win_lengths
        self.window_cache = {}

    def _stft(self, x, n_fft, hop_length, win_length):
        key = (n_fft, hop_length, win_length)
        if key not in self.window_cache:
            self.window_cache[key] = torch.hann_window(win_length).to(x.device)
        return torch.stft(x, n_fft, hop_length=hop_length, win_length=win_length, window=self.window_cache[key], return_complex=True)

    def forward(self, pred, target):
        # pred/target: (B, T)
        loss_mag = 0.0
        loss_recon = 0.0
        for n_fft, hop, win in zip(self.fft_sizes, self.hop_sizes, self.win_lengths):
            S_pred = self._stft(pred, n_fft, hop, win)
            S_target = self._stft(target, n_fft, hop, win)
            mag_pred = torch.abs(S_pred)
            mag_target = torch.abs(S_target)
            loss_mag = loss_mag + F.l1_loss(mag_pred, mag_target)
            loss_recon = loss_recon + F.l1_loss(S_pred.real, S_target.real) + F.l1_loss(S_pred.imag, S_target.imag)
        return loss_mag + 0.1 * loss_recon


# ----------------------------- Training Loop -----------------------------
def train(args):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print('Device:', device)

    set_seed(args.seed)

    ds = OnTheFlyMixtureDataset(args.clean_dir, args.noise_dir, sr=args.sr, seg_len=args.seg_len,
                                rir_dir=args.rir_dir, min_snr=args.min_snr, max_snr=args.max_snr)

    # Windows users often need num_workers=0; keep default in CLI but allow override
    loader = DataLoader(ds, batch_size=args.batch, num_workers=args.workers, pin_memory=(device.type == 'cuda'))

    model = DemucsHybrid(in_channels=1, base_channels=args.base_channels, depth=args.depth, transformer_layers=args.transformer_layers)
    model.to(device)

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=args.lr_step, gamma=args.lr_gamma)

    mrstft = MultiResolutionSTFTLoss().to(device)

    scaler = torch.cuda.amp.GradScaler(enabled=(device.type == 'cuda'))

    start_epoch = 0
    best_val_loss = float('inf')
    os.makedirs(args.out_dir, exist_ok=True)

    # optionally resume
    if args.resume and os.path.exists(args.resume):
        ckpt = torch.load(args.resume, map_location=device)
        model.load_state_dict(ckpt['model'])
        optimizer.load_state_dict(ckpt['optimizer'])
        # scheduler may be missing in older ckpts
        if 'scheduler' in ckpt and isinstance(ckpt['scheduler'], dict):
            try:
                scheduler.load_state_dict(ckpt['scheduler'])
            except Exception:
                pass
        start_epoch = ckpt.get('epoch', 0)
        print('Resumed from', args.resume)

    for epoch in range(start_epoch, args.epochs):
        model.train()
        running_loss = 0.0
        pbar = tqdm(enumerate(loader), total=min(args.steps_per_epoch, len(loader)), desc=f"Epoch {epoch+1}/{args.epochs}")
        for i, (noisy, clean) in pbar:
            if i >= args.steps_per_epoch:
                break
            noisy = noisy.to(device)  # (B, 1, T)
            clean = clean.to(device)
            noisy_flat = noisy.squeeze(1)
            clean_flat = clean.squeeze(1)

            with torch.cuda.amp.autocast(enabled=(device.type == 'cuda')):
                pred = model(noisy)  # (B, 1, T)
                pred_flat = pred.squeeze(1)
                loss_si = si_sdr(pred_flat, clean_flat)
                loss_wave = F.l1_loss(pred_flat, clean_flat)
                loss_spec = mrstft(pred_flat, clean_flat)
                loss = args.w_si * loss_si + args.w_wave * loss_wave + args.w_spec * loss_spec

            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), args.grad_clip)
            scaler.step(optimizer)
            scaler.update()
            optimizer.zero_grad()

            running_loss += loss.item()
            pbar.set_postfix({'loss': running_loss / (i + 1)})

        scheduler.step()

        # Save checkpoint every epoch
        ckpt = {
            'model': model.state_dict(),
            'optimizer': optimizer.state_dict(),
            'scheduler': scheduler.state_dict(),
            'epoch': epoch + 1,
            'args': vars(args)
        }
        torch.save(ckpt, os.path.join(args.out_dir, f'ckpt_epoch{epoch + 1}.pt'))

        # simple validation short-run using few random samples from dataset
        val_loss = quick_validate(model, mrstft, device, ds, args)
        print(f'Epoch {epoch + 1} validation loss: {val_loss:.4f}')
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(ckpt, os.path.join(args.out_dir, 'best.pt'))
            # export ONNX for inference
            export_onnx(model, args, device)


def quick_validate(model, mrstft, device, ds, args, n=8):
    model.eval()
    tot = 0.0
    with torch.no_grad():
        for _ in range(n):
            idx = random.randint(0, max(0, len(ds) - 1))
            noisy, clean = ds[idx]
            noisy = noisy.unsqueeze(0).to(device)
            clean = clean.unsqueeze(0).to(device)
            pred = model(noisy)
            pred_flat = pred.squeeze(1)
            clean_flat = clean.squeeze(1)
            loss = mrstft(pred_flat, clean_flat).item() + 0.1 * si_sdr(pred_flat, clean_flat).item()
            tot += loss
    return tot / n if n > 0 else 0.0


def export_onnx(model, args, device):
    model.eval()
    dummy = torch.randn(1, 1, int(args.seg_len * args.sr)).to(device)
    onnx_path = os.path.join(args.out_dir, 'model.onnx')
    try:
        torch.onnx.export(model, dummy, onnx_path, input_names=['noisy'], output_names=['enhanced'], opset_version=14)
        print('Exported ONNX to', onnx_path)
    except Exception as e:
        print('ONNX export failed:', e)


# ----------------------------- Inference utility -----------------------------
def enhance_file(model_path, input_wav, out_wav, sr=16000):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    ckpt = torch.load(model_path, map_location=device)
    cargs = ckpt.get('args', {})
    model = DemucsHybrid(in_channels=1, base_channels=cargs.get('base_channels', 48),
                         depth=cargs.get('depth', 5), transformer_layers=cargs.get('transformer_layers', 4))
    model.load_state_dict(ckpt['model'])
    model.to(device).eval()

    wav = load_wav(input_wav, sr)
    orig_len = wav.numel()
    seg_samples = int(cargs.get('seg_len', 4.0) * sr)
    hop = seg_samples // 2
    enhanced = torch.zeros_like(wav)
    weight = torch.zeros_like(wav)

    pos = 0
    while pos < orig_len:
        chunk = wav[pos: pos + seg_samples]
        if chunk.numel() < seg_samples:
            chunk = F.pad(chunk, (0, seg_samples - chunk.numel()))
        with torch.no_grad():
            inp = chunk.unsqueeze(0).unsqueeze(0).to(device)
            out = model(inp).squeeze().cpu()
        length = min(out.numel(), orig_len - pos)
        enhanced[pos: pos + length] += out[:length]
        weight[pos: pos + seg_samples] += 1.0
        pos += hop

    weight[weight == 0] = 1.0
    enhanced = enhanced / weight
    torchaudio.save(out_wav, enhanced.unsqueeze(0), sr)
    print('Saved enhanced file to', out_wav)


# ----------------------------- CLI -----------------------------
def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--clean_dir', type=str, required=True, help=r'E:\Minor-Project-For-Amity-Patna\Audio Data\Noiseless Data')
    p.add_argument('--noise_dir', type=str, required=True, help=r'E:\Minor-Project-For-Amity-Patna\Audio Data\Noisy Data')
    p.add_argument('--rir_dir', type=str, default=None, help='Optional RIR wavs folder')
    p.add_argument('--out_dir', type=str, default='./checkpoints')
    p.add_argument('--sr', type=int, default=16000)
    p.add_argument('--seg_len', type=float, default=4.0)
    p.add_argument('--batch', type=int, default=4)
    p.add_argument('--epochs', type=int, default=100)
    p.add_argument('--steps_per_epoch', type=int, default=500)
    p.add_argument('--workers', type=int, default=0, help='DataLoader num_workers (0 recommended on Windows)')
    p.add_argument('--lr', type=float, default=3e-4)
    p.add_argument('--weight_decay', type=float, default=1e-6)
    p.add_argument('--lr_step', type=int, default=30)
    p.add_argument('--lr_gamma', type=float, default=0.5)
    p.add_argument('--w_si', type=float, default=1.0)
    p.add_argument('--w_spec', type=float, default=1.0)
    p.add_argument('--w_wave', type=float, default=0.1)
    p.add_argument('--grad_clip', type=float, default=5.0)
    p.add_argument('--base_channels', type=int, default=48)
    p.add_argument('--depth', type=int, default=5)
    p.add_argument('--transformer_layers', type=int, default=4)
    p.add_argument('--resume', type=str, default='', help='Path to checkpoint to resume from')
    p.add_argument('--seed', type=int, default=42)
    p.add_argument('--min_snr', type=int, default=-5)
    p.add_argument('--max_snr', type=int, default=20)
    return p.parse_args()


if __name__ == '__main__':
    args = parse_args()
    # simple sanity checks
    if not os.path.isdir(args.clean_dir):
        print("ERROR: clean_dir does not exist:", args.clean_dir)
        sys.exit(1)
    if not os.path.isdir(args.noise_dir):
        print("ERROR: noise_dir does not exist:", args.noise_dir)
        sys.exit(1)
    train(args)
