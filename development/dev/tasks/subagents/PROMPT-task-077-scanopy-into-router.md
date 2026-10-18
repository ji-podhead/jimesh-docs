# ⛔ RETIRED — FOLDED INTO TASK-078 (corrected scope). Scanopy = Network-Topology-Visualizer

**Status:** 🔲 offen | **Quelle:** Operator 14.9. („ich hab sogar eine implementierung für ovs geschrieben: ovs-bridge-collection & opnsense-helper — Ansible Collection for OVS/VLAN Automation & Python API for OPNsense … single-NIC network isolation, automatic provisioning of Docker/libvirt networks") + SPRINT-36-R40 (Network-Editing-Tab)

## WARNUNG (Mandat 2)

Scanopy ist NICHT aktuell geclont in diesem Repo. Der Operator hat „ovs-bridge-collection" als eigene Ansible-Arbeit referenziert, aber die echte „Scanopy"-Source/Repo-URL wurde NICHT angegeben — SUCHEN oder FRAGEN bevor du implementation schreibst. Wenn du nicht findest: STOPP und report klar („Source nicht gefunden") statt einen plausibel klingenden OVS-Wrapper unter dem Namen zu fabrizieren.

## Aufgabe (wenn gefunden)
1. Lizenz prüfen (R35-Salvage-Review-Muster: GPL/AGPL = Referenz-only, Ideen nachreimplementieren)
2. NUR die OVS-Bridge-Creation/VLAN-Tagging-Logik extrahieren („give each project/workspace its own isolated network segment on a single NIC")
3. Als pure Go in cmd/jimesh-router reimplementieren (CGO-frei, Mandat 7)

- GIT: explizite Pfade, kein -A, NICHT pushen
