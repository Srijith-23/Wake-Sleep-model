import { useState } from 'react';
import { useSpeechRecognition, TranscriptState } from '@/hooks/useSpeechRecognition';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Settings, Trash2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const WakeWordSTT = () => {
  const [wakeWord, setWakeWord] = useState('hi');
  const [sleepWord, setSleepWord] = useState('bye');
  const [showSettings, setShowSettings] = useState(false);

  const {
    isSupported,
    state,
    transcripts,
    interimTranscript,
    error,
    start,
    stop,
    clearTranscripts,
  } = useSpeechRecognition({
    wakeWord,
    sleepWord,
    onStateChange: (newState: TranscriptState) => {
      console.log('State changed to:', newState);
    },
  });

  const getStateInfo = () => {
    switch (state) {
      case 'idle':
        return {
          label: 'Idle',
          description: 'Click Start to begin listening',
          color: 'bg-muted',
        };
      case 'listening-for-wake':
        return {
          label: 'Listening for Wake Word',
          description: `Say "${wakeWord}" to start transcription`,
          color: 'bg-warning',
        };
      case 'transcribing':
        return {
          label: 'Transcribing',
          description: `Say "${sleepWord}" to stop transcription`,
          color: 'bg-success',
        };
      default:
        return { label: 'Unknown', description: '', color: 'bg-muted' };
    }
  };

  const stateInfo = getStateInfo();
  const isActive = state !== 'idle';

  if (!isSupported) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">Browser Not Supported</h2>
          <p className="text-muted-foreground">
            Your browser doesn't support the Web Speech API. Please use Chrome, Edge, or Safari.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-gradient">
            Wake Word Speech-to-Text
          </h1>
          <p className="text-muted-foreground text-lg">
            Voice-activated real-time transcription module
          </p>
        </div>

        {/* Main Control Card */}
        <Card className="p-8 relative overflow-hidden">
          {/* Glow effect when active */}
          {isActive && (
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent animate-pulse-glow" />
            </div>
          )}

          <div className="space-y-6 relative z-10">
            {/* Status Badge */}
            <div className="flex items-center justify-center gap-3">
              <Badge variant="outline" className={cn('text-base px-4 py-2', stateInfo.color)}>
                <div className={cn('w-2 h-2 rounded-full mr-2', isActive && 'animate-pulse')} />
                {stateInfo.label}
              </Badge>
            </div>

            {/* Visual Indicator */}
            <div className="flex justify-center items-center py-8">
              <div className="relative">
                {/* Outer ring */}
                <div
                  className={cn(
                    'absolute inset-0 rounded-full transition-all duration-300',
                    isActive && 'glow-strong'
                  )}
                />
                
                {/* Mic button */}
                <Button
                  size="lg"
                  onClick={isActive ? stop : start}
                  className={cn(
                    'w-24 h-24 rounded-full relative transition-all duration-300',
                    isActive
                      ? 'bg-primary hover:bg-primary/90 scale-110'
                      : 'bg-secondary hover:bg-secondary/90'
                  )}
                >
                  {isActive ? (
                    <Mic className="w-10 h-10" />
                  ) : (
                    <MicOff className="w-10 h-10" />
                  )}
                </Button>

                {/* Animated waves for transcribing state */}
                {state === 'transcribing' && (
                  <div className="absolute -inset-4 flex items-center justify-around">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-primary rounded-full animate-wave"
                        style={{
                          height: '40px',
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Status Description */}
            <div className="text-center space-y-1">
              <p className="text-muted-foreground">{stateInfo.description}</p>
              {state !== 'idle' && (
                <p className="text-xs text-muted-foreground">
                  ⚡ Auto-stops after 2 minutes of inactivity
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              {transcripts.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearTranscripts}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wake-word">Wake Word</Label>
                    <Input
                      id="wake-word"
                      value={wakeWord}
                      onChange={(e) => setWakeWord(e.target.value)}
                      disabled={isActive}
                      placeholder="e.g., hi, hello"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sleep-word">Sleep Word</Label>
                    <Input
                      id="sleep-word"
                      value={sleepWord}
                      onChange={(e) => setSleepWord(e.target.value)}
                      disabled={isActive}
                      placeholder="e.g., bye, stop"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Note: You must stop listening to change wake/sleep words
                </p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Transcripts Display */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Live Transcripts</h2>
            <Badge variant="secondary">{transcripts.length} entries</Badge>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {transcripts.length === 0 && !interimTranscript && (
              <p className="text-center text-muted-foreground py-8">
                No transcripts yet. Start speaking after saying the wake word.
              </p>
            )}

            {interimTranscript && (
              <div className="p-3 bg-secondary/50 rounded-lg border-l-4 border-primary animate-pulse">
                <p className="text-sm text-muted-foreground italic">{interimTranscript}</p>
              </div>
            )}

            {transcripts.map((transcript) => (
              <div
                key={transcript.id}
                className="p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="flex-1">{transcript.text}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {transcript.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Info Card */}
        <Card className="p-6 bg-card/50">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">How to Use</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Getting Started:</p>
              <ol className="space-y-2 text-sm text-muted-foreground ml-4">
                <li>1. Click the microphone button to start wake word detection</li>
                <li>2. Say "{wakeWord}" to activate full transcription mode</li>
              </ol>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">During Transcription:</p>
              <ol className="space-y-2 text-sm text-muted-foreground ml-4">
                <li>3. Speak normally - your words will be transcribed in real-time</li>
                <li>4. Say "{sleepWord}" to pause and return to wake word mode</li>
                <li>5. Say "{wakeWord}" again to resume transcribing</li>
                <li>6. Click the microphone to stop completely</li>
              </ol>
            </div>

            <div className="pt-3 border-t border-border">
              <p className="text-sm font-medium mb-1 flex items-center gap-2">
                ⚡ Efficiency Optimized
              </p>
              <p className="text-xs text-muted-foreground">
                Recognition dynamically switches between lightweight wake word detection and full transcription modes. 
                Auto-stops after 2 minutes of inactivity to minimize compute resources.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default WakeWordSTT;
