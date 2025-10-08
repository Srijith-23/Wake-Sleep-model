import { useState, useEffect, useRef, useCallback } from 'react';

export type TranscriptState = 'idle' | 'listening-for-wake' | 'transcribing';

export interface TranscriptEntry {
  id: string;
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

interface UseSpeechRecognitionProps {
  wakeWord: string;
  sleepWord: string;
  onTranscript?: (transcript: string) => void;
  onStateChange?: (state: TranscriptState) => void;
}

export const useSpeechRecognition = ({
  wakeWord,
  sleepWord,
  onTranscript,
  onStateChange,
}: UseSpeechRecognitionProps) => {
  const [isSupported, setIsSupported] = useState(false);
  const [state, setState] = useState<TranscriptState>('idle');
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restartAttemptsRef = useRef(0);
  const maxRestartAttempts = 3;

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Changed to false for better control
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, []);

  const updateState = useCallback((newState: TranscriptState) => {
    setState(newState);
    onStateChange?.(newState);
  }, [onStateChange]);

  const addTranscript = useCallback((text: string, isFinal: boolean) => {
    if (!text.trim()) return;

    const entry: TranscriptEntry = {
      id: Date.now().toString(),
      text: text.trim(),
      timestamp: new Date(),
      isFinal,
    };

    if (isFinal) {
      setTranscripts(prev => [...prev, entry]);
      setInterimTranscript('');
      onTranscript?.(text);
    } else {
      setInterimTranscript(text);
    }
  }, [onTranscript]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    // Auto-stop after 2 minutes of inactivity in wake word listening mode
    if (state === 'listening-for-wake') {
      inactivityTimerRef.current = setTimeout(() => {
        console.log('Auto-stopping due to inactivity');
        stop();
      }, 120000); // 2 minutes
    }
  }, [state]);

  const checkForWakeWord = useCallback((text: string) => {
    const normalizedText = text.toLowerCase().trim();
    const normalizedWakeWord = wakeWord.toLowerCase().trim();
    
    if (normalizedText.includes(normalizedWakeWord)) {
      console.log('Wake word detected:', wakeWord);
      updateState('transcribing');
      restartAttemptsRef.current = 0; // Reset restart attempts on successful wake word
      return true;
    }
    return false;
  }, [wakeWord, updateState]);

  const checkForSleepWord = useCallback((text: string) => {
    const normalizedText = text.toLowerCase().trim();
    const normalizedSleepWord = sleepWord.toLowerCase().trim();
    
    if (normalizedText.includes(normalizedSleepWord)) {
      console.log('Sleep word detected:', sleepWord);
      updateState('listening-for-wake');
      return true;
    }
    return false;
  }, [sleepWord, updateState]);

  useEffect(() => {
    if (!recognitionRef.current) return;

    const recognition = recognitionRef.current;

    recognition.onresult = (event: any) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      // Reset inactivity timer on any speech
      resetInactivityTimer();

      if (state === 'listening-for-wake') {
        // Check both interim and final results for wake word
        const textToCheck = finalText || interimText;
        if (checkForWakeWord(textToCheck)) {
          // Don't add the wake word to transcripts
          // Switch to continuous mode for transcription
          if (recognitionRef.current) {
            recognitionRef.current.continuous = true;
          }
          return;
        }
      } else if (state === 'transcribing') {
        // Check for sleep word first
        if (finalText && checkForSleepWord(finalText)) {
          // Don't add the sleep word to transcripts
          // Switch back to non-continuous mode for wake word detection
          if (recognitionRef.current) {
            recognitionRef.current.continuous = false;
          }
          return;
        }
        
        // Add transcripts
        if (finalText) {
          addTranscript(finalText, true);
        } else if (interimText) {
          addTranscript(interimText, false);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'no-speech') {
        // Ignore no-speech errors, just continue
        return;
      }
      
      if (event.error !== 'aborted') {
        setError(`Recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // Automatically restart if we should be listening
      if (isListeningRef.current && restartAttemptsRef.current < maxRestartAttempts) {
        try {
          restartAttemptsRef.current++;
          console.log(`Restarting recognition (attempt ${restartAttemptsRef.current})`);
          recognition.start();
        } catch (e) {
          console.error('Error restarting recognition:', e);
          if (restartAttemptsRef.current >= maxRestartAttempts) {
            setError('Speech recognition stopped. Please restart manually.');
            isListeningRef.current = false;
            updateState('idle');
          }
        }
      }
    };
  }, [state, checkForWakeWord, checkForSleepWord, addTranscript, resetInactivityTimer, updateState]);

  const start = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    try {
      setError(null);
      isListeningRef.current = true;
      restartAttemptsRef.current = 0;
      recognitionRef.current.continuous = false; // Start in wake word detection mode
      updateState('listening-for-wake');
      recognitionRef.current.start();
      resetInactivityTimer(); // Start inactivity timer
      console.log('Speech recognition started in wake word detection mode');
    } catch (e: any) {
      if (e.message && !e.message.includes('already started')) {
        setError(`Failed to start recognition: ${e.message}`);
      }
    }
  }, [isSupported, updateState, resetInactivityTimer]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      isListeningRef.current = false;
      restartAttemptsRef.current = 0;
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      recognitionRef.current.stop();
      updateState('idle');
      setInterimTranscript('');
      console.log('Speech recognition stopped completely');
    } catch (e) {
      console.error('Error stopping recognition:', e);
    }
  }, [updateState]);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
    setInterimTranscript('');
  }, []);

  return {
    isSupported,
    state,
    transcripts,
    interimTranscript,
    error,
    start,
    stop,
    clearTranscripts,
  };
};
