---
title: "P2P Social Messenger — offline-first, serverless, encrypted"
description: "Raw idea: peer-to-peer social media + messenger with E2E encryption, custom compression, offline-first storage, serverless architecture, React + Capacitor"
created: 2026-10-17
updated: 2026-10-17
tags:
  - idea
  - p2p
  - messenger
  - social
  - encryption
  - compression
  - offline-first
  - serverless
  - capacitor
---

# P2P Social Messenger

> **Open this when:** exploring a peer-to-peer social media + messenger app that needs no central database, works offline-first, and can run serverless.

---

## Vision

A **serverless, peer-to-peer** social media and messenger app. Two users connect directly — no central server, no database. All data lives on-device first (offline-first), with optional cloud sync in the future. Messages are end-to-end encrypted. A custom compression layer handles text, images, voice, audio, and video.

---

## Core Requirements

### 1. Peer-to-Peer Connection (No Database)

| Requirement | Detail |
|-------------|--------|
| Discovery | mDNS / Bonjour (local network) + QR code pairing (remote) |
| Transport | WebRTC DataChannel (primary) + WebSocket signaling (STUN/TURN fallback) |
| Identity | Ed25519 keypair per device; public key = user ID |
| No central server | Signaling can use a lightweight public relay (e.g., WebSocket on Cloudflare Workers) but no message storage |

**Why no database:** Messages are ephemeral P2P payloads. Each peer stores its own copy locally. No server ever sees message content.

### 2. End-to-End Encryption

| Layer | Algorithm | Use |
|-------|-----------|-----|
| Key exchange | X25519 (ECDH) | Session key agreement |
| Message encryption | AES-256-GCM | Per-message symmetric encryption |
| Signing | Ed25519 | Message authenticity / identity |
| Ratcheting | Double Ratchet (Signal Protocol) | Forward secrecy + post-compromise security |

**Implementation:** Use `@noble/ciphers` + `@noble/curves` (audited, tiny) or `libsignal-protocol-javascript` for the full Signal Protocol.

### 3. Custom Compression Algorithm

A unified compression pipeline that auto-detects content type and applies the best strategy:

| Content | Strategy | Library / Approach |
|---------|----------|-------------------|
| Text | LZ4 + dictionary pre-training on common words | `lz4js` or custom LZ77 variant |
| Image | WebP/AVIF transcode + quality ladder | `browser-image-compression` or WASM `mozjpeg` |
| Voice | Opus codec (already compressed) + custom delta encoding | `opus-recorder` + custom entropy coder |
| Audio | FLAC for lossless, Opus for lossy | `ffmpeg.wasm` |
| Video | H.264/H.265 transcode + keyframe delta | `ffmpeg.wasm` |

**Custom layer:** A `CompressionEngine` that wraps these with a consistent API:

```ts
interface CompressionEngine {
  compress(data: Blob, type: ContentType): Promise<CompressedPayload>;
  decompress(payload: CompressedPayload): Promise<Blob>;
  getRatio(): number; // compression ratio for UI feedback
}
```

**Stretch goal:** A custom entropy coder (arithmetic coding) trained on message patterns.

### 4. Offline-First Storage

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Local DB | IndexedDB (via `idb` or `Dexie.js`) | Messages, profiles, media blobs |
| File storage | Origin Private File System (OPFS) | Large media blobs |
| Sync (future) | Turso / libSQL or iCloud Drive | Optional cloud backup |
| Conflict resolution | CRDTs (Yjs or Automerge) | Concurrent edits across devices |

**Principle:** The app is fully functional with zero network. Cloud sync is an optional layer that replicates the local DB.

### 5. Serverless Architecture

```
┌─────────────┐         ┌─────────────┐
│   Peer A    │◄───────►│   Peer B    │
│  (React +   │  WebRTC │  (React +   │
│ Capacitor)  │  P2P    │ Capacitor)  │
└─────────────┘         └─────────────┘
       │                       │
       └───────┬───────────────┘
               │
        ┌──────────────┐
        │  Signaling   │  (Cloudflare Workers / Deno Deploy)
        │  (ephemeral) │  — only for connection setup, no message storage
        └──────────────┘
```

- **Signaling server:** Cloudflare Workers (free tier) — only exchanges SDP offers/answers, never sees message content
- **STUN/TURN:** Google STUN + optional self-hosted Coturn for NAT traversal
- **No database:** The signaling server is stateless; it relays WebRTC offers and disconnects

### 6. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | React 18 + Vite | Fast, familiar, Capacitor-compatible |
| Mobile shell | Capacitor 6 | Native Android/iOS from React, access to native APIs |
| P2P | WebRTC DataChannel | Native browser API, no server for data |
| Encryption | `@noble/ciphers` + `@noble/curves` | Audited, tiny, no native deps |
| Compression | `ffmpeg.wasm` + custom codecs | WASM runs everywhere including Capacitor |
| Storage | IndexedDB (`Dexie.js`) + OPFS | Offline-first, large blob support |
| CRDTs | Yjs | Future multi-device sync |
| UI kit | **Apolyx** (`@altr/apolyx`) | Our own design system |
| Build | Vite + pnpm monorepo | Existing repo structure |

### 7. Capacitor Integration

| Plugin | Purpose |
|--------|---------|
| `@capacitor/core` | Native shell |
| `@capacitor-community/sqlite` | Alternative to IndexedDB if SQL needed |
| `@capacitor/filesystem` | Access native file storage |
| `@capacitor/share` | Share media natively |
| `@capacitor/push-notifications` | Wake app for incoming messages (FCM/APNs) |
| `@capacitor-community/bluetooth-le` | Local discovery without network |

**Capacitor config:**
- Android: `npx cap add android`
- Permissions: `INTERNET`, `CAMERA`, `RECORD_AUDIO`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`

---

## App Structure (Monorepo)

```
apps/
  p2p-messenger/          # React app (web + Capacitor)
    src/
      lib/
        crypto/           # Encryption layer (X25519, AES-GCM, Ed25519)
        compression/      # CompressionEngine + codecs
        p2p/              # WebRTC manager, signaling client
        storage/          # IndexedDB + OPFS + future sync
        crdt/             # Yjs integration (future)
      components/         # Apolyx UI components
      pages/
        Chat/
        Profile/
        Settings/
        Discover/
elements/
  p2p-core/               # Shared P2P logic (framework-agnostic)
    src/
      crypto/
      compression/
      protocol/           # Message envelope, versioning
cloud/
  signaling/              # Cloudflare Worker (stateless relay)
```

---

## Message Envelope

Every message uses a versioned envelope:

```json
{
  "v": 1,
  "id": "uuid-v4",
  "from": "ed25519-pubkey",
  "to": "ed25519-pubkey",
  "ts": 1697567890000,
  "type": "text | image | voice | audio | video | file",
  "payload": "<base64-encrypted-compressed-blob>",
  "meta": {
    "compression": "opus-delta",
    "originalSize": 204800,
    "compressedSize": 45056,
    "duration": 12500
  },
  "sig": "ed25519-signature"
}
```

---

## Phases

### Phase 1 — Foundation (MVP)
- [ ] Project scaffold (Vite + React + Capacitor)
- [ ] Apolyx integration for UI
- [ ] Ed25519 identity generation + QR code pairing
- [ ] WebRTC DataChannel connection (local network)
- [ ] AES-256-GCM message encryption
- [ ] Text messaging (offline-first, IndexedDB)
- [ ] Basic compression (text only)

### Phase 2 — Media + Compression
- [ ] Image send/receive (WebP transcode + compression)
- [ ] Voice messages (Opus + delta encoding)
- [ ] `CompressionEngine` unified API
- [ ] OPFS blob storage for large files

### Phase 3 — Social Features
- [ ] User profiles (name, avatar, bio)
- [ ] Friends list (persisted P2P contacts)
- [ ] Group chats (mesh WebRTC)
- [ ] Status/stories (ephemeral, 24h)

### Phase 4 — Hardening + Cloud
- [ ] Double Ratchet for forward secrecy
- [ ] STUN/TURN for remote connections
- [ ] Cloudflare Worker signaling server
- [ ] Optional cloud sync (Turso / iCloud)
- [ ] Push notifications (FCM/APNs via Capacitor)

---

## Open Questions

1. **Discovery:** mDNS only works on local network. For remote users, do we rely on QR code pairing, or add a lightweight "rendezvous" server?
2. **Group chats:** Full mesh (N×2 connections) vs. relay-through-one-peer? Mesh is simpler but doesn't scale beyond ~5 peers.
3. **Compression:** Is a custom algorithm worth it vs. using existing codecs (Opus, WebP, H.264)? The custom layer adds value as a unified API + metadata, not necessarily a new codec.
4. **Capacitor vs. React Native:** Capacitor is simpler but has limited native module ecosystem. Is Capacitor sufficient for Bluetooth LE discovery?
5. **Monorepo:** Should this live in the existing `altr.lab.turbo.v2` monorepo, or be a standalone repo?

---

## Related

- [[../idea/README]] — idea inbox
- [[../brain/00-Docs-Brain]] — living map
- [[../feature_list/ui-kit/00-intent]] — Apolyx UI kit (to be used for this app's UI)
