const video = document.getElementById("video");
const resultElement = document.getElementById("result");
const restartButton = document.getElementById("restart");
const codeReader = window.ZXing
    ? new ZXing.BrowserQRCodeReader()
    : null;

let scannerControls = null;
let hasScannedCode = false;

function stopScanner() {
    if (scannerControls) {
        scannerControls.stop();
        scannerControls = null;
    } else {
        codeReader?.reset();
    }

    video.srcObject?.getTracks().forEach((track) => track.stop());
}

function describeCameraError(error) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        return "Dostop do kamere je zavrnjen. Dovolite uporabo kamere in poskusite znova.";
    }

    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        return "Kamera ni bila najdena. Preverite, ali ima vaša naprava kamero.";
    }

    if (error.name === "NotReadableError") {
        return "Kamere ni mogoče uporabiti. Morda jo že uporablja druga aplikacija.";
    }

    return `Kamere ni bilo mogoče zagnati: ${error.message || error}`;
}

async function startScanner() {
    if (scannerControls) {
        return;
    }

    hasScannedCode = false;
    restartButton.disabled = true;
    resultElement.textContent = "Čakam na dovoljenje za kamero …";

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        resultElement.textContent = "Kamera zahteva varno povezavo (HTTPS ali localhost) in podprt brskalnik.";
        restartButton.disabled = false;
        return;
    }

    if (!codeReader) {
        resultElement.textContent = "Skenerja QR-kod ni mogoče naložiti. Osvežite stran in poskusite znova.";
        restartButton.disabled = false;
        return;
    }

    try {
        scannerControls = await codeReader.decodeFromVideoDevice(
            null,
            video,
            (result, error) => {
                if (result && !hasScannedCode) {
                    hasScannedCode = true;
                    const text = result.getText();
                    let url;

                    try {
                        url = new URL(text);
                    } catch {
                        resultElement.textContent = `Prebrana vsebina ni spletni naslov: ${text}`;
                        stopScanner();
                        restartButton.disabled = false;
                        return;
                    }

                    if (url.protocol !== "http:" && url.protocol !== "https:") {
                        resultElement.textContent = `QR-koda vsebuje nepodprto povezavo: ${text}`;
                        stopScanner();
                        restartButton.disabled = false;
                        return;
                    }

                    resultElement.textContent = `Odpiram ${url.href}`;
                    stopScanner();
                    window.location.assign(url.href);
                    return;
                }

                if (
                    error &&
                    !["NotFoundException", "ChecksumException", "FormatException"].includes(error.name)
                ) {
                    console.error("Napaka pri branju QR-kode:", error);
                    resultElement.textContent = `Napaka pri branju QR-kode: ${error.message || error}`;
                }
            },
        );

        if (hasScannedCode) {
            stopScanner();
            return;
        }

        resultElement.textContent = "Usmerite kamero v QR-kodo.";
        restartButton.disabled = false;
    } catch (error) {
        console.error("Kamere ni bilo mogoče zagnati:", error);
        resultElement.textContent = describeCameraError(error);
        stopScanner();
        restartButton.disabled = false;
    }
}

restartButton.addEventListener("click", () => {
    stopScanner();
    startScanner();
});

window.addEventListener("pagehide", stopScanner);

startScanner();