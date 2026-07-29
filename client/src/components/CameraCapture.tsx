import React, { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Camera, RotateCcw, X, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CameraCaptureProps {
  onImageCapture: (file: File) => void;
  trigger?: React.ReactNode;
  title?: string;
  instructions?: string;
  reviewText?: string;
  usePhotoText?: string;
  retakeText?: string;
  loadingText?: string;
  noCameraText?: string;
  accessErrorText?: string;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onImageCapture,
  trigger,
  title = "Take Photo",
  instructions = "Position your face in the frame and tap the capture button",
  reviewText = "Review your photo and choose to use it or retake",
  usePhotoText = "Use Photo",
  retakeText = "Retake",
  loadingText = "Starting camera...",
  noCameraText = "No camera detected on this device. Please use the upload option instead.",
  accessErrorText = "Unable to access camera. Please check permissions.",
}) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreamActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(accessErrorText);
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, accessErrorText]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreamActive(false);
  }, []);

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const imageUrl = URL.createObjectURL(blob);
          setCapturedImage(imageUrl);

          // Save blob as a file temporarily for use later
          setCapturedFile(
            new File([blob], "captured-image.jpg", { type: "image/jpeg" })
          );
        }
      },
      "image/jpeg",
      0.8
    );
  }, [onImageCapture]);

  const retakePhoto = useCallback(async () => {
    setCapturedImage(null);
    await startCamera(); // 🔁 Restart the stream correctly
  }, [startCamera]);

  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setError(null);
    setIsOpen(false);
  }, [stopCamera]);

  const handleOpen = useCallback(async () => {
    setIsOpen(true);

    // Check if device has camera
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      setHasCamera(videoDevices.length > 0);
    } catch (err) {
      console.error("Error checking camera availability:", err);
      setHasCamera(false);
    }
  }, []);

  // Start camera when dialog opens
  useEffect(() => {
    if (isOpen && !isStreamActive) {
      startCamera();
    }
  }, [isOpen, isStreamActive, startCamera]);

  // Switch camera when facingMode changes
  useEffect(() => {
    if (isOpen && isStreamActive) {
      startCamera();
    }
  }, [facingMode, isOpen, isStreamActive, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={handleOpen}>
        {trigger || (
          <Button variant="outline" size="icon" className="rounded-full">
            <Camera className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" style={{ zIndex: 10000 }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {hasCamera === false && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-yellow-600 dark:text-yellow-400 text-sm">
                {noCameraText}
              </p>
            </div>
          )}

          <div className="relative bg-black rounded-lg overflow-hidden">
            {!capturedImage ? (
              <>
                {isLoading && (
                  <div className="w-full h-64 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p className="text-sm">{loadingText}</p>
                    </div>
                  </div>
                )}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-64 object-cover ${
                    isLoading ? "hidden" : ""
                  }`}
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Camera Controls */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={switchCamera}
                    className="rounded-full bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30"
                    disabled={hasCamera === false}
                  >
                    <RotateCcw className="h-4 w-4 text-white" />
                  </Button>

                  <Button
                    onClick={captureImage}
                    className="rounded-full w-12 h-12 bg-white hover:bg-gray-100"
                    disabled={hasCamera === false || !isStreamActive}
                  >
                    <div className="w-8 h-8 rounded-full border-2 border-gray-800"></div>
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleClose}
                    className="rounded-full bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30"
                  >
                    <X className="h-4 w-4 text-white" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <img
                  src={capturedImage}
                  alt="Captured image"
                  className="w-full h-64 object-cover"
                />

                {/* Review Controls */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={retakePhoto}
                    className="bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30 dark:text-white"
                  >
                    {retakeText}
                  </Button>

                  <Button
                    onClick={() => {
                      if (capturedFile) {
                        onImageCapture(capturedFile); // ✅ trigger callback only here
                      }
                      handleClose();
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {usePhotoText}
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            {!capturedImage ? instructions : reviewText}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
