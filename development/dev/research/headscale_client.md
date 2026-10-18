tailscale app android
Die Tailscale App für Android verbindet Ihr Android-Gerät (ab Version 8.0) sicher mit Ihrem privaten Mesh-Netzwerk (Tailnet).
Wichtigste Funktionen und Eigenschaften
• WireGuard-Basis: Bietet eine direkte, verschlüsselte Peer-to-Peer-Verbindung zu Ihren anderen Geräten ohne komplexe Portweiterleitungen.
• Split Tunneling: Sie können in neueren App-Versionen festlegen, welche Apps den Tailscale-Tunnel nutzen oder diesen umgehen sollen.
• Einfache Einrichtung: Anmeldung per Single-Sign-On (z. B. Google-Konto) oder QR-Code aus der Verwaltungskonsole.
• Verfügbarkeit: Offiziell im Google Play Store, als APK sowie alternativ über den Amazon Appstore oder F-Droid erhältlich.
Möchten Sie wissen, wie Sie Tailscale auf Android automatisch steuern oder bestimmte Exit-Nodes einrichten?
Google Play
Tailscale – Apps bei Google Play
Tailscale integriert Identitätsmanagement auf die Netzwerkebene, sodass Sie den Zugriff anhand von Benutzern, Gruppen, Tags und Ge...
Tailscale
Install Tailscale on Android · Tailscale Docs
Compatibility: Android 8.0 or later (phones, tablets, Android TV; ChromeOS uses Chromebook instructions). Setup Methods: Single si...
Uptodown
Tailscale für Android - Lade die APK von Uptodown herunter
27.08.2026 — Übersetzt von Uptodown Localization Team. Tailscale ist eine VPN-App, die auf WireGuard basiert und mit der du alle Geräte verbind...
Tailscale
Using app-based split tunneling on Android · Tailscale Docs
05.01.2026 — App-based split tunneling is a feature in the Android Tailscale client that lets you decide which apps on the Android device will ...
GitHub
GitHub - tailscale/tailscale-android: Tailscale Android Client · GitHub
Repository: tailscale/tailscale-android (Tailscale Android Client, BSD-3-Clause license). Distribution: Stable/unstable tracks via...
Google Play
Android Apps von Tailscale Inc. bei Google Play
Tailscale Inc. Mesh VPN based on WireGuard. Bild für Symbol. Tailscale. Tailscale Inc. Sichere Konnektivität & Mesh-VPN. Bild für ...
YouTube·Tailscale
10m
Reimagining Tailscale for Android
KI-Antworten können Fehler enthalten. Weitere Informationen
    
        das soll ja für meine eigene app sein mit react native aber die bruacht auch dns
Wenn Sie eine eigene React Native App bauen, die im Tailscale-Netzwerk (Tailnet) läuft, müssen Sie die DNS-Namen (wie mein-server.tailnet-name.ts.net) auflösen.
Da React Native standardmäßig die DNS-Konfiguration des Betriebssystems nutzt, verhält sich die Namensauflösung je nach Zustand der Tailscale-Verbindung unterschiedlich:
1. Tailscale App ist auf dem Gerät aktiv (Empfohlen)
Wenn die offizielle Tailscale-Android-App auf dem Testgerät läuft und verbunden ist, funktioniert MagicDNS automatisch.
• Ihre React Native App kann direkt Standard-Netzwerk-Methoden wie fetch('https://ts.net') aufrufen.
• Das Android-System leitet die DNS-Anfrage an den Tailscale-VpnService weiter, der den Namen in die korrekte 100.x.x.x-IP übersetzt.
2. Tailscale soll direkt in Ihre App integriert werden (Ohne extra App)
Wenn Ihre App die VPN-Verbindung selbst im Hintergrund aufbauen soll, ohne dass der Nutzer die Tailscale-App installiert hat, müssen Sie libtailscale (auch bekannt als tailscale up --tun=userspace-networking) nutzen.
• Das Problem: Im Userspace-Modus (SOCKS5/HTTP-Proxy) weiß das Android-Betriebssystem nichts vom Tailnet-DNS.
• Die Lösung: Sie müssen die DNS-Auflösung innerhalb von React Native manuell über den Tailscale-Proxy tunneln. Da Axios oder fetch in React Native standardmäßig keine SOCKS5-Proxys unterstützen, blockiert dies häufig den nativen Traffic.
Praktische Lösungsansätze für React Native
Wenn MagicDNS über die normale App fehlschlägt oder Sie eine native Integration bauen, nutzen Entwickler meist diese Wege:
Ansatz	Umsetzung	Vorteil	Nachteil
System-DNS nutzen	Offizielle Tailscale-App im Hintergrund laufen lassen.	Kein Code in React Native nötig. fetch() funktioniert sofort.	Nutzer muss eine zweite App installieren.
Direkte IP-Adressen	Nutzen Sie die 100.x.x.x IP statt des DNS-Namens (z.B. http://100.123.45.67:8080).	Umgeht alle DNS-Probleme komplett.	Keine HTTPS-Zertifikate über Let's Encrypt (.ts.net) möglich.
Native Android-Module	HTTP-Client (wie OkHttp) auf der nativen Android-Seite so konfigurieren, dass er den Tailscale SOCKS5-Proxy für DNS nutzt.	Vollständig integriert in einer einzigen App.	Hoher Entwicklungsaufwand (Java/Kotlin-Bridge erforderlich).
Welchen Weg möchten Sie einschlagen? Wenn Sie die SOCKS5-Variante (Direktintegration) ausprobieren möchten, kann ich Ihnen zeigen, wie Sie die Netzwerkschicht in Android (OkHttp) für React Native anpassen müssen.
KI-Antworten können Fehler enthalten. Weitere Informationen
nein ich hba ja headscale
Ah, mit Headscale (der selbstgehosteten Open-Source-Alternative zur Tailscale-Koordination) ändert sich die Ausgangslage ein wenig, besonders beim Thema DNS.
Auch mit Headscale können Sie die normale Android-Tailscale-App nutzen, müssen ihr aber die URL Ihres Headscale-Servers mitteilen. Damit die DNS-Auflösung in Ihrer React Native App reibungslos klappt, müssen Sie Headscale korrekt konfigurieren.
So funktioniert DNS mit Headscale und Android
Damit Ihre React Native App Domainnamen (wie mein-dienst.mein-netzwerk.de) auflösen kann, müssen Sie den DNS-Server in der config.yaml Ihres Headscale-Servers definieren.
Hier sind die zwei gängigsten Wege, wie Sie das aufsetzen:
Ansatz A: MagicDNS-Nachbau über Headscale (Empfohlen)
Headscale besitzt eine eingebaute Namensauflösung für Ihre Nodes, ähnlich wie das originale MagicDNS.
1. In der Headscale config.yaml aktivieren:yaml
dns:
  magic_dns: true
  base_domain: dein-tailnet.intern # Ihre gewünschte interne Domain
  search_domains: []
  extra_records: []
  nameservers:
    - 1.1.1.1 # Fallback für normales Internet
Verwende Code mit Vorsicht.
2. In React Native aufrufen:
Sobald die Tailscale-Android-App mit Ihrem Headscale-Server verbunden ist, kann Ihre React Native App den Server direkt über den vergebenen Namen anfunken:javascript
// Das Android-System löst dies automatisch über den Headscale-DNS auf
fetch('http://dein-tailnet.intern')
Verwende Code mit Vorsicht.
Ansatz B: Eigener DNS-Server (z. B. Pi-hole / CoreDNS)
Falls Sie bereits einen eigenen DNS-Server in Ihrem Netzwerk betreiben, der die IP-Adressen Ihrer Headscale-Geräte kennt, können Sie diesen direkt an die Android-Clients pushen.
1. In der Headscale config.yaml eintragen:yaml
dns:
  magic_dns: false
  nameservers:
    - 100.64.0.5 # Die Headscale-IP Ihres eigenen DNS-Servers (z.B. Pi-hole im VPN)
Verwende Code mit Vorsicht.
2. Wenn sich das Android-Gerät verbindet, wird dieser Nameserver als primärer DNS für das VPN-Interface gesetzt. Alle fetch-Anfragen aus React Native nutzen dann automatisch diesen Server.
Wichtiger Stolperstein bei Android & Headscale: HTTPS
Wenn Sie in React Native fetch() oder Axios mit einer unverschlüsselten Verbindung (http://...) nutzen, blockiert Android dies ab Version 9 standardmäßig (Cleartext Traffic Error).
Lösung für die Entwicklung:
Erlauben Sie HTTP für Ihre Headscale-Domain in der android/app/src/main/AndroidManifest.xml Ihrer React Native App:
xml
<application
  ...
  android:usesCleartextTraffic="true"> 
</application>
Verwende Code mit Vorsicht.
(Für den produktiven Einsatz empfiehlt es sich, echte Zertifikate via Headscale oder einen Reverse-Proxy vor den Diensten zu nutzen).
Möchten Sie wissen, wie Sie die Android-Tailscale-App per verstecktem Menü auf Ihren Headscale-Server umbiegen, oder benötigen Sie Hilfe bei der Konfiguration des Android-Manifests für den lokalen Netzwerkzugriff?
KI-Antworten können Fehler enthalten. Weitere Informationen
nein ich will ja nicht das der user ne extra app installiert das ist eine app für userworkspaces die secure sind
Verstanden! Es handelt sich um eine geschlossene, sichere Workspace-App, bei der das VPN komplett unsichtbar im Hintergrund laufen muss, ohne dass der Nutzer eine separate App installieren oder konfigurieren muss.
Um Tailscale/Headscale direkt in Ihre React Native App einzubetten, nutzt man das offizielle Go-Paket tsnet (Tailscale im Userspace-Modus). Da tsnet komplett im Userspace läuft, benötigt die App auf Android keine VPN-Rechte (VpnService), da kein systemweites VPN aufgebaut wird. Es betrifft nur den Netzwerkverkehr Ihrer eigenen App.
Das bringt jedoch eine große Herausforderung für React Native mit sich: Das Android-Betriebssystem weiß nichts von diesem Netzwerk. Ein normales fetch('http://workspace-server.intern') wird fehlschlagen, weil das System den DNS-Namen nicht auflösen kann und die Route nicht kennt.
Hier sind die zwei saubersten Wege, wie Sie das für eine React Native Workspace-App lösen:
Ansatz 1: Native Android-Netzwerkschicht umbiegen (Der sauberste Weg)
React Native nutzt unter der Haube für alle fetch- und Axios-Anfragen den nativen Android-HTTP-Client OkHttp. Sie können tsnet als native Android-Bibliothek einbinden (über ein Go-Mobile-Binding) und OkHttp so konfigurieren, dass es für DNS und Verbindungen den tsnet-Dialer nutzt.
1. Go-Code (tsnet) als Bibliothek kompilieren:
Sie erstellen ein kleines Go-Modul, das tsnet initialisiert und auf Ihren Headscale-Server verweist:go
// Pseudo-Go-Code für das Binding
srv := &tsnet.Server{
    ControlURL: "https://dein-headscale-server.de",
    AuthKey:    "dein-pre-authorized-authkey",
    Logf:       func(string, ...interface{}) {}, // optional
}
ctx := context.Background()
// Der Dialer übernimmt ab jetzt die Verbindung und DNS-Auflösung im Tailnet
dialer, _ := srv.Dialer(ctx)
Verwende Code mit Vorsicht.
2. OkHttp in Android (Java/Kotlin) anpassen:
In Ihrem nativen Android-Projekt (android/app/...) überschreiben Sie den HTTP-Client, den React Native nutzt. Sie weisen OkHttp an, den tsnet-Dialer für alle Anfragen zu verwenden:java
// In Ihrem nativen Android-Code
OkHttpClient client = new OkHttpClient.Builder()
    .socketFactory(tsnetDialer.getSocketFactory()) // Leitet Traffic durch Headscale
    .dns(new Dns() {
        @Override
        public List<InetAddress> lookup(String hostname) throws UnknownHostException {
            // Hier rufen Sie die DNS-Auflösung von tsnet/Headscale auf
            return Arrays.asList(tsnetDialer.lookup(hostname));
        }
    })
    .build();
Verwende Code mit Vorsicht.
• Vorteil: Im React-Native-Code (JavaScript) können Sie ganz normal fetch('http://mein-workspace-service') aufrufen. Die Magie passiert unsichtbar im nativen Hintergrund.
Ansatz 2: Lokaler HTTP/SOCKS5 Proxy (Der JavaScript-Weg)
Wenn Sie den nativen Java/Kotlin-Code so gering wie möglich halten wollen, können Sie das in Go kompilierte tsnet so konfigurieren, dass es auf dem Android-Gerät einen lokalen Proxy (z. B. auf 127.0.0.1:1080) startet.
1. Lokalen Proxy in der App starten: Das eingebettete tsnet startet einen lokalen SOCKS5- oder HTTP-Proxy, der mit Headscale verbunden ist.
2. React Native Code anpassen: Da das Standard-fetch in React Native keine Proxys unterstützt, müssen Sie eine Bibliothek wie react-native-fetch-blob oder ein Axios-Plugin nutzen, das Traffic über einen Proxy leiten kann. Alternativ übergeben Sie die IP-Adressen direkt:javascript
// Wenn Sie den Proxy im JS-Code ansprechen:
axios.get('http://workspace-server.intern', {
  proxy: { host: '127.0.0.1', port: 1080 }
});
Verwende Code mit Vorsicht.
Strategische Empfehlung für ein sicheres Firmen-Workspace
Für eine kommerzielle oder hochsichere Workspace-App ist Ansatz 1 (OkHttp-Modifikation) der einzig richtige Weg. Er sorgt dafür, dass:
• Der Nutzer absolut nichts von der VPN-Technik im Hintergrund mitbekommt.
• Keine Ports auf dem Android-Gerät nach außen hin geöffnet werden müssen (wie es bei einem lokalen Proxy der Fall sein könnte).
• Die DNS-Auflösung von Headscale (MagicDNS) nahtlos in die normalen Web-Anfragen der App einfließt.
Möchten Sie als nächsten Schritt sehen, wie ein Go-Mobile-Binding (gomobile) aufgebaut ist, um tsnet für Android bereitzustellen, oder sollen wir uns direkt anschauen, wie Sie den OkHttp-Client in der MainApplication.java von React Native austauschen?
KI-Antworten können Fehler enthalten. Weitere Informationen
und für linux?
Für Linux ist die Einbettung von tsnet (Tailscale im Userspace) in eine React Native App (welche auf Linux meist via React Native Desktop / Electron oder als native C++-Anwendung via Ubuntu/Debian-Paket läuft) konzeptionell sogar einfacher als unter Android.
Da Linux-Desktop-Anwendungen direkt auf die System-Ressourcen zugreifen können, läuft das eingebettete tsnet hier als nativer Go-Prozess oder als C-Shared-Library (.so), die direkt mit Ihrer App gelinkt wird.
Auch hier gilt: Das System-DNS weiß nichts vom eingebetteten Headscale-Netzwerk. Sie haben für Linux zwei hervorragende Architektur-Optionen:
Ansatz 1: Lokaler HTTP/SOCKS5 Proxy (Empfohlen für Desktop/Electron)
Da Desktop-Umgebungen standardmäßig exzellenten Support für Netzwerk-Proxys in JavaScript bieten (anders als die mobile React Native Runtime), ist dies der flexibelste Weg.
1. Go-Backend (tsnet) starten:
Sie kompilieren eine kleine Go-Binärdatei, die mit Ihrer App ausgeliefert wird. Diese startet tsnet, verbindet sich mit Headscale und öffnet einen lokalen Proxy:go
// Go-Code
srv := &tsnet.Server{ ControlURL: "https://dein-headscale.de", AuthKey: "..." }
ln, _ := srv.Listen("tcp", "127.0.0.1:0") // Dynamischer lokaler Port
// Starte HTTP- oder SOCKS5-Proxy auf diesem Listener
Verwende Code mit Vorsicht.
2. React Native / Electron JavaScript-Code:
Auf Linux können Sie im JS-Code problemlos Standard-Bibliotheken wie axios oder das Node.js-native fetch (mit einem https-proxy-agent) nutzen. DNS und Routing werden komplett vom Proxy übernommen:javascript
import { HttpProxyAgent } from 'http-proxy-agent';

const proxyAgent = new HttpProxyAgent('http://127.0.0.1:ZUGEWIESENER_PORT');

// Das eingebettete Headscale löst 'workspace-server' automatisch auf!
fetch('http://dein-tailnet.intern', { agent: proxyAgent })
  .then(res => res.json());
Verwende Code mit Vorsicht.
Ansatz 2: C-Bindings via Node-API / FFI (Der "Single-Binary"-Weg)
Wenn Sie keine separate Go-Binärdatei im Hintergrund laufen lassen möchten, können Sie den Go-Code als C-Bibliothek (.so) kompilieren und mittels Node-API (N-API) oder ffi-napi direkt in die JavaScript-Laufzeit Ihrer Linux-App einbinden.
1. Go zu C-Shared-Library kompilieren:bash
go build -buildmode=c-shared -o libtsnet_workspace.so main.go
Verwende Code mit Vorsicht.
2. In JavaScript aufrufen:
Sie rufen die Verbindungs- und DNS-Funktionen direkt aus JavaScript auf. Für HTTP-Anfragen nutzen Sie dann einen Custom-Dialer, der die C-Funktion anspricht.
Vergleich: Android vs. Linux in Ihrer Workspace-Architektur
Da Sie eine plattformübergreifende Workspace-App bauen, lässt sich das Go-Core-Modul (tsnet) perfekt für beide Welten wiederverwenden:
Plattform	Wie wird das Go-tsnet eingebunden?	Wie greift JavaScript (React Native) darauf zu?
Android	Über gomobile als .aar-Archiv (Java/Kotlin-Kopplung)	Automatisch über die Anpassung des nativen OkHttpClient
Linux	Als separate Binärdatei oder .so-Bibliothek	Über Proxys / Agents (http-proxy-agent oder Custom Sockets)
Der eleganteste Architektur-Weg für Ihr Projekt
Schreiben Sie ein einziges Go-Modul, das die Headscale-Logik (Authentifizierung, Verbindung, Error-Handling) enthält.
• Für Android exportiert dieses Modul Funktionen für OkHttp.
• Für Linux startet dasselbe Modul einen lokalen Proxy-Server, den Ihre Desktop-App anspricht.
Soll ich Ihnen zeigen, wie Sie das Go-Modul so aufbauen, dass es sowohl für das Android-Build (gomobile) als auch für den Linux-Desktop-Proxy als Basis dient? Or arbeiten Sie für Linux mit einem bestimmten Framework wie Electron oder React Native Desktop?
KI-Antworten können Fehler enthalten. Weitere Informationen
und linux im container?
Wenn Sie Ihre App in einem Linux-Container (wie Docker oder Podman) ausführen, verändert sich die Netzwerksituation grundlegend. Da Container isolierte Netzwerk-Namespaces besitzen, müssen wir das DNS und Routing so konfigurieren, dass der Container-Prozess den Headscale-Traffic nahtlos auflösen und tunneln kann.
Hier kommt die eigentliche Stärke von tsnet (Tailscale im Userspace) zum Tragen: Da tsnet kein TUN-Device (/dev/net/tun) im Linux-Kernel anlegt, benötigt Ihr Container keine root-Rechte (--privileged) und keine speziellen Network Capabilities (NET_ADMIN). Der Container bleibt extrem sicher und isoliert.
Für Linux im Container haben Sie zwei primäre Architektur-Wege:
Ansatz 1: Das Sidecar-Muster (Empfohlen für Microservices / Multi-Container)
Statt tsnet direkt in den Anwendungscode zu kompilieren, läuft der offizielle Tailscale- bzw. Headscale-Client als separater Container (Sidecar) im selben Netzwerk-Namespace.
1. Gemeinsames Netzwerk nutzen: Sie starten den Anwendungscontainer so, dass er das Netzwerk des Headscale-Sidecars teilt (--network=container:headscale-client).
2. DNS-Auflösung: Der Sidecar-Container fungiert als lokaler DNS-Server. In der Konfiguration des Anwendungscontainers wird der DNS-Eintrag einfach auf 127.0.0.1 (den Sidecar) verbogen.
• Vorteil: Ihre App benötigt überhaupt keinen VPN- oder Proxy-spezifischen Code. Sie verhält sich wie auf einem normalen Linux-System mit installierter Tailscale-App.
Ansatz 2: Eingebettetes tsnet als Proxy (Empfohlen für Single-Container Apps)
Wenn Ihre Workspace-App als einzelner, in sich geschlossener Container ausgeliefert werden soll, verhält es sich ähnlich wie beim regulären Linux-Desktop, jedoch hochgradig automatisiert:
1. Proxy auf localhost binden: Das in Ihre App eingebettete tsnet-Modul startet und bindet den SOCKS5/HTTP-Proxy ausschließlich an 127.0.0.1 innerhalb des Containers.
2. Umgebungsvariablen im Container setzen: Viele Linux-Tools und Runtimes (wie Node.js, Python, curl) respektieren standardmäßig die System-Umgebungsvariablen für Proxys. Sie können diese direkt beim Start des Containers oder im Entrypoint-Skript setzen:bash
export HTTP_PROXY="http://127.0.0.1:1080"
export HTTPS_PROXY="http://127.0.0.1:1080"
export ALL_PROXY="socks5://127.0.0.1:1080"
Verwende Code mit Vorsicht.
3. DNS über den Proxy: Sobald diese Variablen gesetzt sind, leiten die meisten HTTP-Clients in Ihrer App sämtliche Anfragen (inklusive der DNS-Auflösung) automatisch durch das eingebettete Headscale-Netzwerk.
Direktvergleich für Container-Deployments
Kriterium	Ansatz 1: Sidecar-Container	Ansatz 2: Eingebettetes tsnet
Sicherheit (Root/Privilegien)	Erfordert oft NET_ADMIN auf Sidecar-Ebene.	Keine Privilegien nötig (reiner Userspace).
App-Code Komplexität	Null (Standard-Netzwerk-Code).	Proxy-Konfiguration oder Umgebungsvariablen nötig.
Deployment-Form	Multi-Container (z. B. Docker Compose).	Single-Container (perfekt für Kubernetes/Cloud Run).
Da es sich bei Ihrem Projekt um eine sichere Workspace-App handelt, ist Ansatz 2 (Eingebettetes tsnet) in der Regel der Favorit für die Auslieferung: Sie packen die App in ein Dockerfile, das Go-Backend initialisiert sich beim Start unsichtbar, verbindet sich mit Ihrem Headscale-Server, und die App ist sofort sicher isoliert im Firmennetzwerk, ohne das Host-System des Kunden zu beeinflussen.
Um die optimale containerisierte Architektur zu wählen, lassen Sie mich wissen:
• Wird die Linux-Version Ihrer App eine Backend-Anwendung (z.B. ein Headless-Agent / API) oder eine grafische App im Container (z.B. via VNC/X11)?
• Wie wird die Authentifizierung am Headscale-Server für die Container gelöst (z.B. über Auth-Keys als Umgebungsvariable oder OIDC)?
KI-Antworten können Fehler enthalten. Weitere Informationen
