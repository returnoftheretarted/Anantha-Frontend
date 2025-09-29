import React, { useEffect, useRef, useState } from 'react';
import { Button } from './button';
import { Mic, MicOff, Volume2, Square } from 'lucide-react';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getLanguageCodeForMethod, getLanguageDisplayName } from '@/utils/languageUtils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onStart?: () => void;
  onStop?: () => void;
  className?: string;
  disabled?: boolean;
  language?: string;
  useBackend?: boolean; // Option to use backend speech recognition
  method?: 'whisper' | 'whisper-api' | 'google' | 'azure'; // Speech recognition method
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscript,
  onStart,
  onStop,
  className,
  disabled = false,
  language = 'en-US',
  useBackend = true, // Default to backend for better accuracy
  method = 'whisper' // Default to Whisper for best accuracy
}) => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const {
    transcript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    error
  } = useVoiceRecognition({
    continuous: false, // Disable continuous mode to prevent auto-restart
    interimResults: true,
    language
  });

  // Handle transcript changes with debouncing
  useEffect(() => {
    if (transcript && transcript.trim()) {
      const timeoutId = setTimeout(() => {
        onTranscript(transcript);
      }, 100); // Small delay to avoid multiple rapid updates
      
      return () => clearTimeout(timeoutId);
    }
  }, [transcript, onTranscript]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Voice Recognition Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Handle listening state changes - only call callbacks on user action, not automatic stops
  const [wasListening, setWasListening] = useState(false);
  
  useEffect(() => {
    if ((isListening || isRecording) && !wasListening && onStart) {
      setWasListening(true);
      onStart();
    } else if (!isListening && !isRecording && wasListening && onStop) {
      setWasListening(false);
      onStop();
    }
  }, [isListening, isRecording, wasListening, onStart, onStop]);

  // Backend speech recognition using MediaRecorder
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await sendAudioToBackend(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioToBackend = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.wav');
      
      // Get proper language code for the selected method
      const langCode = getLanguageCodeForMethod(
        language.includes('-') ? language.split('-')[0] : language, 
        method
      );
      
      const url = new URL('http://localhost:8000/speech-to-text');
      url.searchParams.append('method', method);
      if (langCode && langCode !== 'en') {
        url.searchParams.append('language', langCode);
      }

      const response = await fetch(url.toString(), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('🎤 Backend Response:', result);
      console.log('📝 Transcribed Text:', `"${result.text}"`);
      console.log('🌍 Detected Language:', result.language);
      console.log('📊 Confidence:', result.confidence);
      onTranscript(result.text);
      
      const methodName = result.method === 'whisper-local' ? 'Local Whisper' : 
                        result.method === 'whisper-api' ? 'Cloud Whisper' :
                        result.method === 'google' ? 'Google Speech' : result.method;
      
      toast({
        title: "Speech Recognized",
        description: `${methodName} | Confidence: ${(result.confidence * 100).toFixed(1)}%${result.language ? ` | Language: ${getLanguageDisplayName(result.language)}` : ''}`,
      });
    } catch (error) {
      console.error('Error sending audio to backend:', error);
      toast({
        title: "Recognition Error",
        description: "Failed to process speech. Trying fallback method...",
        variant: "destructive",
      });
      
      // Don't fallback to browser recognition to avoid auto-restart issues
      // User can manually switch if needed
    }
  };

  const handleToggleListening = () => {
    if (useBackend) {
      // Use backend speech recognition
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    } else {
      // Use browser speech recognition
      if (!isSupported) {
        toast({
          title: "Not Supported",
          description: "Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.",
          variant: "destructive",
        });
        return;
      }

      if (isListening) {
        stopListening();
      } else {
        resetTranscript();
        startListening();
      }
    }
  };

  if (!useBackend && !isSupported) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled
              className={cn("size-10 text-gray-400", className)}
            >
              <MicOff className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Voice input not supported in this browser
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const isActive = useBackend ? isRecording : isListening;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleListening}
            disabled={disabled}
            className={cn(
              "size-10 transition-all duration-200",
              isActive 
                ? "text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900 animate-pulse" 
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
              className
            )}
          >
            {isActive ? (
              <div className="relative">
                {useBackend ? <Square className="size-4" /> : <Mic className="size-4" />}
                <div className="absolute -top-1 -right-1 size-2 bg-red-500 rounded-full animate-ping" />
              </div>
            ) : (
              <Mic className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isActive ? "Stop voice input" : "Start voice input"}
          {useBackend && <div className="text-xs text-gray-400 mt-1">Using server processing</div>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};