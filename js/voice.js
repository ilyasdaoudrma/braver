// Dictée vocale (Web Speech API du navigateur). Le texte s'affiche toujours avant le tri.
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

export const voiceSupported = Boolean(SR);

let rec = null;

export function startDictation({ lang = "fr-FR", onFinal, onInterim, onEnd, onError }) {
  if (!SR) return onError?.("unsupported");
  stopDictation();
  rec = new SR();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) onFinal?.(r[0].transcript.trim());
      else interim += r[0].transcript;
    }
    onInterim?.(interim);
  };
  rec.onerror = (e) => onError?.(e.error);
  rec.onend = () => {
    rec = null;
    onEnd?.();
  };
  try {
    rec.start();
  } catch (e) {
    onError?.(String(e));
  }
}

export function stopDictation() {
  if (rec) {
    try {
      rec.stop();
    } catch {
      /* déjà arrêtée */
    }
  }
}

export const isListening = () => Boolean(rec);
