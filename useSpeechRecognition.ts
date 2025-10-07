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

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
    }

    return () => {
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

  const checkForWakeWord = useCallback((text: string) => {
    const normalizedText = text.toLowerCase().trim();
    const normalizedWakeWord = wakeWord.toLowerCase().trim();
    
    if (normalizedText.includes(normalizedWakeWord)) {
      console.log('Wake word detected:', wakeWord);
      updateState('transcribing');
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

      if (state === 'listening-for-wake') {
        // Check both interim and final results for wake word
        const textToCheck = finalText || interimText;
        if (checkForWakeWord(textToCheck)) {
          // Don't add the wake word to transcripts
          return;
        }
      } else if (state === 'transcribing') {
        // Check for sleep word first
        if (finalText && checkForSleepWord(finalText)) {
          // Don't add the sleep word to transcripts
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
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.error('Error restarting recognition:', e);
        }
      }
    };
  }, [state, checkForWakeWord, checkForSleepWord, addTranscript]);

  const start = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    try {
      setError(null);
      isListeningRef.current = true;
      updateState('listening-for-wake');
      recognitionRef.current.start();
      console.log('Speech recognition started');
    } catch (e: any) {
      if (e.message && !e.message.includes('already started')) {
        setError(`Failed to start recognition: ${e.message}`);
      }
    }
  }, [isSupported, updateState]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      isListeningRef.current = false;
      recognitionRef.current.stop();
      updateState('idle');
      setInterimTranscript('');
      console.log('Speech recognition stopped');
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
