# Jailer — eBPF Mandatory Access Control

> **Quelle:** https://github.com/gen0sec/jailer (Branch `main`)
> **Sprache:** Rust · **Abgerufen:** 6. September 2026
> **⚠️ Upstream-Warnung im README:** *"under heavy development and is NOT ready for
> production use. APIs, policy formats, and behavior may change without notice."*

## Was es ist

eBPF-basiertes Process-Jailing mit Mandatory Access Control über **BPF LSM**. Verfolgt
Prozesse via `task_storage`-Map und setzt rollenbasierte Richtlinien für Dateizugriff,
Netzwerkoperationen und Prozessausführung durch.

**Zur Herkunft:** Eigenständige Implementierung, *nicht* Metas Lösung. Inspiriert von der
Arbeit von Liam Wisehart, Justin Nga, Carl El Khoury und Mansee Chadha bei Meta, aber
separate Codebasis. (Die verbreitete Angabe „BPFJailer von Meta" trifft also nur die
Vorlage, nicht dieses Repo.)

## Funktionsstand laut README

| Funktion | Status |
|---|---|
| Process Tracking (`task_storage`) | ✅ |
| Rollenbasierte Policies (restricted/permissive) | ✅ |
| File Access Control (open blockieren/erlauben) | ✅ |
| Network Control (socket bind/connect) | ✅ |
| Port-/Protokoll-Filter (TCP/UDP pro Port) | ✅ |
| Exec Control | ✅ |
| Jail-Vererbung an Kindprozesse | ✅ |
| Auto-Enrollment via Executable, cgroup oder xattr | ✅ |
| Audit-Events (Perf-Buffer → journald) | ✅ |
| Daemonless Mode (Bootstrap pinnt Programme beim Boot) | ✅ |
| Signierte Binaries | 🚧 Stub, nicht implementiert |

## Anforderungen — die Onboarding-Hürde

- **Linux 5.11+** (für `BPF_MAP_TYPE_TASK_STORAGE`), empfohlen 6.1+
- Kernel-Config: `CONFIG_BPF=y`, `CONFIG_BPF_SYSCALL=y`, `CONFIG_BPF_LSM=y`, `CONFIG_DEBUG_INFO_BTF=y`
- **BPF LSM muss über Kernel-Boot-Parameter aktiviert werden**: `lsm=lockdown,capability,landlock,yama,apparmor,bpf` in GRUB, danach `update-grub` **und Reboot**
- Build: Rust, clang, llvm, libelf-dev, Kernel-Header, Target `bpfel-unknown-none`

Prüfen ob aktiv: `cat /sys/kernel/security/lsm` muss `bpf` enthalten.

## Einordnung für JiMesh

**Das ist das Durchsetzungs-Gegenstück zu AgentSight.** Zusammen decken die beiden die
Kernel-Schicht aus `K-LAF-ARCHITECTURE.md` ab: AgentSight beobachtet, Jailer erzwingt.

Drei Gründe, es trotzdem nicht in den nahen Plan zu nehmen:

1. **Das Produktionswarnung des Upstreams** ist eindeutig und aktuell.
2. **Grub-Änderung plus Reboot** widerspricht direkt dem Zero-Friction-Onboarding, das
   die K-LAF-Spec in §5 als Tier-1-Ziel setzt. Ein Nutzer, der JiMesh ausprobiert, wird
   seinen Kernel nicht umkonfigurieren.
3. **Was es durchsetzt, deckt nftables plus gVisor bereits ab** — Datei-, Netzwerk- und
   Exec-Kontrolle. Der Mehrwert von BPF LSM liegt in der Granularität pro Prozess, nicht
   in einer neuen Fähigkeitsklasse.

Bestätigt aber unsere Architektur-Aussage: eBPF ist für **Ereignisse und
Syscall-Durchsetzung** da, nicht für Prompt-Analyse. Jailer kontrolliert `open`,
`connect`, `bind`, `execve` — kein Inhaltsverständnis, nirgends.

**Empfehlung:** Beobachten, nicht einbinden. Wiedervorlage, wenn der Upstream den
Produktionsvorbehalt zurücknimmt. Als Referenz für ein eigenes BPF-LSM-Profil in Tier 3
(Enterprise, wo ein Kernel-Boot-Parameter zumutbar ist) taugt es jetzt schon.
